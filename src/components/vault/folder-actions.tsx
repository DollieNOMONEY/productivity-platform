"use client"

import React, { useState } from "react"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog" // Adjust this path to where your code is saved
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderPlus } from "lucide-react"

export function CreateFolderDialog({ 
  currentPath, 
  onCreateFolder
}: { 
  readonly currentPath: string;
  readonly onCreateFolder: (name: string) => void;
}) {
  const [folderName, setFolderName] = useState("")
  const [open, setOpen] = useState(false)

  const handleCreate = () => {
    if (!folderName) return

    onCreateFolder(folderName);
    
    setFolderName("")
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 font-black rounded-3xl uppercase border-white/20 hover:bg-white hover:text-black transition-all"
        >
          <FolderPlus className="w-4 h-4" /> New Folder
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="bg-background border-white/10 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-black text-2xl font-font1">
            Create Directory
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="py-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
            Folder Name
          </p>
          <Input
            placeholder="ENTER NAME..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="bg-muted/30 border-white/10 font-bold tracking-tight h-12 focus-visible:ring-white/20"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="font-bold border-white/10 uppercase">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCreate}
            className="font-black uppercase text-black hover:bg-white/90"
          >
            Create Folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}