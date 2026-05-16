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
import { formatDateStr, filterMissions } from "@/lib/utils";
import type { TaskColor } from "@/app/(app)/(protected)/mission/_components/task-modal";
import * as Missions from "@/lib/data";

export function useMissions() {
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
    setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
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
    setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
  };
  const enterEditMode = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setTaskToEdit(task);
      setIsModalOpen(true);
    }
    setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
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
  // EXPANDING
  const moveTaskToTag = async (taskId: string, newTag: string) => {
    if (!user) return;
    try {
      const taskRef = doc(db, "users", user.uid, "missions", taskId);
      await updateDoc(taskRef, { tag: newTag });

      // Automatically close the menu after the update
      setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
    } catch (e) {
      console.error("Failed to update tag:", e);
    }
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

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, taskId: null });
  };

  const displayedTasks = filterMissions(tasks, filterTag, filterColor);

  const allExistingTags = tasks
    .map((t) => t.tag)
    .filter((tag) => tag !== undefined && tag !== "");

  return {
    // CONTEXT: Data
    tasks: displayedTasks,
    allTags,
    allExistingTags,
    user,

    // CONTEXT: Date & Logic States
    dateState: {
      viewDate,
      setViewDate,
      isPast,
      isArchiveView,
      setIsArchiveView,
    },

    // CONTEXT: UI States
    ui: {
      isModalOpen,
      setIsModalOpen,
      taskToEdit,
      setTaskToEdit,
      contextMenu,
      handleContextMenu,
      closeContextMenu,
    },

    // CONTEXT: Filtering
    filters: {
      filterTag,
      setFilterTag,
      filterColor,
      setFilterColor,
    },

    // CONTEXT: CRUD Actions
    actions: {
      addOrEditTask,
      toggleTask,
      archiveTask,
      restoreTask,
      deleteTask,
      updateAllTags,
      moveTaskToTag,
      enterEditMode,
    },
  };
}
