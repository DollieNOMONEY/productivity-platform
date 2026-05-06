// --- NEXT.JS ---
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
// --- FIREBASE ---
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
// --- SHAD.CN UI COMPONENTS & ICONS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MessageCircle,
  Plus,
  Archive,
  BookOpen,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface Post {
  id: string;
  userId: string;
  user: { name: string; avatar: string; handle: string };
  content: string;
  likes: number;
  commentsCount: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  title: string;
  category: string;
  isResolved: boolean;
  isArchived: boolean;
  isDeleted: boolean;
}

function UserDisplay({ userId, fallbackData, isDeleted }: { readonly userId: string, readonly fallbackData: any, readonly isDeleted: boolean }) {
  const [userData, setUserData] = useState(fallbackData);

  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            name: data.username || data.displayName,
            avatar: data.profilePictureUrl || data.photoURL
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFreshUser();
  }, [userId]);

  return (
    <div className="flex items-center gap-2">
      <Image
        src={userData?.avatar || "/placeholder/profile_picture.jpg"}
        alt="User"
        className={cn(
          "w-5 h-5 rounded-full object-cover border",
          isDeleted ? "border-zinc-300" : "border-black group-hover:border-white"
        )}
        width={500}
        height={500}
      />
      <span className="font-medium">
        {userData?.name || "N/A"}
      </span>
    </div>
  );
}

export default function ForumHomePage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showArchived, setShowArchived] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // CONTEXT: ROLE & AUTH HANDLER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // CONTEXT: Check if user is admin
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // CONTEXT: Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categorySnap = await getDocs(collection(db, "subjects"));
        const fetchedCategories = categorySnap.docs.map(
          (doc) => doc.data().name,
        );
        setCategories(["All", ...fetchedCategories]);
        if (fetchedCategories.length > 0) setNewCategory(fetchedCategories[0]);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    fetchCategories();
  }, []);

  // CONTEXT: Fetch Posts
  useEffect(() => {
    
    // CONTEXT: If user isn't admin, only fetch posts where isDeleted is false
    const postsRef = collection(db, "posts");
    const baseQuery = isAdmin 
      ? query(postsRef, orderBy("createdAt", "desc"))
      : query(postsRef, where("isDeleted", "==", false), orderBy("createdAt", "desc"));

    return onSnapshot(baseQuery, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Post));
    });
  }, [isAdmin]); // Re-run if admin status is confirmed

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || isPublishing || !currentUser)
      return;

    setIsPublishing(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const docRef = await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        user: {
          name: userData?.username || currentUser.displayName || "Individual",
          handle: userData?.username || currentUser.displayName || "Individual",
          avatar:
            userData?.profilePictureUrl ||
            currentUser.photoURL ||
            `/placeholder/profile_picture.jpg`,
        },
        content: newContent,
        likes: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        title: newTitle,
        category: newCategory || categories[1] || "General",
        isResolved: false,
        isArchived: false,
        isDeleted: false,
        reports: 0,
      });

      setNewTitle("");
      setNewContent("");
      setIsComposing(false);
      router.push(`/forum/${docRef.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(`Failed to publish: ${message}`, { position: "top-center" });
    } finally {
      setIsPublishing(false);
    }
  };

  // CONTEXT: Client-side filtering for Soft Delete logic
  const filteredPosts = posts.filter((post) => {
    // CONTEXT: Soft Delete Filter
    if (post.isDeleted) {
      if (!currentUser) return false; // Guests can't see deleted
      if (post.userId !== currentUser.uid && !isAdmin) return false; // Only Author or Admin
    }

    // CONTEXT: Category & Archive Filter
    const matchCategory =
      activeCategory === "All" || post.category === activeCategory;
    const matchArchive = showArchived ? post.isArchived : !post.isArchived;
    return matchCategory && matchArchive;
  });

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto min-h-screen px-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-8">
      <div className="w-64 shrink-0 space-y-6 hidden md:block">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3">
            FOLDERS
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setShowArchived(false)}
              className={cn(
                "w-full flex items-center gap-2 text-sm p-2 rounded-3xl transition-colors border",
                showArchived
                  ? "bg-background border-transparent hover:border-black"
                  : "bg-foreground text-background font-medium",
              )}
            >
              <BookOpen className="h-4 w-4" /> Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={cn(
                "w-full flex items-center gap-2 text-sm p-2 rounded-3xl transition-colors border",
                showArchived
                  ? "bg-foreground text-background font-medium"
                  : "bg-background text-foreground border-transparent hover:border-black",
              )}
            >
              <Archive className="h-4 w-4" /> Archive
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3">
            Subjects
          </h2>
          <div className="space-y-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                size="sm"
                className={cn(
                  "w-full text-left text-sm p-2 rounded-full select-none  transition-colors border",
                  activeCategory === cat
                    ? "bg-foreground text-background font-medium"
                    : "bg-transparent border text-foreground border-white",
                )}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between border-b border-black pb-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {showArchived ? "Archive" : "Discussions"}
          </h1>
          {currentUser && (
            <Button
              onClick={() => setIsComposing(!isComposing)}
              className="bg-brand rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" /> New Post
            </Button>
          )}
        </div>

        {isComposing && (
          <Card className="border border-black bg-background">
            <CardContent className="p-4 space-y-4">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Question Title"
                className="w-full text-lg font-bold bg-transparent border-b border-black focus:outline-none pb-2"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full text-sm bg-background border-b border-black outline-none pb-2"
              >
                {categories
                  .filter((c) => c !== "All")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Describe your problem"
                rows={4}
                className="w-full text-sm bg-transparent outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsComposing(false)}
                  className="text-foreground dark:text-background border border-transparent hover:border-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addQuestion}
                  disabled={!newTitle || !newContent || isPublishing}
                  className="bg-brand text-white hover:bg-white hover:text-black"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <Link key={post.id} href={`/forum/${post.id}`}>
              <Card
                className={cn(
                  "border transition-colors group cursor-pointer mb-2 rounded-3xl",
                  post.isDeleted
                    ? "border-zinc-300  opacity-70 hover:opacity-100" // CONTEXT: Show indicator for soft-deleted
                    : "border-black hover:bg-brand hover:text-white",
                )}
              >
                <CardContent className="p-4 flex gap-4 items-center">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {post.isResolved && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {post.isDeleted && (
                        <>
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          <p>Removed Post</p>
                        </>
                      )}
                      <h3
                        className={cn(
                          "font-semibold text-base",
                          post.isDeleted && "line-through text-zinc-500",
                        )}
                      >
                        {post.title || "Untitled Post"}
                      </h3>
                    </div>
                    <p className="text-sm line-clamp-1 opacity-80">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs pt-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 border rounded-full",
                          post.isDeleted
                            ? "border-zinc-300"
                            : "border-black group-hover:border-white",
                        )}
                      >
                        {post.category || "General"}
                      </span>

                      <UserDisplay
                        userId={post.userId}
                        isDeleted={post.isDeleted}
                        fallbackData={{
                          name: post.user?.name,
                          avatar: post.user?.avatar,
                        }}
                      />

                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />{" "}
                        {post.commentsCount}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-50" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {filteredPosts.length === 0 && (
            <p className="text-center text-zinc-500 font-medium py-12">
              No discussions found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
