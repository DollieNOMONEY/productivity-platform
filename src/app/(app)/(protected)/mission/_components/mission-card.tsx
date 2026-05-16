"use client";
import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Missions from "@/lib/data";
import { useRef, useState } from "react";

interface MissionCardProps {
  task: Missions.MISSIONPLACEHOLDER;
  isPast: boolean;
  isArchiveView: boolean;
  onToggle: (id: string, currentStatus: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onEdit: (task: Missions.MISSIONPLACEHOLDER) => void;
  onContextMenu: (e: any, id: string) => void;
}

export function MissionCard({
  task,
  isPast,
  isArchiveView,
  onToggle,
  onArchive,
  onDelete,
  onRestore,
  onEdit,
  onContextMenu,
}: Readonly<MissionCardProps>) {
  // CONTEXT: State for the press animation
  const [isPressing, setIsPressing] = useState(false);
  const cardTimer = useRef<NodeJS.Timeout | null>(null);

  const clearCardTimer = () => {
    setIsPressing(false);
    if (cardTimer.current) clearTimeout(cardTimer.current);
  };

  const handleCardPointerDown = (e: React.PointerEvent) => {
    if (isPast) return;

    // CONTEXT: Ignore right-clicks on PC because it is already handled from page.tsx
    if (e.button === 2) return;

    setIsPressing(true);

    // CONTEXT: Capture coords immediately since React clears event properties asynchronously.
    const pageX = e.pageX;
    const pageY = e.pageY;

    cardTimer.current = setTimeout(() => {
      setIsPressing(false); // Reset scaling animation

      // CONTEXT: Pass a mock event object to your page.tsx handler (pageX, pageY)
      // It tricks it into opening right under the user's finger
      onContextMenu(
        {
          preventDefault: () => {},
          pageX,
          pageY,
        } as any,
        task.id,
      );

      if (globalThis.navigator.vibrate) globalThis.navigator.vibrate(50);
    }, 500); // CONTEXT: 500ms hold time for mobile
  };

  const toogleStyle = cn(
    "h-5 w-5 rounded border flex shrink-0 items-center justify-center transition-colors",
    // CONTEXT: Not done
    !task.done && "border-zinc-300 bg-transparent",
    // CONTEXT: Done and in the past
    task.done && isPast && "bg-zinc-400 border-zinc-400",
    // CONTEXT: Done and current/future
    task.done && !isPast && "bg-zinc-900 border-zinc-900",
  );

  return (
    <div className="relative rounded-l-full overflow-hidden">
      {/* CONTEXT: BG Actions */}
      {!isPast && (
        <div className="absolute inset-0 flex items-center justify-between px-6 bg-zinc-100 dark:bg-zinc-900 rounded-l-full pointer-events-none">
          <span className="text-xs font-bold uppercase tracking-wider text-green-600">
            {isArchiveView ? "Restore" : "Edit"}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            {isArchiveView ? "Delete" : "Archive"}
          </span>
        </div>
      )}

      <motion.div
        // CONTEXT: Shrinks slight when holding
        animate={{ scale: isPressing ? 0.96 : 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        drag={isPast ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => {
          clearCardTimer(); // CONTEXT: Cancel long press if they start swiping
        }}
        onDragEnd={(_, info) => {
          if (isPast) return;
          if (info.offset.x > 250)
            isArchiveView ? onRestore(task.id) : onEdit(task);
          else if (info.offset.x < -250)
            isArchiveView ? onDelete(task.id) : onArchive(task.id);
        }}
        // CONTEXT: Pointer events to manage long press lifecycle
        onPointerDown={handleCardPointerDown}
        onPointerUp={clearCardTimer}
        onPointerLeave={clearCardTimer}
        onPointerCancel={clearCardTimer}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, task.id); // Desktop right-click
        }}
        // 4. CONTEXT: Stops safari's default magnifying glass / text select
        style={{ WebkitTouchCallout: "none" }}
        className={cn(
          "relative z-10 flex w-full items-center justify-between p-4 rounded-l-full border",
          "touch-pan-y",
          task.done ? "bg-brand" : "bg-background shadow-sm",
          isPast
            ? "bg-gray-50 cursor-default opacity-80"
            : "cursor-grab active:cursor-grabbing",
          "select-none transition-colors",
        )}
      >
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => !isPast && onToggle(task.id, task.done)}
            disabled={isPast}
            // CONTEXT: Stop propagation so clicking checkbox doesn't trigger card hold animation ABOVE
            onPointerDown={(e) => e.stopPropagation()}
            className={toogleStyle}
          >
            {task.done && (
              <CheckSquare className="h-3.5 w-3.5 text-white" />
            )}
          </button>
          <span
            className={cn(
              "text-sm font-medium",
              task.done && "line-through text-brand-text",
              isPast && "text-zinc-500",
            )}
          >
            {task.text}
          </span>
        </div>

        {task.tag && (
          <div
            // CONTEXT: Stopping propagation so touching tag doesn't trigger the main card hold
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "text-[10px] h-6 px-2 shrink-0 flex items-center rounded-md font-medium",
              Missions.COLORS[task.color]?.bg || Missions.COLORS.reference.bg,
              Missions.COLORS[task.color]?.text || Missions.COLORS.reference.text,
              !isPast &&
                "cursor-pointer hover:opacity-80 transition-opacity active:scale-95",
            )}
          >
            {task.tag}
          </div>
        )}
      </motion.div>
    </div>
  );
}