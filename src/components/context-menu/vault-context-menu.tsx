import { FolderEdit, Trash2, FolderInput, CornerUpLeft } from "lucide-react";

interface VaultContextMenuProps {
  readonly ui: {
    readonly visible: boolean;
    readonly x: number;
    readonly y: number;
    readonly targetId: string | null;
    readonly targetType: "folder" | "file" | null;
    readonly targetPath: string | null;
  };
  readonly closeMenu: () => void;
  readonly actions: {
    readonly renameFolder: (folderPath: string) => void;
    readonly deleteFolder: (folderPath: string) => void;
    readonly moveFile: (fileId: string, newPath: string) => void;
  };
  readonly availableFolders: string[]; // CONTEXT: List of all folder paths in DB
}

export function VaultContextMenu({
  ui,
  closeMenu,
  actions,
  availableFolders,
}: VaultContextMenuProps) {
  if (!ui.visible || !ui.targetType) return null;

  return (
    <>
      {/* CONTEXT: Invisible backdrop to close menu when clicking outside */}
      <div className="fixed inset-0 z-40" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
      
      <div
        className="fixed z-500 border border-zinc-200 dark:border-zinc-800 bg-background rounded-lg shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
        style={{ top: ui.y, left: ui.x }}
      >
        {ui.targetType === "folder" ? (
          <>
            <button
              onClick={() => {
                if (ui.targetPath) actions.renameFolder(ui.targetPath);
                closeMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center transition-colors"
            >
              <FolderEdit className="w-4 h-4 mr-2" /> Rename Directory
            </button>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
            <button
              onClick={() => {
                if (ui.targetPath) {
                  if (globalThis.confirm(`Are you sure you want to delete ${ui.targetPath.split("/").pop()}? This action is permanent.`)) {
                    actions.deleteFolder(ui.targetPath);
                  }
                }
                closeMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Directory
            </button>
          </>
        ) : (
          <div className="flex flex-col">
            <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Move Asset To
            </div>
            
            <button
              onClick={() => {
                if (ui.targetId) actions.moveFile(ui.targetId, "/");
                closeMenu();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center text-primary"
            >
              <CornerUpLeft className="w-4 h-4 mr-2" /> Root Vault
            </button>

            <div className="max-h-40 overflow-y-auto px-1 mt-1">
              {availableFolders.map((folderPath) => (
                <button
                  key={folderPath}
                  onClick={() => {
                    if (ui.targetId) actions.moveFile(ui.targetId, folderPath);
                    closeMenu();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors flex items-center"
                >
                  <FolderInput className="w-3 h-3 mr-2 opacity-50" />
                  {folderPath === "/" ? "Root" : folderPath.split("/").pop()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}