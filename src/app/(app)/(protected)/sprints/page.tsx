// -- NEXT.JS --
"use client";
import { useState, useEffect } from "react";
// -- FIREBASE --
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
// -- SHAD.CN UI COMPONENTS & ICONS --
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Plus,
  Minus,
  History,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { useSprint } from "@/lib/SprintContext";

const adjustTime = (current: string | number, delta: number) => {
  const parsed =
    typeof current === "string" ? Number.parseInt(current) : current;
  const value = (parsed || 0) + delta;
  return Math.max(0, value).toString(); // Return as string for consistency
};
const adjustSecs = (current: string | number, delta: number) => {
  const parsed = Number(current) || 0;
  const value = (parsed + delta + 60) % 60; // CONTEXT: E.G: -1 becomes 59
  return value.toString().padStart(2, "0"); // CONTEXT: Adding padStart so it looks like "01" instead of "1"
};

export default function TimerPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(5);

  // CONTEXT: Pull the variables from the Sprint Context
  const {
    mins,
    setMins,
    secs,
    setSecs,
    isCreated,
    showWarning,
    setShowWarning,
    timeLeft,
    isActive,
    visualProgress,
    holdProgress,
    showAbortPrompt,
    handleAbortLog,
    startHoldAbort,
    clearHold,
    handleCreateRequest,
    confirmCreation,
    togglePause,
    formatTime,
  } = useSprint();

  // CONTEXT: Fetch History
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "sessions"),
      where("uid", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsubHistory = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubHistory();
  }, []);

  // CONTEXT: SVG Math For TIMER
  const radius = 115;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - visualProgress);
  const abortStrokeWidth = holdProgress * radius;
  const abortRadius = radius - abortStrokeWidth / 2;

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 xl:flex pb-24 md:pb-0 h-screen">
        {/* CONTEXT: SIDEBAR */}
        <aside
          className={cn(
            "flex flex-col xl:w-80 h-dvh z-30 shrink-0",
            isCreated ? "hidden" : "flex",
          )}
        >
          <div className="p-8 space-y-8">
            {isCreated ? (
              <div className="p-8 rounded-4xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-3">
                <Lock className="h-5 w-5 text-zinc-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Commitment Locked
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-brand-highlight tracking-widest ml-1 select-none">
                    Configure Duration
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 flex flex-col items-center gap-1 shadow-sm focus-within:ring-2 ring-zinc-200 dark:ring-zinc-800 transition-all">
                      <span className="text-xs text-brand-highlight font-bold uppercase select-none">
                        Mins
                      </span>
                      <input
                        type="number"
                        value={mins}
                        onChange={(e) => setMins(e.target.value)}
                        onBlur={() =>
                          setMins(
                            Math.max(0, Number.parseInt(mins as string) || 0),
                          )
                        }
                        className="text-2xl font-black tracking-tighter bg-transparent w-full text-center outline-none"
                      />
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setMins(() => adjustTime(mins, -1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setMins(() => adjustTime(mins, +1))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 flex flex-col items-center gap-1 shadow-sm focus-within:ring-2 ring-zinc-200 dark:ring-zinc-800 transition-all">
                      <span className="text-xs text-zinc-400 font-bold uppercase select-none">
                        Secs
                      </span>
                      <input
                        type="number"
                        value={secs}
                        onChange={(e) => setSecs(e.target.value)}
                        onBlur={() =>
                          setSecs(
                            Math.max(0, Number.parseInt(secs as string) || 0) %
                              60,
                          )
                        }
                        className="text-2xl font-black tracking-tighter bg-transparent w-full text-center outline-none"
                      />
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setSecs(() => adjustSecs(secs, -1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setSecs(() => adjustSecs(secs, 1))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCreateRequest}
                  className="bg-brand select-none w-full h-14 rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:translate-y-0.5 transition-all"
                >
                  Create Session
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col px-8 pb-8 overflow-hidden">
            <button
              onClick={() => setIsLogsExpanded(!isLogsExpanded)}
              className="flex items-center justify-between mb-4 w-full group py-2"
            >
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors select-none">
                Log History
              </h2>
              {isLogsExpanded ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <History className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isLogsExpanded && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                {history.slice(0, visibleLogsCount).map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group hover:border-zinc-300 transition-all"
                  >
                    <div>
                      <p
                        className={cn(
                          "text-sm font-black tracking-tight",
                          s.status === "failed" && "text-zinc-500",
                        )}
                      >
                        {Math.floor(s.duration / 60)}m {s.duration % 60}s
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                        {new Date(
                          s.createdAt.seconds * 1000,
                        ).toLocaleDateString()}{" "}
                        {s.status === "failed" && `• ${s.reason}`}
                      </p>
                    </div>
                    {s.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                    )}
                  </div>
                ))}

                {history.length > visibleLogsCount && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    onClick={() => setVisibleLogsCount((c) => c + 5)}
                  >
                    Load More Logs
                  </Button>
                )}
                {history.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-4">
                    No sprints logged yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

        <main
          className={cn(
            "hidden md:flex w-full lg:max-w-[700px] mx-auto relative dark:bg-zinc-950 overflow-hidden select-none",
            isCreated ? "flex" : "hidden",
          )}
        >
          {/*CONTEXT: THE MAIN TIMER */}
          <label
            className={cn(
              "mx-auto relative block transition-all duration-1000 ease-in-out cursor-pointer",
              !isCreated && "opacity-5 grayscale scale-90",
            )}
            onPointerDown={startHoldAbort}
            onPointerUp={clearHold}
            onPointerLeave={clearHold}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="relative w-full h-full">
              <div
                className="absolute w-[89.84%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square rounded-full bg-brand-highlight transition-opacity duration-75 scale-110 -z-10"
                style={{
                  opacity: holdProgress > 0 ? (holdProgress / 100) * 0.5 : 0,
                }}
              />

              <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r="115"
                  strokeWidth="1"
                  className="stroke-zinc-100 dark:stroke-zinc-900"
                  fill="transparent"
                />
                {/*CONTEXT: Spinning Progress Line */}
                <circle
                  cx="128"
                  cy="128"
                  r="115"
                  strokeWidth="2"
                  className="stroke-zinc-900 dark:stroke-zinc-100"
                  fill="transparent"
                  strokeDasharray={circumference}
                  /*CONTEXT: 
                    Counter-Clockwise Math:
                    As visualProgress goes 1 -> 0, offset goes 0 -> circumference.
                    Combined with -rotate-90 on the parent, this drains CCW from the top.
                  */
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
                {/* CONTEXT: Conditional Inward Abort Fill */}
                {holdProgress > 0 && (
                  <circle
                    cx="128"
                    cy="128"
                    r={abortRadius}
                    strokeWidth={abortStrokeWidth}
                    className="stroke-zinc-200/50 dark:stroke-zinc-800/50"
                    fill="transparent"
                  />
                )}
              </svg>
            </div>
            {/* CONTEXT: Hold Progress Indicator */}

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 pointer-events-none z-10">
              <div className="flex flex-col items-center">
                <span className="select-none text-[35vw] md:text-[10rem] font-black tracking-tighter leading-none tabular-nums">
                  {formatTime(timeLeft)}
                </span>
                <div className="h-6 mt-4">
                  {isCreated && (
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-[1em] transition-colors duration-300 z-50",
                        holdProgress > 0
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-400 dark:text-zinc-500 animate-pulse",
                      )}
                    >
                      {holdProgress > 0 ? "Holding to Abort..." : "Session Set"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-10 items-center pointer-events-auto">
                <button
                  disabled={!isCreated}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePause();
                  }}
                  className="h-20 w-20 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-center hover:scale-105 transition-all active:scale-95 disabled:opacity-20 text-zinc-900 dark:text-zinc-100"
                >
                  {isActive ? (
                    <Pause className="h-8 w-8 fill-current" />
                  ) : (
                    <Play className="h-8 w-8 ml-1 fill-current" />
                  )}
                </button>
              </div>
            </div>
          </label>
        </main>
      </div>

      {/* CONTEXT: Warning Backdrop */}
      {showWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-[320px] p-10 rounded-[3rem] border border-brand-highlight shadow-2xl space-y-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-brand flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-8 w-8 text-brand-text" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tighter uppercase ">
                Are you sure?
              </h3>
              <p className="text-[11px] text-brand-highlight leading-relaxed">
                Editing and Deleting is disabled.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full h-14 rounded-3xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-black uppercase text-[10px] tracking-[0.2em]"
                onClick={confirmCreation}
              >
                START SPRINT
              </Button>
              <Button
                variant="ghost"
                className="w-full text-zinc-400 font-bold text-xs rounded-3xl"
                onClick={() => setShowWarning(false)}
              >
                Abort
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT: Abort Prompt Backdrop */}
      {showAbortPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center  backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-[320px] p-10 rounded-[3rem] border border-brand-highlight shadow-2xl space-y-8 text-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tighter uppercase">
                Sprint Broken
              </h3>
              <p className="text-[11px]  tracking-tight leading-relaxed">
                Log the interruption to learn from it.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full h-14 rounded-3xl border-zinc-200 dark:border-zinc-800 font-bold text-xs"
                onClick={() => handleAbortLog("Interrupted by phone")}
              >
                Interrupted by phone?
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 rounded-3xl border-zinc-200 dark:border-zinc-800 font-bold text-xs"
                onClick={() => handleAbortLog("Too distracted")}
              >
                Too distracted?
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 rounded-3xl border-zinc-200 dark:border-zinc-800 font-bold text-xs"
                onClick={() => handleAbortLog("Too distracted")}
              >
                Was it a mistake?
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}