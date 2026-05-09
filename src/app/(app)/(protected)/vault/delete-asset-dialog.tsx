"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteProps {
  readonly id: string;
  readonly url: string;
  readonly onDelete: (id: string, url: string) => Promise<void>;
}

export function DeleteAssetLoader({ id, url, onDelete }: DeleteProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-background p-2 hover:text-red-600 transition-all cursor-pointer bg-transparent border-none outline-none hover:opacity-80"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="">
        <AlertDialogHeader>
          <AlertDialogTitle className="uppercase tracking-widest text-sm">
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            This file will be deleted permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>

          {/* CONTEXT: Ensure this is the ONLY actual button that runs the logic */}
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation(); // CONTEXT: Preventing clicking underneath
              onDelete(id, url);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
