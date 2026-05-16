// --- NEXT.JS ---
"use client";
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
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn, getDisplayDate } from "@/lib/utils";
import { MissionContextMenu } from "@/components/context-menu/mission-context-menu";
// --- INTERFACE ---
import * as Missions from "@/lib/data";
import { useMissions } from "@/hooks/use-missions";

export default function MissionPage() {
  
  const { tasks, actions, ui, dateState, filters, allTags, allExistingTags} = useMissions();
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative max-w-2xl mx-auto pt-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!dateState.isArchiveView && (
              <div className="flex items-center rounded-full p-1">
                <button
                  onClick={() =>
                    dateState.setViewDate(
                      new Date(dateState.viewDate.setDate(dateState.viewDate.getDate() - 1)),
                    )
                  }
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold px-4 select-none min-w-[140px] text-center">
                  {getDisplayDate(dateState.viewDate)}
                </span>
                <button
                  onClick={() =>
                    dateState.setViewDate(
                      new Date(dateState.viewDate.setDate(dateState.viewDate.getDate() + 1)),
                    )
                  }
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {dateState.isArchiveView && (
              <h2 className="text-xl font-bold text-red-500">
                Recently Deleted
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                dateState.setIsArchiveView(!dateState.isArchiveView);
                filters.setFilterTag(null);
                filters.setFilterColor(null);
              }}
              size="icon"
              variant="outline"
              className="rounded-full w-9 h-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {!dateState.isPast && !dateState.isArchiveView && (
              <Button
                onClick={() => {
                  ui.setTaskToEdit(null);
                  ui.setIsModalOpen(true);
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
        {!dateState.isArchiveView && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-highlight select-none">
              Filters:
            </span>

            {/* CONTEXT: Filter by name */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant={filters.filterTag ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 transition select-none"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {filters.filterTag || "Tag Name"}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => filters.setFilterTag(null)}>
                  All Names
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {allTags.map((tag) => (
                  <DropdownMenuItem key={tag} onClick={() => filters.setFilterTag(tag)}>
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CONTEXT: Filter by color */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant={filters.filterColor ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 transition select-none"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {Missions.getColorLabel(filters.filterColor)}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => filters.setFilterColor(null)}>
                  All Colors
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Missions.getColorKeys().map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => filters.setFilterColor(c)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full border border-zinc-300",
                        Missions.getColorBg(c)
                      )}
                    />
                    {Missions.getColorLabel(c)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CONTEXT: Clear Filters */}
            {(filters.filterTag || filters.filterColor) && (
              <button
                onClick={() => {
                  filters.setFilterTag(null);
                  filters.setFilterColor(null);
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
          {tasks.map((task) => (
            <MissionCard
              key={task.id}
              task={task}
              isPast={dateState.isPast}
              isArchiveView={dateState.isArchiveView}
              onToggle={actions.toggleTask}
              onArchive={actions.archiveTask}
              onDelete={actions.deleteTask}
              onRestore={actions.restoreTask}
              onEdit={(t) => {
                ui.setTaskToEdit(t);
                ui.setIsModalOpen(true);
              }}
              onContextMenu={ui.handleContextMenu}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="text-center py-12 text-brand-highlight text-sm">
            {dateState.isArchiveView ? "Trash is empty." : "No missions for today."}
          </div>
        )}
      </div>

      {/* CONTEXT: Right click for Context Menu */}
      <MissionContextMenu 
        ui={ui} 
        actions={actions} 
        allTags={allTags} 
        tasks={tasks}
        isArchiveView={dateState.isArchiveView} 
      />

      <TaskModal
        isOpen={ui.isModalOpen}
        onClose={() => {
          ui.setIsModalOpen(false);
          ui.setTaskToEdit(null);
        }}
        onSave={actions.addOrEditTask}
        initialData={ui.taskToEdit}
        existingTags={allExistingTags}
      />
    </div>
  );
}