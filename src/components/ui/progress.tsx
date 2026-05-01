"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number;
  className?: string;
}

const Progress = ({ value, className }: ProgressProps) => (
  <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800", className)}>
    <div 
      className="h-full w-full flex-1 bg-brand transition-all dark:bg-zinc-50" 
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }} 
    />
  </div>
);

export { Progress }