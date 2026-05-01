// --- NEXT.JS --- 
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// --- FIREBASE --- 
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { moderatePost } from "@/lib/actions";
// --- SHADCN UI COMPONENTS & ICONS --- 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, ShieldAlert, BarChart3, Download, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
// --- MISC --- 
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [vaultStats, setVaultStats] = useState<any[]>([]);
  // CONTEXT: Editing State for Directory
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: "", bio: "" });
  const router = useRouter();
  // CONTEXT: FETCH DATA FUNCTION
  const fetchAdminData = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const postsSnap = await getDocs(collection(db, "posts"));
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      const vaultSnap = await getDocs(collection(db, "vaultAssets"));

      setStudents(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSessions(sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setVaultStats(vaultSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load system data.", {position: "top-center"});
    } finally {
      setLoading(false);
    }
  };
  // CONTEXT: AUTH HANDLER & INIT
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error("Access Denied: Please log in.", {position: "top-center"});
        router.push("/");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (userData?.role === "admin") {
          setIsAdmin(true);
          await fetchAdminData();
        } else {
          toast.error("Access Denied: Admin required.", {position: "top-center"});
          router.push("/");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // CONTEXT: System Stats Calculations
  const activeStudents = students.filter(s => s.status !== "graduated");
  const totalSprintMinutes = Math.floor(sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60);

  // CONTEXT: UPDATE PROFILE
  const handleSaveEdit = async (studentId: string) => {
    try {
      const userRef = doc(db, "users", studentId);
      await updateDoc(userRef, {
        username: editForm.username,
        bio: editForm.bio
      });
      
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, username: editForm.username, bio: editForm.bio } : s
      ));
      setEditingId(null);
      toast.success("Profile updated successfully.", {position: "top-center"});
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Error saving profile updates.", {position: "top-center"});
    }
  };

  // CONTEXT: Moderation
  const handleModeration = async (postId: string, action: 'archive' | 'report' | 'delete' | 'restore', isArchived?: boolean) => {
    const result = await moderatePost(postId, action, isArchived);

    if (result.success) {
      toast.success(result.message, { position: "top-center" });
      fetchAdminData(); // Refresh local data instead of full page reload
    } else {
      toast.error(result.message, { position: "top-center" });
    }
  };

  // CONTEXT: Export to Excel
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // CONTEXT: Sheet 1: System Stats
      const statsSheet = workbook.addWorksheet('System Stats');
      statsSheet.columns = [{ header: 'METRIC', key: 'metric', width: 30 }, { header: 'VALUE', key: 'value', width: 20 }];
      statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      statsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
      
      statsSheet.addRow({ metric: 'Active Students', value: activeStudents.length });
      statsSheet.addRow({ metric: 'Total Sprint Minutes', value: totalSprintMinutes });
      statsSheet.addRow({ metric: 'Vault Assets', value: vaultStats.length });

      // CONTEXT: Sheet 2: Directory
      const dirSheet = workbook.addWorksheet('Directory');
      if (students.length > 0) {
        const allKeys = Array.from(new Set(students.flatMap(Object.keys)));
        dirSheet.columns = allKeys.map(key => ({ header: key.toUpperCase(), key: key, width: 20 }));
        dirSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        dirSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

        students.forEach(student => {
          const cleanStudent = { ...student };
          Object.keys(cleanStudent).forEach(key => {
            if (cleanStudent[key]?.toDate) cleanStudent[key] = cleanStudent[key].toDate().toLocaleString();
          });
          dirSheet.addRow(cleanStudent);
        });
      }

      // CONTEXT: Sheet 3: Moderation
      const modSheet = workbook.addWorksheet('Moderation');
      modSheet.columns = [
        { header: 'AUTHOR', key: 'author', width: 20 },
        { header: 'CONTENT', key: 'content', width: 50 },
        { header: 'REPORTS', key: 'reports', width: 10 }
      ];
      modSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      modSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
      posts.forEach(post => {
        modSheet.addRow({
          author: post.user?.handle || post.user?.username || "Anonymous",
          content: post.content,
          reports: post.reports || 0
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = globalThis.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Academic_Platform_Data_${new Date().getTime()}.xlsx`;
      anchor.click();
    } catch (error) {
      console.error("Excel Export Error:", error);
    }
  };

  // CONTEXT: EXPORT PDF
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0); 
    doc.text("System Administration Report", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    // CONTEXT: Stats Section
    doc.text(`Active Students: ${activeStudents.length}`, 14, 30);
    doc.text(`Total Sprint Minutes: ${totalSprintMinutes}`, 14, 40);
    doc.text(`Vault Assets: ${vaultStats.length}`, 14, 45);

    // CONTEXT: Directory Table
    doc.setFontSize(12);
    doc.text("Directory Data", 14, 55);
    if (students.length > 0) {
      const headers = ['ID', 'Username', 'Role', 'Status', 'Bio'];
      const tableData = students.map(s => [
        s.id.slice(0, 8), 
        s.username || "N/A", 
        s.role || "student",
        s.status || "active",
        (s.bio || "").slice(0, 30)
      ]);
      
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }, 
        styles: { fontSize: 8, textColor: [0, 0, 0] } 
      });
    }

    // CONTEXT: Moderation Table
    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(12);
    doc.text("Moderation Page Data", 14, finalY + 10);
    if (posts.length > 0) {
      const modHeaders = ['Author', 'Content', 'Reports'];
      const modData = posts.map(p => [
        p.user?.handle || p.user?.username || "Anonymous",
        (p.content || "").slice(0, 50),
        p.reports || 0
      ]);

      autoTable(doc, {
        head: [modHeaders],
        body: modData,
        startY: finalY + 15,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }, 
        styles: { fontSize: 8, textColor: [0, 0, 0] } 
      });
    }
    
    doc.save(`System_Report_${new Date().getTime()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // CONTEXT: IMPORT: IF NOT ADMIN, DO NOT SHOW ANYTHING.
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="mt-1">Manage the analytics, student directory, and moderate posts.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> PDF Report
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="mb-8 p-1 rounded-xl">
          <TabsTrigger value="analytics" className="gap-2 rounded-lg"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg"><Users className="h-4 w-4" /> Directory</TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2 rounded-lg"><ShieldAlert className="h-4 w-4" /> Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Students</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{activeStudents.length}</div></CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Sprint Minutes</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalSprintMinutes}m</div></CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vault Assets</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{vaultStats.length}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Student Directory</CardTitle>
                <CardDescription>Select students to mark their account as Graduated.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody> 
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                      </TableCell>
                      <TableCell className="font-medium uppercase text-xs">
                        {student.status || "active"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {editingId === student.id ? (
                          <Input 
                            value={editForm.username} 
                            onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                            className="h-8"
                          />
                        ) : (student.username || "Unknown")}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="truncate max-w-[200px]">
                        {editingId === student.id ? (
                          <Input 
                            value={editForm.bio} 
                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                            className="h-8"
                          />
                        ) : (student.bio)}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === student.id ? (
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(student.id)} className="h-8 w-8"><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setEditingId(student.id);
                              setEditForm({ username: student.username || "", bio: student.bio || "" });
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Community Transmissions</CardTitle>
              <CardDescription>Review flagged content and engagement metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead>Content Snippet</TableHead>
                    <TableHead className="text-center">Reports</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.user?.handle || post.user?.username || "Anonymous"}</TableCell>
                      <TableCell className="truncate max-w-[300px]">{post.content}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs px-2 py-1 rounded-full font-medium border">
                          {post.reports || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleModeration(post.id, 'delete', post.isArchived)}
                            >
                            Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}