"use client"
import { useVault } from "@/hooks/use-vault";
import UploadSection from "@/components/vault/upload-section";
import SwipeSorter from "@/components/vault/swipe-sorter";
import FullScreenViewer from "@/components/vault/full-screen-viewer";
import CommitSection from "@/components/vault/commit-section";
import GallerySection from "@/components/vault/gallery-section";

export default function VaultPage() {
  const vault = useVault();
  
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 overflow-hidden space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
     
      {!vault.isReadyToCommit && !vault.isProcessing && (
        <UploadSection vault={vault} />
      )}

      {/* CONTEXT: Swiping Interface */}
      {vault.isProcessing && <SwipeSorter vault={vault} />}

      {/* CONTEXT: Final Commit Card */}
      {vault.isReadyToCommit && <CommitSection vault={vault} />}

      {/* CONTEXT: Main Gallery */}
      {!vault.isProcessing && !vault.isReadyToCommit && (
        <div>
          <GallerySection vault={vault} />

          {/* CONTEXT: Full Screen Overlay */}
          <FullScreenViewer 
            item={vault.selectedItem}
            currentPath={vault.currentPath}
            onClose={() => vault.setSelectedItem(null)} 
            onUpdateSubject={vault.updateItemSubject}
          />
        </div>
      )}
      
    </div>
  );
}
