"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/data";
import { toast } from "sonner";

export type TaskColor = "neutral" | "alert" | "focus" | "flow";
interface Task {
  text: string;
  tag: string;
  color: TaskColor;
}

export const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingTags,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, tag: string, color: TaskColor) => void;
  initialData?: Task | null;
  existingTags: string[];
}) => {
  const placeholders = [
    "Keep Dogs Away",
    "Take Notes",
    "Do your Homework",
    "Study",
  ];

  const [randomPlaceholder, setRandomPlaceholder] = useState("");
  const [taskText, setTaskText] = useState("");
  const [taskTag, setTaskTag] = useState("");
  const [taskColor, setTaskColor] = useState<
    "neutral" | "alert" | "focus" | "flow"
  >("neutral");

  useEffect(() => {
    if (isOpen) {
      setRandomPlaceholder(
        placeholders[Math.floor(Math.random() * placeholders.length)],
      );
      setTaskText(initialData?.text || "");
      setTaskTag(initialData?.tag || "");
      setTaskColor(initialData?.color || "neutral");
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    const trimmedTag = taskTag.trim();

    const isDuplicate = existingTags.some(
      (tag) => tag.toLowerCase() === trimmedTag.toLowerCase() && trimmedTag !== initialData?.tag
    );

    if (trimmedTag !== "" && isDuplicate) {
      toast.error("Conflict", {
        description: `The tag "${trimmedTag}" already exists.`,
        position: "top-center",
      });
      return;
    }

    const finalText =
      taskText.trim() === ""
        ? initialData?.text || randomPlaceholder
        : taskText;
    onSave(finalText, taskTag.trim(), taskColor);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-3xl animate-in fade-in duration-300">
      <button className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-7xl px-6 text-center">
        <span className="text-[10px] uppercase tracking-[0.5em] text-brand mb-8 block select-none">
          {initialData ? "Editing Mission" : "Creating Your Mission"}
        </span>

        <input
          autoFocus
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder={randomPlaceholder}
          className="select-none w-full bg-transparent text-6xl md:text-8xl font-thin text-center outline-none border-none placeholder:text-brand-highlight"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter") handleSave();
          }}
        />

        <input
          value={taskTag}
          onChange={(e) => setTaskTag(e.target.value)}
          placeholder="Optional tag (time, date, etc.)"
          className="select-none w-full mt-6 bg-transparent text-xl md:text-2xl font-light text-center outline-none border-none placeholder:text-brand-highlight"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <div className="mt-8 flex justify-center gap-3 select-none">
          {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map(
            (colorKey) => (
              <button
                key={colorKey}
                onClick={() => setTaskColor(colorKey as any)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium transition-all",
                  taskColor === colorKey
                    ? "ring-2 ring-zinc-900 dark:ring-white scale-110"
                    : "opacity-50 hover:opacity-100",
                  COLORS[colorKey].bg,
                  COLORS[colorKey].text,
                )}
              >
                {COLORS[colorKey].label}
              </button>
            ),
          )}
        </div>

        <div className="mt-12 flex justify-center gap-8">
          <button
            onClick={onClose}
            className="text-brand-highlight hover:text-brand-highlight/62 transition-colors select-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 text-white rounded-full text-sm hover:bg-zinc-800 transition-colors select-none"
          >
            {initialData ? "Save Changes" : "Add to List"}
          </button>
        </div>
      </div>
    </div>
  );
};
