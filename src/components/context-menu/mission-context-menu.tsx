import { ArchiveRestore, Trash2 } from "lucide-react";
import * as Missions from "@/lib/data";
import { cn } from "@/lib/utils";


interface MissionContextMenuProps {
  readonly ui: {
    readonly contextMenu: {
      readonly visible: boolean;
      readonly x: number;
      readonly y: number;
      readonly taskId: string | null;
    };
    readonly closeContextMenu: () => void;
  };
  readonly actions: {
    readonly addOrEditTask: (text: string, tag: string, color: keyof typeof Missions.COLORS) => Promise<void>;
    readonly toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
    readonly archiveTask: (id: string) => Promise<void>;
    readonly deleteTask: (id: string) => Promise<void>;
    readonly restoreTask: (id: string) => Promise<void>;
    readonly moveTaskToTag: (id: string, tag: string) => Promise<void>;
    readonly updateAllTags: (oldTag: string, newTag: string, color: keyof typeof Missions.COLORS) => Promise<void>;
    readonly enterEditMode: (taskId: string) => void;
  };
  readonly allTags: string[];
  readonly isArchiveView: boolean;
  readonly tasks: Missions.MISSIONPLACEHOLDER[];
}

export function MissionContextMenu({
  ui,
  actions,
  allTags,
  isArchiveView,
  tasks,
}: MissionContextMenuProps) {
  if (!ui.contextMenu.visible || !ui.contextMenu.taskId) return null;

  return (
    <div
      className="fixed z-50  border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      style={{ top: ui.contextMenu.y, left: ui.contextMenu.x }}
    >
      {isArchiveView ? (
        <>
          <button
            onClick={() =>
              ui.contextMenu.taskId &&
              actions.restoreTask(ui.contextMenu.taskId)
            }
            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
          >
            <ArchiveRestore className="w-3 h-3 mr-2" /> Restore
          </button>
          <button
            onClick={() =>
              ui.contextMenu.taskId && actions.deleteTask(ui.contextMenu.taskId)
            }
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center"
          >
            <Trash2 className="w-3 h-3 mr-2" /> Delete Forever
          </button>
        </>
      ) : (
        <div className="flex flex-col">
          {/* CONTEXT: Edit Mission, Move to Tag, Theme Color */}
          <button
            onClick={() =>
              ui.contextMenu.taskId &&
              actions.enterEditMode(ui.contextMenu.taskId)
            }
            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Edit Mission
          </button>

          <div className="h-1px bg-zinc-100 dark:bg-zinc-800 my-1" />

          <div className="px-4 py-1.5 text-[10px] font-bold text-brand-highlight uppercase tracking-wider">
            Move to Tag
          </div>
          <div className="max-h-32 overflow-y-auto px-1">
            {allTags.map((tag: string) => (
              <button
                key={tag}
                onClick={() => {
                  if (ui.contextMenu.taskId) {
                    actions.moveTaskToTag(ui.contextMenu.taskId, tag);
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          <div className="px-4 py-1.5 text-[10px] font-bold text-brand-highlight uppercase tracking-wider">
            Theme Color
          </div>
          <div className="grid grid-cols-5 gap-1 px-3 pb-2">
            {(
              Object.keys(Missions.COLORS) as Array<
                keyof typeof Missions.COLORS
              >
            ).map((cKey) => (
              <button
                key={cKey}
                title={Missions.COLORS[cKey].label}
                onClick={() => {
                  const t = tasks.find(
                    (t: Missions.MISSIONPLACEHOLDER) =>
                      t.id === ui.contextMenu.taskId,
                  );
                  if (t) {
                    actions.updateAllTags(t.tag, t.tag, cKey);
                    ui.closeContextMenu();
                  }
                }}
                className={cn(
                  "w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 transition hover:scale-110",
                  Missions.COLORS[cKey].bg,
                )}
              />
            ))}
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          <button
            onClick={() =>
              ui.contextMenu.taskId &&
              actions.archiveTask(ui.contextMenu.taskId)
            }
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}