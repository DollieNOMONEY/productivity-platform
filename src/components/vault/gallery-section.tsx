"use client"
// --- NEXT.JS ---
import { useState } from "react";
import Image from "next/image";
// --- ShadCN UI COMPONENTS & DESIGN ---
import { DeleteAssetLoader } from "@/app/(app)/(protected)/vault/delete-asset-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, X, Search, Filter, ChevronLeft } from "lucide-react";
// --- MISC ---
import { CreateFolderDialog } from "./folder-actions";
import { VaultHookReturn, useVault } from "@/hooks/use-vault";
import { DEFAULT_SUBJECTS,VaultItem } from "@/lib/data";
import { VaultContextMenu } from "../context-menu/vault-context-menu";

export default function GallerySection({ vault }: { readonly vault: VaultHookReturn }) {
  const {
    filteredItems,
    filterSubject,
    setFilterCategory,
    filterCategory,
    setFilterSubject,
    handleDeleteItem,
    foldersAtLevel,
    filesInFolder,
    setCurrentPath,
    currentPath,
    handleCreateFolder,
    allFolderPaths,
    renameVaultFolder,
    deleteVaultFolder,
    moveVaultFile,
  } = useVault();

  const handleBack = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : `/${parts.join("/")}`);
  };

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
    path: string | null
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
    <div className="mt-12 pt-8 border-t space-y-6 animate-in fade-in">

      <VaultContextMenu 
        ui={contextMenu}
        closeMenu={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        availableFolders={allFolderPaths}
        actions={{
          renameFolder: (path) => {
            const newName = prompt("Enter new folder name:", path.split("/").pop());
            if (newName) renameVaultFolder(path, newName);
          },
          deleteFolder: deleteVaultFolder,
          moveFile: moveVaultFile,
        }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentPath !== "/" && (
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h2 className="text-2xl font-black tracking-tight uppercase">
            {currentPath === "/" ? "Root Vault" : currentPath.split("/").pop()}
          </h2>
        </div>
        
        {/* CONTEXT: Create Folder Button */}
        <CreateFolderDialog 
          currentPath={currentPath} 
          onCreateFolder={handleCreateFolder} // Ensure this is exported from useVault
        />
      </div>

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

        {/* <Badge
          variant={filterSubject === "unorganized" ? "secondary" : "outline"}
          className="cursor-pointer whitespace-nowrap border-dashed border-muted-foreground/50"
          onClick={() => setFilterSubject(filterSubject === "unorganized" ? null : "unorganized")}
        >
          Unorganized
        </Badge> */}

        {DEFAULT_SUBJECTS.map((sub) => (
          <Badge
            key={sub}
            variant={filterSubject === sub ? "secondary" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilterSubject(filterSubject === sub ? null : sub)}
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
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 select-none">
          {/* FOLDERS: Clickable explorer navigation */}
          {foldersAtLevel.map((folder) => {
           const folderFullPath = currentPath === "/" ? `/${folder}` : `${currentPath}/${folder}`;
            return (
            <Card
              key={folder}
              onContextMenu={(e) => handleContextMenu(e, "folder", null, folderFullPath)}
              className="break-inside-avoid p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
              onClick={() =>
                setCurrentPath(
                  `${currentPath}${currentPath.endsWith("/") ? "" : "/"}${folder}`,
                )
              }
            >
              <Image
                src="/assets/vault/FOLDER_ICON_CAT.png"
                alt="Folder"
                className="w-30 h-30 text-primary/70 mb-2"
                width={500}
                height={500}
              ></Image>
              <span className="text-[16px] font-bold tracking-tighter">
                {folder}
              </span>
            </Card>
          );
          })}

          {/* FILES: Rendered at the current path level */}
          {filesInFolder.map((item: VaultItem) => (
            <Card
              key={item.id}
              onContextMenu={(e) => handleContextMenu(e, "file", item.id, item.path || "/")}
              /* 2. CONTEXT: BREAK-INSIDE-AVOID: This prevents cards from SPLITTING between columns */
              className="break-inside-avoid overflow-hidden group flex flex-col mb-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => vault.setSelectedItem(item)}
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
  );
}
