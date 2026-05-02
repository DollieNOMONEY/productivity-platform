// --- NEXT.JS ---
"use client";
import { useState, useEffect } from "react";
// --- FIREBASE ---
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  where,
  doc,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
// --- FUNCTIONS ---
import { cn, formatDateStr, getDisplayDate, filterMissions } from "@/lib/utils";
import type { TaskColor } from "./_components/task-modal";
import { TaskModal } from "./_components/task-modal";
// --- SHAD.CN UI COMPONENTS & ICONS ---
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import { MissionCard } from "./_components/mission-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
// --- INTERFACE ---
import * as Missions from "@/lib/data"; // import everything

export default function MissionPage() {
  // CONTEXT: USER
  const [user] = useAuthState(auth);
  // CONTEXT: MISSIONS
  const [tasks, setTasks] = useState<Missions.MISSIONPLACEHOLDER[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  // CONTEXT: UI STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] =
    useState<Missions.MISSIONPLACEHOLDER | null>(null);
  const [isArchiveView, setIsArchiveView] = useState(false);
  // CONTEXT: FILTERING STATE
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  // CONTEXT: DATE STATE
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const todayStr = formatDateStr(new Date());
  const viewDateStr = formatDateStr(viewDate);
  const isPast = viewDateStr < todayStr;
  // CONTEXT: MENUS
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: string | null;
  }>({ visible: false, x: 0, y: 0, taskId: null });

  useEffect(() => {
    if (!user) return;
    let q;
    if (isArchiveView) {
      q = query(
        collection(db, "users", user.uid, "missions"),
        where("archived", "==", true),
        orderBy("archivedAt", "desc"),
      );
    } else {
      q = query(
        collection(db, "users", user.uid, "missions"),
        where("date", "==", viewDateStr),
        where("archived", "==", false),
        orderBy("createdAt", "desc"),
      );
    }
    const unsubscribeDocs = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Missions.MISSIONPLACEHOLDER[];

      setTasks(tasksData);

      if (!isArchiveView) {
        const uniqueTags = Array.from(
          new Set(tasksData.map((t) => t.tag).filter(Boolean)),
        );
        setAllTags(uniqueTags);
      }
    });
    return () => unsubscribeDocs();
  }, [user, viewDateStr, isArchiveView]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // --- CONTEXT: FIREBASE ACTIONS (CRUD) ---
  const addOrEditTask = async (text: string, tag: string, color: TaskColor) => {
    if (!user) return;
    if (taskToEdit) {
      const taskRef = doc(db, "users", user.uid, "missions", taskToEdit.id);
      await updateDoc(taskRef, {
        text,
        tag,
        color,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "users", user.uid, "missions"), {
        text,
        tag,
        color,
        date: viewDateStr,
        done: false,
        archived: false,
        createdAt: serverTimestamp(),
      });
    }
    setTaskToEdit(null);
  };
  const toggleTask = async (id: string, currentStatus: boolean) => {
    if (!user || isPast) return;
    await updateDoc(doc(db, "users", user.uid, "missions", id), {
      done: !currentStatus,
      updatedAt: serverTimestamp(),
    });
  };
  const archiveTask = async (id: string) => {
    if (!user || isPast) return;
    await updateDoc(doc(db, "users", user.uid, "missions", id), {
      archived: true,
      archivedAt: serverTimestamp(),
    });
  };
  const restoreTask = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "missions", id), {
        archived: false,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Restore failed", e);
    }
  };
  const deleteTask = async (id: string) => {
    if (!user || (isPast && !isArchiveView)) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "missions", id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };
  const updateAllTags = async (
    oldTag: string,
    newTag: string,
    newColor?: string,
  ) => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "missions"),
      where("tag", "==", oldTag),
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
      const updates: any = { tag: newTag };
      if (newColor) updates.color = newColor;
      batch.update(docSnap.ref, updates);
    });
    await batch.commit();
  };

  // --- CONTEXT: UI EVENT HANDLERS ---
  const handleContextMenu = (
    e: React.PointerEvent | React.MouseEvent,
    id: string,
  ) => {
    e.preventDefault();

    // Pointer Events & Mouse Events have pageX/pageY directly on the event object
    const x = e.pageX;
    const y = e.pageY;

    setContextMenu({
      visible: true,
      x,
      y,
      taskId: id,
    });
  };

  const displayedTasks = filterMissions(tasks, filterTag, filterColor);

  const allExistingTags = tasks
  .map((t) => t.tag)
  .filter((tag) => tag !== undefined && tag !== "");
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative max-w-2xl mx-auto pt-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isArchiveView && (
              <div className="flex items-center rounded-full p-1">
                <button
                  onClick={() =>
                    setViewDate(
                      new Date(viewDate.setDate(viewDate.getDate() - 1)),
                    )
                  }
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold px-4 select-none min-w-[140px] text-center">
                  {getDisplayDate(viewDate)}
                </span>
                <button
                  onClick={() =>
                    setViewDate(
                      new Date(viewDate.setDate(viewDate.getDate() + 1)),
                    )
                  }
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {isArchiveView && (
              <h2 className="text-xl font-bold text-red-500">
                Recently Deleted
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsArchiveView(!isArchiveView);
                setFilterTag(null);
                setFilterColor(null);
              }}
              size="icon"
              variant="outline"
              className="rounded-full w-9 h-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {!isPast && !isArchiveView && (
              <Button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsModalOpen(true);
                }}
                size="sm"
                className="rounded-full select-none bg-brand"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            )}
          </div>
        </div>

        {/* CONTEXT: Filter Drop-down */}
        {!isArchiveView && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-highlight select-none">
              Filters:
            </span>

            {/* CONTEXT: Filter by name */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant={filterTag ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 transition select-none"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {filterTag || "Tag Name"}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => setFilterTag(null)}>
                  All Names
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {allTags.map((tag) => (
                  <DropdownMenuItem key={tag} onClick={() => setFilterTag(tag)}>
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CONTEXT: Filter by color */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant={filterColor ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 transition select-none"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {filterColor
                    ? Missions.COLORS[
                        filterColor as keyof typeof Missions.COLORS
                      ].label
                    : "Tag Color"}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => setFilterColor(null)}>
                  All Colors
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(
                  Object.keys(Missions.COLORS) as Array<
                    keyof typeof Missions.COLORS
                  >
                ).map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => setFilterColor(c)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full border border-zinc-300",
                        Missions.COLORS[c].bg,
                      )}
                    />
                    {Missions.COLORS[c].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CONTEXT: Clear Filters */}
            {(filterTag || filterColor) && (
              <button
                onClick={() => {
                  setFilterTag(null);
                  setFilterColor(null);
                }}
                className="hover:scale-90 text-xs text-red-500 hover:text-red-700 font-medium ml-2 transition"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 overflow-x-hidden py-2">
        <AnimatePresence>
          {displayedTasks.map((task) => (
            <MissionCard
              key={task.id}
              task={task}
              isPast={isPast}
              isArchiveView={isArchiveView}
              onToggle={toggleTask}
              onArchive={archiveTask}
              onDelete={deleteTask}
              onRestore={restoreTask}
              onEdit={(t) => {
                setTaskToEdit(t);
                setIsModalOpen(true);
              }}
              onContextMenu={handleContextMenu}
            />
          ))}
        </AnimatePresence>

        {displayedTasks.length === 0 && (
          <div className="text-center py-12 text-brand-highlight text-sm">
            {isArchiveView ? "Trash is empty." : "No missions for today."}
          </div>
        )}
      </div>

      {/* CONTEXT: Right click for Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50  border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {isArchiveView ? (
            <>
              <button
                onClick={() => {
                  if (contextMenu.taskId) restoreTask(contextMenu.taskId);
                  setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
              >
                <ArchiveRestore className="w-3 h-3 mr-2" /> Restore
              </button>
              <button
                onClick={() => {
                  if (contextMenu.taskId) deleteTask(contextMenu.taskId);
                  setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center"
              >
                <Trash2 className="w-3 h-3 mr-2" /> Delete Forever
              </button>
            </>
          ) : (
            <div className="flex flex-col">
              {/* CONTEXT: Edit Mission, Move to Tag, Theme Color */}
              <button
                onClick={() => {
                  const t = tasks.find((t) => t.id === contextMenu.taskId);
                  if (t) {
                    setTaskToEdit(t);
                    setIsModalOpen(true);
                  }
                  setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Edit Mission
              </button>

              <div className="h-1px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <div className="px-4 py-1.5 text-[10px] font-bold text-brand-highlight uppercase tracking-wider">
                Move to Tag
              </div>
              <div className="max-h-32 overflow-y-auto px-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (contextMenu.taskId)
                        updateDoc(
                          doc(
                            db,
                            "users",
                            user!.uid,
                            "missions",
                            contextMenu.taskId,
                          ),
                          { tag },
                        );
                      setContextMenu({
                        visible: false,
                        x: 0,
                        y: 0,
                        taskId: null,
                      });
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
                      const t = tasks.find((t) => t.id === contextMenu.taskId);
                      if (t) updateAllTags(t.tag, t.tag, cKey);
                      setContextMenu({
                        visible: false,
                        x: 0,
                        y: 0,
                        taskId: null,
                      });
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
                onClick={() => {
                  if (contextMenu.taskId) archiveTask(contextMenu.taskId);
                  setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Archive
              </button>
            </div>
          )}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={addOrEditTask}
        initialData={taskToEdit}
        existingTags={allExistingTags}
      />
    </div>
  );
}