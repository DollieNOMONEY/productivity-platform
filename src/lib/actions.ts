import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";

// CONTEXT: Moderation Actions for Forum Posts
export const moderatePost = async (
  postId: string,
  action: "archive" | "report" | "delete" | "restore",
  currentArchivedState?: boolean,
) => {
  const postRef = doc(db, "posts", postId);

  try {
    switch (action) {
      case "archive":
        await updateDoc(postRef, {
          isArchived: !currentArchivedState,
        });
        return { success: true, message: "Archive status toggled." };

      case "report":
        await updateDoc(postRef, {
          reports: increment(1),
        });
        return {
          success: true,
          message: "Reported to moderation.",
        };

      case "delete":
        await updateDoc(postRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
        });
        return { success: true, message: "Post removed from public." };

      case "restore":
        await updateDoc(postRef, {
          isDeleted: false,
          deletedAt: null,
        });
        return { success: true, message: "Post restored to public directory." };

      default:
        throw new Error("Invalid moderation action.");
    }
  } catch (error: any) {
    console.error("Moderation error:", error);
    return { success: false, message: error.message || "Action failed." };
  }
};
