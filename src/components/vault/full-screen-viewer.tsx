"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { VaultItem, DEFAULT_SUBJECTS } from "@/lib/data";
import { FileText, X } from "lucide-react";
import { VaultContextMenu } from "../context-menu/vault-context-menu";
import { useVault } from "@/hooks/use-vault";

interface FullScreenViewerProps {
  readonly item: VaultItem | null;
  readonly onClose: () => void;
  readonly onUpdateSubject: (id: string, subject: string) => void;
  readonly currentPath: string;
}

export default function FullScreenViewer({
  item,
  onClose,
  currentPath,
  onUpdateSubject,
}: FullScreenViewerProps) {
  const {
    allFolderPaths,
    renameVaultFolder,
    deleteVaultFolder,
    moveVaultFile,
  } = useVault();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Only add the listener if an item is actually open
    if (item) {
      globalThis.addEventListener("keydown", handleKeyDown);
    }

    // Clean up the listener when the component unmounts or item closes
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: string | null;
    targetType: "folder" | "file" | null;
    targetPath: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    targetType: null,
    targetPath: null,
  });

  const handleContextMenu = (
    e: React.MouseEvent,
    type: "folder" | "file",
    id: string | null,
    path: string | null,
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetType: type,
      targetPath: path,
    });
  };

  return (
    <div>
      {/* CONTEXT: Full-screen viewer Overlay */}

      <VaultContextMenu
        ui={contextMenu}
        closeMenu={() =>
          setContextMenu((prev) => ({ ...prev, visible: false }))
        }
        availableFolders={allFolderPaths}
        actions={{
          renameFolder: (path) => {
            const newName = prompt(
              "Enter new folder name:",
              path.split("/").pop(),
            );
            if (newName) renameVaultFolder(path, newName);
          },
          deleteFolder: deleteVaultFolder,
          moveFile: moveVaultFile,
        }}
      />

      <AnimatePresence>
        {item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-8"
            onClick={onClose}
            onContextMenu={(e) => handleContextMenu(e, "folder", null, currentPath)}
          >
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-110 rounded-full opacity-70 hover:opacity-100"
              onClick={onClose}
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
              <div className="w-full flex gap-2 p-4 md:justify-center rounded-xl mt-4 overflow-x-auto scrollbar-hide shrink-0">
                {DEFAULT_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => onUpdateSubject(item.id, sub)}
                    className="text-foreground bg-background px-3 py-1 text-[10px] font-medium whitespace-nowrap border rounded-full hover:bg-primary transition-colors"
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {item.fileType.startsWith("image/") ? (
                <img
                  src={item.url}
                  alt="Full screen preview"
                  className="max-w-full max-h-full object-contain select-none drop-shadow-2xl rounded-md"
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, "file", item.id, item.path ?? null);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col"
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, "file", item.id, item.path?? null);
                  }}
                  >
                  <div className="w-full bg-secondary/50 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {item.fileName}
                      </span>
                    </div>
                  </div>
                  {/* CONTEXT: Native PDF iframe for PDF Files */}
                  <iframe
                    src={item.url}
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
