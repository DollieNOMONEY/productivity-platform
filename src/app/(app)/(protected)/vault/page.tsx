// --- NEXT.JS ---
"use client";
import { useState, useEffect, useCallback } from "react";
// --- FIREBASE ---
import { auth, storage, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
// --- IMPORTING DATA ---
import type { Category } from "@/lib/data";
import {
  DEFAULT_SUBJECTS,
  FileMetadata,
  VaultItem,
  SWIPE_ANIMATIONS,
} from "@/lib/data";
// --- MISC & ANIMATION ---
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { motion, AnimatePresence } from "framer-motion";
// --- ShadCN UI COMPONENTS & Icons ---
import { DeleteAssetLoader } from "./delete-asset-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  UploadCloud,
  FileText,
  Brain,
  CheckCircle2,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  X,
  Search,
  Filter,
  ChevronsUpDown,
} from "lucide-react";


export default function VaultPage() {
  // CONTEXT: While processing the files, we set Math by default for less friction
  const [activeSubject, setActiveSubject] = useState<string>("Math");
  // CONTEXT: We don't want to send to db permanently without conformation so we store it as a buffer
  const [assets, setAssets] = useState<FileMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user] = useAuthState(auth);
  const [isUploading, setIsUploading] = useState(false);
  // CONTEXT: Full screen preview
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  const updateItemSubject = async (newSubject: string) => {
    if (!selectedItem) return;
    
    try {
      const assetRef = doc(db, "vaultAssets", selectedItem.id);
      await updateDoc(assetRef, { subject: newSubject });
      
      // Update local state so the UI reflects it immediately
      setSelectedItem({ ...selectedItem, subject: newSubject });
      toast.success(`Moved to ${newSubject}`);
    } catch (e) {
      toast.error("Failed to update: " + e);
    }
  };

  // CONTEXT: Drag & drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newAssets = acceptedFiles.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "",
      category: null,
      subject: "",
      customTag: "",
    }));
    setAssets((prev) => [...prev, ...newAssets]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
  });

  const handleSort = useCallback(
    (category: Category) => {
      setAssets((prev) => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          category: category,
          subject: activeSubject,
        };
        return updated;
      });
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, activeSubject],
  );

  // CONTEXT: Users can sort either by swiping or a keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CONTEXT: Do not trigger sorting if the full screen viewer is open
      if (selectedItem) return;

      if (assets.length === 0 || currentIndex >= assets.length) return;
      if (e.key === "ArrowUp") handleSort("formula");
      if (e.key === "ArrowRight") handleSort("whiteboard");
      if (e.key === "ArrowLeft") handleSort("past_paper");
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [handleSort, assets.length, currentIndex, selectedItem]);

  // CONTEXT: After commiting to vault, it compresses the file and sends to firebase storage
  const commitToVault = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      for (const asset of assets) {
        let fileToUpload = asset.file;

        if (fileToUpload.type.startsWith("image/")) {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          fileToUpload = await imageCompression(fileToUpload, options);
        }

        const storageRef = ref(
          storage,
          `vault/${user.uid}/${Date.now()}_${fileToUpload.name}`,
        );
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, "vaultAssets"), {
          userId: user.uid,
          url,
          fileName: fileToUpload.name,
          fileType: fileToUpload.type,
          category: asset.category,
          subject: asset.subject,
          customTag: asset.customTag,
          createdAt: new Date(),
        });
      }

      setAssets([]);
      setCurrentIndex(0);
      toast.success("Vault Synchronized", { position: "top-center" });
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Vault Synchronized", { position: "top-center" });
    } finally {
      setIsUploading(false);
    }
  };

  // CONTEXT: The logic and the state for the Vault Gallery (All files you've imported)
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // CONTEXT: Real-time read functionality
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "vaultAssets"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as VaultItem[];

      
      // CONTEXT: Most recent uploads appears at the top, oldest at the bottom
      setVaultItems([...items].reverse());
    });
    return () => unsubscribe();
  }, [user]);

  const handleDeleteItem = async (id: string, url: string) => {
    const loadingToast = toast.loading("Deleting asset...", {
      position: "top-center",
    });

    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      await deleteDoc(doc(db, "vaultAssets", id));

      toast.success("Asset deleted permanently.", {
        id: loadingToast,
        position: "top-center",
      });
      // CONTEXT: If the deleted item so happens to be in full screen, we close it
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Error: Could not delete asset.", {
        id: loadingToast,
        position: "top-center",
      });
    }
  };

  // CONTEXT: Filtering Logic
  const filteredItems = vaultItems.filter((item) => {
    const matchSubject = filterSubject ? item.subject === filterSubject : true;
    const matchCategory = filterCategory
      ? item.category === filterCategory
      : true;
    return matchSubject && matchCategory;
  });

  const isProcessing = assets.length > 0 && currentIndex < assets.length;
  const isReadyToCommit = assets.length > 0 && currentIndex === assets.length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 overflow-hidden space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Collapsible>
        <div className="flex items-center justify-between gap-4 px-4">
          <h4 className="text-sm font-semibold">Upload Files</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <ChevronsUpDown />
              <span className="sr-only">Toggle details</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {!isProcessing && !isReadyToCommit && (
            <Card className="border-2 shadow-sm">
              <CardContent className="p-0">
                <div
                  {...getRootProps()}
                  className={`
                    relative cursor-pointer rounded-xl border-2 border-dashed m-6 p-16 
                    transition-all duration-200 ease-in-out flex flex-col items-center justify-center
                    ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/30 hover:border-primary/50"}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="p-4 rounded-full bg-secondary mb-4">
                    <UploadCloud
                      className={`w-10 h-10 ${isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"}`}
                    />
                  </div>
                  <p className="text-xl font-medium mb-1">
                    {isDragActive ? "DROP TO INJECT" : "DRAG FILES HERE"}
                  </p>
                  <p className="text-sm text-muted-foreground">Tap to browse</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>

      {isProcessing && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center text-sm font-mono font-bold text-muted-foreground">
            <span>
              PROCESSING: {currentIndex + 1} / {assets.length}
            </span>
            <span className="truncate max-w-[150px]">
              {assets[currentIndex].file.name}
            </span>
          </div>

          <Card className="border-2 shadow-sm max-w-md mx-auto lg:max-w-2xl">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Current Subject
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUBJECTS.map((sub) => (
                    <Badge
                      key={sub}
                      variant={activeSubject === sub ? "default" : "secondary"}
                      className="cursor-pointer text-sm py-1.5 px-3 transition-colors"
                      onClick={() => setActiveSubject(sub)}
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CONTEXT: Swipe card container */}
          <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
            {/* CONTEXT: BG hint layer */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <div className="flex flex-col items-center gap-8">
                <span className="flex items-center gap-2">
                  <ArrowUp /> Formula
                </span>
                <div className="flex gap-24">
                  <span className="flex items-center gap-2">
                    <ArrowLeft /> Paper
                  </span>
                  <span className="flex items-center gap-2">
                    Notes <ArrowRight />
                  </span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                dragElastic={1}
                exit={{
                  // CONTEXT: Look up the category in map, fallback to default if it is null
                  ...(SWIPE_ANIMATIONS[
                    assets[currentIndex]
                      .category as keyof typeof SWIPE_ANIMATIONS
                  ] || SWIPE_ANIMATIONS.default),
                  opacity: 0,
                  transition: { duration: 0.3 },
                }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragEnd={(e, { offset }) => {
                  const threshold = 100;
                  if (offset.y < -threshold) handleSort("formula");
                  else if (offset.x > threshold) handleSort("whiteboard");
                  else if (offset.x < -threshold) handleSort("past_paper");
                }}
                // CONTEXT: The container wraps BOTH the image and the outside labels
                className="relative cursor-grab active:cursor-grabbing group"
              >
                {/* CONTEXT: Formula (Guide: Above the image) */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 md:-top-14">
                  <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 md:scale-100">
                    <Brain className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
                    <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                      Formula
                    </span>
                  </div>
                </div>

                {/* CONTEXT: Notes (Guide: to the Right - Inside on mobile, outside on Desktop) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 xl:-right-40 z-20">
                  <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 xl:scale-100">
                    <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                      Notes
                    </span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
                  </div>
                </div>

                {/* CONTEXT: Exams (Guide: to the Left - Inside on mobile, outside on Desktop) */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 xl:-left-40 z-20">
                  <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 xl:scale-100">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
                    <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                      Exams
                    </span>
                  </div>
                </div>

                {/* CONTEXT: Image Card Preview */}
                <Card className="w-full h-auto max-h-[70vh] overflow-hidden shadow-2xl border-2 bg-black/20 backdrop-blur-md flex items-center justify-center">
                  {assets[currentIndex].previewUrl ? (
                    <img
                      src={assets[currentIndex].previewUrl}
                      alt="preview"
                      draggable="false"
                      className="w-full h-full object-contain max-h-[70vh] select-none"
                    />
                  ) : (
                    <div className="p-20 flex flex-col items-center gap-4">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                      <span className="text-xs font-mono">PDF</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* CONTEXT: Commit to vault */}
      {isReadyToCommit && (
        <Card className="border-2 shadow-lg animate-in fade-in">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
            <CardTitle className="text-2xl">Processing Complete</CardTitle>
            <CardDescription className="mb-4">
              {assets.length} file(s) categorized & ready for database
              synchronization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="ghost"
              className="w-full h-14 text-lg font-bold bg-brand text-white rounded-l-full"
              onClick={commitToVault}
              disabled={isUploading}
            >
              {isUploading ? "SYNCING TO DATABASE..." : "UPLOAD TO VAULT"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setAssets([]);
                setCurrentIndex(0);
              }}
            >
              Cancel & Start Over
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CONTEXT: Vault Gallery UI; which only shows when user is not swiping/uploading */}
      {!isProcessing && !isReadyToCommit && (
        <div className="mt-12 pt-8 border-t space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              Gallery ({filteredItems.length})
            </h2>

            {/* QUICK FILTERS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto select-none">
              <Filter className="w-4 h-4 shrink-0" />
              {/* reset filter button */}
              {(filterSubject || filterCategory) && (
                <Badge
                  variant="destructive"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    setFilterSubject(null);
                    setFilterCategory(null);
                  }}
                >
                  Clear Filters <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              {/* CONTEXT: Category Filtering */}
              {["formula", "whiteboard", "past_paper"].map((cat) => (
                <Badge
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  className="cursor-pointer capitalize shrink-0"
                  onClick={() =>
                    setFilterCategory(filterCategory === cat ? null : cat)
                  }
                >
                  {cat.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* CONTEXT: Subject Filtering (horizontal scroll) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {DEFAULT_SUBJECTS.map((sub) => (
              <Badge
                key={sub}
                variant={filterSubject === sub ? "secondary" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() =>
                  setFilterSubject(filterSubject === sub ? null : sub)
                }
              >
                {sub}
              </Badge>
            ))}
          </div>

          {/* CONTEXT: Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              No Content
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {filteredItems.map((item) => (
                /* 2. CONTEXT: BREAK-INSIDE-AVOID: This prevents cards from SPLITTING between columns */
                <Card
                  key={item.id}
                  className="break-inside-avoid overflow-hidden group flex flex-col mb-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* CONTEXT: Flexible aspect ratio for different files */}
                  <div className="relative w-full h-full">
                    {item.fileType.startsWith("image/") ? (
                      <img
                        src={item.url}
                        alt="Vault Asset"
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="aspect-3/4 flex items-center justify-center w-full bg-muted/10 group-hover:bg-muted/20 transition-colors">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}

                    {/* CONTEXT: Delete overlay (ADDED PROPAGATION to prevent full-screen when deleting)*/}
                    <div className="absolute top-2 right-2 z-20">
                      <DeleteAssetLoader
                          id={item.id}
                          url={item.url}
                          onDelete={handleDeleteItem}
                        />
                    </div>

                    {/* CONTEXT: Category Overlay */}
                    <div className="absolute bottom-2 left-2 pointer-events-none">
                      <Badge className="bg-black/60 text-[10px] uppercase tracking-wider text-white backdrop-blur-md border-0 py-0.5 px-2 shadow-md">
                        {item.category?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTEXT: Full-screen viewer Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-8"
            onClick={() => setSelectedItem(null)}
          >
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-110 rounded-full opacity-70 hover:opacity-100"
              onClick={() => setSelectedItem(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()} // CONTEXT: Prevent clicking the image/pdf from closing the modal
            >
              <div className="w-full flex gap-2 p-4  rounded-xl mt-4 overflow-x-auto scrollbar-hide shrink-0">
                {DEFAULT_SUBJECTS.map((sub) => (
                  <button 
                    key={sub}
                    onClick={() => updateItemSubject(sub)}
                    className="px-3 py-1 text-[10px] font-medium whitespace-nowrap border rounded-full hover:bg-primary transition-colors"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            
              {selectedItem.fileType.startsWith("image/") ? (
                <img
                  src={selectedItem.url}
                  alt="Full screen preview"
                  className="max-w-full max-h-full object-contain select-none drop-shadow-2xl rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="w-full bg-secondary/50 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {selectedItem.fileName}
                      </span>
                    </div>
                  </div>
                  {/* CONTEXT: Native PDF iframe for PDF Files */}
                  <iframe
                    src={selectedItem.url}
                    className="w-full flex-1 border-0"
                    title="PDF Viewer"
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
