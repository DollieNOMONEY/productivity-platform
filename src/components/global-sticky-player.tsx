"use client";
import { usePathname } from "next/navigation";
import { useSprint } from "@/lib/SprintContext";
import { Timer as TimerIcon, Play, Pause, Maximize2 } from "lucide-react";
import Link from "next/link";

export default function GlobalStickyPlayer() {
  const {
    isCreated,
    visualProgress,
    timeLeft,
    formatTime,
    togglePause,
    isActive,
  } = useSprint();
  const pathname = usePathname();

  if (!isCreated) return null;

  const bottomClass =
    pathname === "/" ? "md:left-0 md:w-full" : "md:left-72 md:w-auto";

  return (
    <div
      className={`bg-background fixed ${bottomClass} bottom-16 md:bottom-0 left-0 right-0 h-16 border-t border-brand-text z-100 flex items-center justify-between px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)]`}
    >
      <div
        className="absolute top-0 left-0 h-0.5 bg-brand transition-all duration-75"
        style={{ width: `${visualProgress * 100}%` }}
      />

      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-90 flex items-center justify-center">
          <TimerIcon className="h-4 w-4 text-brand-highlight" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black tracking-tight uppercase">
            Active Sprint
          </span>
          <span className="text-[10px] font-bold text-brand-highlight">
            {formatTime(timeLeft)} remaining
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePause}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          {isActive ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 ml-0.5 fill-current" />
          )}
        </button>
        <Link
          href="/sprints"
          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
