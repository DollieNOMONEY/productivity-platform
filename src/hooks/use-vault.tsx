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
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
// --- IMPORTING DATA ---
import type { Category } from "@/lib/data";
import { FileMetadata, VaultItem } from "@/lib/data";
// --- MISC & ANIMATION ---
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";

import { toast } from "sonner";

export function useVault() {
  // LOGBOOK:
  // 1. UPLOADING FILE
  // 2. FULL SCREEN PREV
  // 3. FOLDER/FILE SYSTEM

  // -----------------------
  // 1. UPLOADING FILE------
  // -----------------------
  // CONTEXT: While processing the files, we set Math by default for less friction
  const [activeSubject, setActiveSubject] = useState<string>("Math");
  // CONTEXT: We don't want to send to db permanently without conformation so we store it as a buffer
  const [assets, setAssets] = useState<FileMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user] = useAuthState(auth);
  const [isUploading, setIsUploading] = useState(false);

  // -----------------------
  // 2. FULL SCREEN PREV----
  // -----------------------
  // CONTEXT: Full screen preview
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  // -----------------------
  // 3. FOLDER/FILE SYSTEM--
  // -----------------------
  // CONTEXT: WAPI WAPI UPDATE: We're now adding folders, mimicking File Explorer.
  const [currentPath, setCurrentPath] = useState("/");

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
          path: currentPath,
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

  const explicitFolders = filteredItems
    .filter((item): item is VaultItem => item.fileType === "folder")
    .filter((item) => {
      const pathParts = item.path?.split("/").filter(Boolean) || [];
      const currentParts = currentPath.split("/").filter(Boolean);

      return (
        pathParts.length === currentParts.length + 1 &&
        item.path?.startsWith(currentPath === "/" ? "" : currentPath)
      );
    })
    .map((item) => item.fileName || "Untitled Folder");

  const implicitFolders = filteredItems
    .filter((item) => item.fileType !== "folder") // Don't double-count
    .map((item) => item.path ?? "/")
    .filter((path) => path.startsWith(currentPath) && path !== currentPath)
    .map((path) => {
      const relativeSegments = path
        .replace(currentPath === "/" ? "" : currentPath, "")
        .split("/")
        .filter(Boolean);
      return relativeSegments[0];
    });

  const foldersAtLevel = Array.from(
    new Set([...explicitFolders, ...implicitFolders]),
  ).filter(Boolean);
  const filesInFolder = filteredItems.filter(
    (item) => item.fileType !== "folder" && (item.path ?? "/") === currentPath
  );

  const allFolderPaths = Array.from(
    new Set(
      vaultItems
        .filter((item) => item.fileType === "folder")
        .map((item) => item.path || "/")
    )
  );

  // 2. Rename Folder (Updates the folder AND all assets inside it)
  const renameVaultFolder = async (oldPath: string, newName: string) => {
    try {
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
      const newPath = parentPath === "/" ? `/${newName}` : `${parentPath}/${newName}`;

      const batch = writeBatch(db);

      // Find the actual folder document and update its name/path
      const folderDoc = vaultItems.find(
        (item) => item.fileType === "folder" && item.path === oldPath
      );
      if (folderDoc) {
        batch.update(doc(db, "vaultAssets", folderDoc.id), {
          fileName: newName,
          path: newPath,
        });
      }

      // Find ALL files inside this folder and update their paths too
      const children = vaultItems.filter((item) => item.path?.startsWith(oldPath));
      children.forEach((child) => {
        if (child.id !== folderDoc?.id) { // Skip the folder we just updated
          const childNewPath = child.path!.replace(oldPath, newPath);
          batch.update(doc(db, "vaultAssets", child.id), {
            path: childNewPath,
          });
        }
      });

      await batch.commit();
      
      // If we are currently inside the renamed folder, update the view
      if (currentPath.startsWith(oldPath)) {
        setCurrentPath(currentPath.replace(oldPath, newPath));
      }
      toast.success("Directory Renamed", {
      position: "top-center",
      });
    } catch (error) {
      console.error("Error renaming folder:", error);
      toast.error("Failed to rename directory", {
        position: "top-center",
      });
    }
  };

  // 3. Delete Folder (Destroys the folder AND all assets inside it)
  const deleteVaultFolder = async (folderPath: string) => {
    try {
      const batch = writeBatch(db);

      // Grab the folder itself, plus everything that has a path starting with this folder
      const itemsToDelete = vaultItems.filter(
        (item) => item.path === folderPath || item.path?.startsWith(`${folderPath}/`)
      );

      itemsToDelete.forEach((item) => {
        batch.delete(doc(db, "vaultAssets", item.id));
      });

      await batch.commit();
      toast.success("Directory Removed", {
        position: "top-center",
      });

      // Kick the user back to Root if they delete the folder they are currently standing inside
      if (currentPath.startsWith(folderPath)) {
        setCurrentPath("/");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete directory", {
        position: "top-center",
      });
    }
  };

  // 4. Move a single file to a new folder
  const moveVaultFile = async (fileId: string, newPath: string) => {
    try {
      await updateDoc(doc(db, "vaultAssets", fileId), {
        path: newPath,
      });
      toast.success("File Relocated", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error moving file:", error);
      toast.error("Failed to move file", {
        position: "top-center",
      });
    }
  };

  // CONTEXT: FOLDER FEATURE
  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;
    try {
      const safeName = folderName.replace(/\//g, "-");
      const path =
        currentPath === "/" ? `/${safeName}` : `${currentPath}/${safeName}`;

      await addDoc(collection(db, "vaultAssets"), {
        fileName: safeName,
        path: path,
        fileType: "folder",
        userId: user?.uid,
        createdAt: serverTimestamp(),
        url: "/assets/vault/FOLDER_ICON_CAT.png",
        category: "system",
      });

      console.log("Folder materialized in Firebase.");
    } catch (error) {
      console.error("Failed to initialize directory:", error);
    }
  };

  return {
    // 1. Uploading State
    activeSubject,
    setActiveSubject,
    assets,
    setAssets,
    currentIndex,
    setCurrentIndex,
    isUploading,
    isProcessing,
    isReadyToCommit,

    // 2. Actions
    getRootProps,
    getInputProps,
    isDragActive,
    handleSort,
    commitToVault,
    handleDeleteItem,
    updateItemSubject,

    // 3. Gallery & Filtering
    vaultItems,
    filteredItems,
    filterSubject,
    setFilterSubject,
    filterCategory,
    setFilterCategory,

    // 4. Folder System
    currentPath,
    setCurrentPath,
    foldersAtLevel,
    filesInFolder,

    // 5. Preview
    selectedItem,
    setSelectedItem,

    // 6. Folders
    handleCreateFolder,
    allFolderPaths,
    renameVaultFolder,
    deleteVaultFolder,
    moveVaultFile,
  };
}
export type VaultHookReturn = ReturnType<typeof useVault>;
