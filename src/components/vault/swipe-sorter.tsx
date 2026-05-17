import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Brain, ArrowUp, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_SUBJECTS, SWIPE_ANIMATIONS } from "@/lib/data";
import { VaultHookReturn } from "@/hooks/use-vault";

export default function SwipeSorter({ vault }: { readonly vault: VaultHookReturn }) {
  const { activeSubject, assets, currentIndex, setActiveSubject, handleSort } = vault;
  
  if (!assets || assets.length === 0) return <div>No assets found in vault prop</div>;
  if (!assets[currentIndex]) return <div>Current index {currentIndex} is out of bounds</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center text-sm font-mono font-bold text-muted-foreground">
        <span>
          PROCESSING: {currentIndex + 1} / {assets.length}
        </span>
        <span className="truncate max-w-[150px]">
          {assets[currentIndex].file.name}
        </span>
      </div>

      <Card className="border-2 shadow-sm max-w-md mx-auto lg:max-w-2xl">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Current Subject
            </h3>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SUBJECTS.map((sub) => (
                <Badge
                  key={sub}
                  variant={activeSubject === sub ? "default" : "secondary"}
                  className="cursor-pointer text-sm py-1.5 px-3 transition-colors"
                  onClick={() => setActiveSubject(sub)}
                >
                  {sub}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONTEXT: Swipe card container */}
      <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        {/* CONTEXT: BG hint layer */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="flex flex-col items-center gap-8">
            <span className="flex items-center gap-2">
              <ArrowUp /> Formula
            </span>
            <div className="flex gap-24">
              <span className="flex items-center gap-2">
                <ArrowLeft /> Paper
              </span>
              <span className="flex items-center gap-2">
                Notes <ArrowRight />
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            dragElastic={1}
            exit={{
              // CONTEXT: Look up the category in map, fallback to default if it is null
              ...(SWIPE_ANIMATIONS[
                assets[currentIndex].category as keyof typeof SWIPE_ANIMATIONS
              ] || SWIPE_ANIMATIONS.default),
              opacity: 0,
              transition: { duration: 0.3 },
            }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={(e, { offset }) => {
              const threshold = 100;
              if (offset.y < -threshold) handleSort("formula");
              else if (offset.x > threshold) handleSort("whiteboard");
              else if (offset.x < -threshold) handleSort("past_paper");
            }}
            // CONTEXT: The container wraps BOTH the image and the outside labels
            className="relative cursor-grab active:cursor-grabbing group"
          >
            {/* CONTEXT: Formula (Guide: Above the image) */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 md:-top-14">
              <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 md:scale-100">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
                <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                  Formula
                </span>
              </div>
            </div>

            {/* CONTEXT: Notes (Guide: to the Right - Inside on mobile, outside on Desktop) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 xl:-right-40 z-20">
              <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 xl:scale-100">
                <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                  Notes
                </span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
              </div>
            </div>

            {/* CONTEXT: Exams (Guide: to the Left - Inside on mobile, outside on Desktop) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 xl:-left-40 z-20">
              <div className="bg-[#1b1b1bd0] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full flex items-center gap-2 shadow-2xl border-2 border-white/20 backdrop-blur-sm scale-90 xl:scale-100">
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-blue-400 stroke-[2.5px]" />
                <span className="font-bold text-[10px] md:text-sm tracking-wide uppercase">
                  Exams
                </span>
              </div>
            </div>

            {/* CONTEXT: Image Card Preview */}
            <Card className="w-full h-auto max-h-[70vh] overflow-hidden shadow-2xl border-2 bg-black/20 backdrop-blur-md flex items-center justify-center">
              {assets[currentIndex].previewUrl ? (
                <img
                  src={assets[currentIndex].previewUrl}
                  alt="preview"
                  draggable="false"
                  className="w-full h-full object-contain max-h-[70vh] select-none"
                />
              ) : (
                <div className="p-20 flex flex-col items-center gap-4">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                  <span className="text-xs font-mono">PDF</span>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
