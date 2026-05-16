import React from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle2 } from "lucide-react";
import { VaultHookReturn, useVault } from "@/hooks/use-vault";

export default function CommitSection({ vault }: { readonly vault: VaultHookReturn }) {
  const { setAssets, setCurrentIndex, assets, isUploading, commitToVault } =
    useVault();

  return (
    <Card className="border-2 shadow-lg animate-in fade-in">
      <CardHeader className="text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
        <CardTitle className="text-2xl">Processing Complete</CardTitle>
        <CardDescription className="mb-4">
          {assets.length} file(s) categorized & ready for database
          synchronization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="ghost"
          className="w-full h-14 text-lg font-bold bg-brand text-white rounded-l-full"
          onClick={commitToVault}
          disabled={isUploading}
        >
          {isUploading ? "SYNCING TO DATABASE..." : "UPLOAD TO VAULT"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setAssets([]);
            setCurrentIndex(0);
          }}
        >
          Cancel & Start Over
        </Button>
      </CardContent>
    </Card>
  );
}
