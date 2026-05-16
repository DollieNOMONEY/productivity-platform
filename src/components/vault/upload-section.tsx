import React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "../ui/button";
import { ChevronsUpDown, UploadCloud } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { VaultHookReturn, useVault } from "@/hooks/use-vault";

export default function UploadSection({ vault }: { readonly vault: VaultHookReturn }) {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isProcessing,
    isReadyToCommit,
  } = useVault();

  return (
    <Collapsible>
      <div className="flex items-center justify-between gap-4 px-4">
        <h4 className="text-sm font-semibold">Upload Files</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronsUpDown />
            <span className="sr-only">Toggle details</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {!isProcessing && !isReadyToCommit && (
          <Card className="border-2 shadow-sm">
            <CardContent className="p-0">
              <div
                {...getRootProps()}
                className={`
                    relative cursor-pointer rounded-xl border-2 border-dashed m-6 p-16 
                    transition-all duration-200 ease-in-out flex flex-col items-center justify-center
                    ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/30 hover:border-primary/50"}
                  `}
              >
                <input {...getInputProps()} />
                <div className="p-4 rounded-full bg-secondary mb-4">
                  <UploadCloud
                    className={`w-10 h-10 ${isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"}`}
                  />
                </div>
                <p className="text-xl font-medium mb-1">
                  {isDragActive ? "DROP TO UPLOAD" : "DRAG FILES HERE"}
                </p>
                <p className="text-sm text-muted-foreground">Tap to browse</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
