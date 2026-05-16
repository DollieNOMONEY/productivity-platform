"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// --- FIREBASE ---
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

// --- SHADCN UI COMPONENTS & ICONS ---
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Flame,
  Clock,
  Loader2,
  Target,
  Snowflake,
  TrendingDown,
  X,
  Plus,
  ChartLine,
} from "lucide-react";
import { cn, formatDateStr } from "@/lib/utils";
import { MissionCard } from "../mission/_components/mission-card";
import { TaskModal } from "../mission/_components/task-modal";
import * as Missions from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// --- TYPES ---
interface SessionData {
  duration: number;
  status: string;
  uid: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [profileName, setProfileName] = useState<string | null>(null);

  // CONTEXT: Mission & UI States
  const [missions, setMissions] = useState<Missions.MISSIONPLACEHOLDER[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] =
    useState<Missions.MISSIONPLACEHOLDER | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: string | null;
  }>({ visible: false, x: 0, y: 0, taskId: null });

  // CONTEXT: Stats States
  const [timeFocused, setTimeFocused] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });
  const [streakData, setStreakData] = useState<{
    count: number;
    status: string;
    label: string;
  }>({ count: 0, status: "active", label: "Loading..." });
  const [timeToMidnight, setTimeToMidnight] = useState<string>("");
  const [showNewDayModal, setShowNewDayModal] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [pastActiveDays, setPastActiveDays] = useState<number[]>([]);

  // CONTEXT: Progress States
  const [dailyProgress, setDailyProgress] = useState<number>(0);
  const [hasRewarded, setHasRewarded] = useState<boolean>(false);

  const todayStr = formatDateStr(new Date());

  useEffect(() => {
    if (!user) return;

    // CONTEXT: Set Username from Database in Real-time
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileName(docSnap.data().username);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // CONTEXT: Timer Handler & show modal every check-in
  useEffect(() => {
    const lastVisit = localStorage.getItem("lastDashboardVisit");
    if (lastVisit !== todayStr) {
      setShowNewDayModal(true);
      localStorage.setItem("lastDashboardVisit", todayStr);
    }

    const timer = setInterval(() => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeToMidnight(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [todayStr]);

  // Context: Calculating Mission & Stats
  useEffect(() => {
    if (!user) return;

    // CONTEXT: Missions Handler
    const qMissions = query(
      collection(db, "users", user.uid, "missions"),
      where("date", "==", todayStr),
      where("archived", "==", false),
      orderBy("createdAt", "desc"),
    );

    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Missions.MISSIONPLACEHOLDER[],
      );
    });

    // CONTEXT: Sessions Handler
    const qSessions = query(
      collection(db, "sessions"),
      where("uid", "==", user.uid),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
    );

    const unsubSessions = onSnapshot(
      qSessions,
      (snapshot) => {
        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();

        let todaySeconds = 0;
        const uniquePastDays = new Set<number>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const sessionDate = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date();

          const sessionDateMidnight = new Date(
            sessionDate.getFullYear(),
            sessionDate.getMonth(),
            sessionDate.getDate(),
          ).getTime();

          // CONTEXT: Keeping track of today's focus time separately from other past streak days
          if (sessionDateMidnight === startOfToday) {
            todaySeconds += data.duration || 0;
          } else {
            uniquePastDays.add(sessionDateMidnight);
          }
        });

        const hours = Math.floor(todaySeconds / 3600);
        const minutes = Math.floor((todaySeconds % 3600) / 60);
        const seconds = todaySeconds % 60;

        setTimeFocused({ hours, minutes, seconds });
        // CONTEXT: Store past active days from newest to oldest for streak logic
        setPastActiveDays(Array.from(uniquePastDays).sort((a, b) => b - a));
        setIsLoadingData(false);
      },
      (error) => {
        console.error("Firebase Error: ", error);
      },
    );

    return () => {
      unsubMissions();
      unsubSessions();
    };
  }, [user, todayStr]);

  // CONTEXT: Handling Logic for Progress Bar, Reward
  useEffect(() => {
    if (isLoadingData) return;

    const totalSecondsFocused =
      timeFocused.hours * 3600 + timeFocused.minutes * 60 + timeFocused.seconds;
    const completedMissionsCount = missions.filter((m) => m.done).length;

    let currentCalculatedProgress = 0;
    // CONTEXT: Task1: 10 minutes of focus
    if (totalSecondsFocused >= 600) currentCalculatedProgress += 50;
    // CONTEXT: Task2: Check off 2 missions
    if (completedMissionsCount >= 2) currentCalculatedProgress += 50;
    // CONTEXT: Ensuring progress doesn't go backwards for mental health
    const newMaxProgress = Math.max(dailyProgress, currentCalculatedProgress);
    setDailyProgress(newMaxProgress);
    // CONTEXT: Reward Handler
    if (newMaxProgress === 100 && dailyProgress < 100 && !hasRewarded) {
      toast.success(
        "You've won a reward! Your streak has increased to one. Great job on the momentum.",
        { position: "top-center" },
      );
      setHasRewarded(true);
    }

    // CONTEXT: Handling Streaks
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const oneDayMs = 1000 * 60 * 60 * 24;

    // CONTEXT: Calculate streak before today
    let finalCount = 0;
    let finalStatus = "pending";
    let finalLabel = "Awaiting Today";

    if (pastActiveDays.length > 0) {
      // CONTEXT: Find the highest non-breaking streak they ever had ending at their last active day
      let peakStreak = 1;
      for (let i = 0; i < pastActiveDays.length - 1; i++) {
        if (Math.floor((pastActiveDays[i] - pastActiveDays[i + 1]) / oneDayMs) === 1) {
          peakStreak++;
        } else {
          break; // CONTEXT: streak has broken in the past
        }
      }

      // CONTEXT: Calculate "Days Since Last Active"
      const lastActiveDay = pastActiveDays[0];
      const daysSinceLastActive = Math.floor((startOfToday - lastActiveDay) / oneDayMs);

      if (daysSinceLastActive === 0) {
        // CONTEXT: They were active TODAY (it already hit 100% and we re-run the logic again)
        finalCount = peakStreak;
        finalStatus = "active";
        finalLabel = "Streak Ongoing!";
      } else if (daysSinceLastActive <= 2) {
        // CONTEXT: They are currently inactive (haven't hit 100% yet today)
        // daysSinceLastActive: 1 = yesterday'd be last active, 2 = day before, etc.
        // DAY 1 or 2 of missing: FROZEN
          finalCount = peakStreak;
          finalStatus = "frozen";
          finalLabel = `Frozen [ ${3 - daysSinceLastActive} day(s) left ]`;
      } 
      else {
        // CONTEXT: DAY 3+: DECAYING
        // Formula: Peak Streak deduction (days missed - 2 grace days)
          const decayAmount = daysSinceLastActive - 2;
          finalCount = Math.max(0, peakStreak - decayAmount);
          
          if (finalCount > 0) {
            finalStatus = "decaying";
            finalLabel = `Decaying [ -${decayAmount} penalty ]`;
          } else {
            finalStatus = "pending";
            finalLabel = "Streak lost. Start over?";
          }
        }
    }

    // 3. Apply Today's Progress Boost
    if (newMaxProgress === 100) {
      // If they were decaying or frozen, hitting 100% brings them back to full + 1
      // If they were at 0, they start at 1.
      setStreakData({
        count: finalCount + 1,
        status: "active",
        label: "Active Today",
      });
    } else {
      // Show the "Frozen" or "Decaying" state while they work on today's goals
      setStreakData({
        count: finalCount,
        status: finalStatus,
        label: finalLabel,
      });
    }

    
  }, [
    timeFocused,
    missions,
    isLoadingData,
    hasRewarded,
    dailyProgress,
    pastActiveDays,
  ]);

  // Mission Handler
  const handleToggle = async (id: string, done: boolean) => {
    const isCompleting = !done;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid, "missions", id), {
      done: isCompleting,
      updatedAt: serverTimestamp(),
    });

    if (isCompleting) {
      // future audio
    }
  };

  const handleArchive = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "missions", id), {
      archived: true,
      archivedAt: serverTimestamp(),
    });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, taskId: id });
  };

  const allExistingTags = missions
    .map((m) => m.tag)
    .filter((tag) => tag !== undefined && tag !== "");

  return (
    <>
      {/* CONTEXT: New Day/Motivation Modal */}
      {showNewDayModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="p-8 rounded-4xl shadow-2xl w-[90%] max-w-md relative bg-background">
            <Button
              onClick={() => setShowNewDayModal(false)}
              className="bg-transparent absolute top-6 right-6"
            >
              <X className="h-5 w-5"></X>
            </Button>

            <h2 className="text-2xl font-black mb-2 tracking-tight">
              New Day.
            </h2>
            <p className="text-sm mb-6">
              Until midnight to protect your streak. What's the goal?
            </p>
            <Button
              onClick={() => setShowNewDayModal(false)}
              className="hover:cursor-pointer w-full h-12 rounded-xl font-bold"
            >
              Let's Do It!
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col pt-2 pb-2">
          <h1 className={`text-9xl mx-auto text-center select-none font-font1`}>
            Hello, {profileName || user?.displayName || "User"}.
          </h1>
          <p className="text-xs text-brand-highlight font-medium tracking-wide uppercase mt-1 mx-auto">
            Next streak check-in:{" "}
            <span className="tabular-nums">{timeToMidnight}</span>
          </p>
        </div>

        {/* CONTEXT: Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex justify-between">
                Daily Streak{" "}
                {isLoadingData && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2">
                {streakData.status === "active" && (
                  <Flame className="h-5 w-5 text-brand-highlight-d-1" />
                )}
                {streakData.status === "frozen" && (
                  <Snowflake className="h-5 w-5-d-2" />
                )}
                {streakData.status === "decaying" && (
                  <TrendingDown className="h-5 w-5 text-brand-highlight-d-3" />
                )}
                <span
                  className={cn(
                    "text-2xl font-bold",
                    streakData.status === "frozen" && "text-brand-highlight",
                    streakData.status === "decaying" &&
                      "text-brand-highlight-d-3",
                  )}
                >
                  {isLoadingData ? "--" : streakData.count}
                </span>
              </div>
              <p className="text-xs text-brand-highlight mt-1 font-medium">
                {streakData.label}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">
                Time Focused
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                <span className="text-2xl font-bold tabular-nums">
                  {isLoadingData
                    ? "--"
                    : `${timeFocused.hours}h ${timeFocused.minutes}m ${timeFocused.seconds}s`}
                </span>
              </div>
              <p className="text-xs text-brand-highlight mt-1 font-medium">
                From Sprints Today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CONTEXT: Daily Momentum */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChartLine className="h-5 w-5 text-brand" />
              Daily Momentum
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-xs text-brand-highlight font-medium">
                  {dailyProgress === 100
                    ? "All milestones reached today!"
                    : "Goal: 10+ min focus & 2 completed missions"}
                </p>
                <span className="text-sm font-bold">{dailyProgress}%</span>
              </div>
              <Progress value={dailyProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* CONTEXT: Missions Card Session */}
        <Card>
          <CardHeader className="pb-3 border-b border-brand-highlight flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand" />
              Current Missions
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 px-2">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {missions.map((task) => (
                  <MissionCard
                    key={task.id}
                    task={task}
                    isPast={false}
                    isArchiveView={false}
                    onToggle={handleToggle}
                    onArchive={handleArchive}
                    onDelete={async (id) => {
                      if (user)
                        await deleteDoc(
                          doc(db, "users", user.uid, "missions", id),
                        );
                    }}
                    onRestore={() => {}}
                    onEdit={(t) => {
                      setTaskToEdit(t);
                      setIsModalOpen(true);
                    }}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </AnimatePresence>
              {missions.length === 0 && !isLoadingData && (
                <p className="text-center py-6 text-sm text-brand-highlight italic">
                  No missions today. Click "+" to start.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CONTEXT: Modal for Creation/Update of Mission */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        initialData={taskToEdit}
        existingTags={allExistingTags}
        onSave={async (text, tag, color) => {
          if (!user) return;
          if (taskToEdit) {
            await updateDoc(
              doc(db, "users", user.uid, "missions", taskToEdit.id),
              { text, tag, color, updatedAt: serverTimestamp() },
            );
          } else {
            await addDoc(collection(db, "users", user.uid, "missions"), {
              text,
              tag,
              color,
              date: todayStr,
              done: false,
              archived: false,
              createdAt: serverTimestamp(),
            });
          }
        }}
      />
    </>
  );
}
