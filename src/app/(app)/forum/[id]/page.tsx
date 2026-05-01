// --- NEXT.JS ---
"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
// --- FIREBASE ---
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  increment,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { moderatePost } from "@/lib/actions";
import { cn } from "@/lib/utils";
// --- SHADCN UI COMPONENTS & ICONS
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Archive,
  Trash2,
  Pencil,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: any;
  updatedAt?: any;
  isSolution?: boolean;
}

const formatEditTime = (timestamp: any) => {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "";
  }
};

interface UserDisplayProps {
  userId: string;
  fallbackData: { name: string; avatar: string };
  children: (userData: { name: string; avatar: string }) => React.ReactNode;
}

const UserDisplay = ({ userId, fallbackData, children }: UserDisplayProps) => {
  const [userData, setUserData] = useState(fallbackData);

  useEffect(() => {
    setUserData(fallbackData);
  }, [fallbackData.avatar, fallbackData.name]);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          setUserData({
            name: data.username || data.name || fallbackData.name,
            avatar: data.profilePictureUrl || data.avatar || data.photoURL || fallbackData.avatar,
          });
        }
      } catch (e) {
        console.error("Failed to fetch live user data:", e);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [userId, fallbackData.name, fallbackData.avatar]);

  return <>{children(userData)}</>;
};


export default function ForumThreadPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostCategory, setEditPostCategory] = useState("");
  const [editPostContent, setEditPostContent] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [dataLoading, setDataLoading] = useState(true);

  // CONTEXT: Auth & Admin Handler
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // CONTEXT: Fetch Post
  useEffect(() => {
    setDataLoading(true);
    const unsub = onSnapshot(doc(db, "posts", postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setDataLoading(false);
    });
    return () => unsub();
  }, [postId]);

  // CONTEXT: etch Comments
  useEffect(() => {
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snapshot) => {
      setComments(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment),
      );
    });
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const latestName =
        userDoc.data()?.username || currentUser.displayName || "Individual";

      await addDoc(collection(db, "posts", postId, "comments"), {
        userId: currentUser.uid,
        userName: latestName,
        userAvatar:
          currentUser.photoURL ||
          `/placeholder/profile_picture.jpg`,
        text: newComment,
        createdAt: serverTimestamp(),
        isSolution: false,
      });
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(1),
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePostEdit = async () => {
    if (!editPostContent.trim() || !editPostTitle.trim()) return;
    try {
      await updateDoc(doc(db, "posts", postId), {
        title: editPostTitle,
        category: editPostCategory,
        content: editPostContent,
        updatedAt: serverTimestamp(),
      });
      setIsEditingPost(false);
      toast.success("Post updated!", {
        position: "top-center",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await updateDoc(doc(db, "posts", postId, "comments", commentId), {
        text: editCommentText,
        updatedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Delete response?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(-1),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markSolution = async (commentId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId, "comments", commentId), {
        isSolution: true,
      });
      await updateDoc(doc(db, "posts", postId), { isResolved: true });
    } catch (err) {
      console.error(err);
    }
  };

  const undoSolution = async (commentId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId, "comments", commentId), {
        isSolution: false,
      });
      await updateDoc(doc(db, "posts", postId), { isResolved: false });
    } catch (err) {
      console.error(err);
    }
  };

  // CONTEXT: Moderation Handler
  const handleAction = async (
    action: "archive" | "report" | "delete" | "restore",
  ) => {
    if (action === "delete" && !confirm("Erase this post entirely?")) return;

    const result = await moderatePost(postId, action, post?.isArchived);
    if (result.success) {
      toast.success(result.message, {
        position: "top-center",
      });
      if (action === "delete" && !isAdmin) {
        router.push("/forum"); // CONTEXT: Only redirect if not admin, admins can still see the deleted post
      }
    } else {
      toast.error(result.message, {
        position: "top-center",
      });
    }
  };

  if (dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-centertext-center">
        <h2 className="text-xl font-bold gap-5">Not Found</h2>
        <p className="text-zinc-500 mb-12">
          This topic may have been permanently been removed.
        </p>
        <Link href="/forum">
          <Button>Back</Button>
        </Link>
      </div>
    );
  }

  const isAuthor = currentUser?.uid === post.userId;

  // CONTEXT: Security for Soft-deleted Posts
  if (post.isDeleted && !isAuthor && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold">Content Removed</h2>
        <p className="text-zinc-500 text-sm">
          This discussion has been taken down by moderators and is no longer
          available to the public.
        </p>
        <Link href="/forum">
          <Button variant="outline" className="mt-4">
            Return to Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto min-h-screen px-4 pt-8 pb-20 animate-in fade-in duration-500">
      {/* CONTEXT: Deleted posts are visible to admins/creators */}
      {post.isDeleted && (
        <div className="bg-red-50 border-red-200 border p-4 rounded-lg mb-6 flex justify-between items-center">
          <div>
            <p className="text-red-800 text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> This post is currently hidden.
            </p>
            <p className="text-red-600 text-xs mt-1">
              Only you and the administrators can see this.
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("restore")}
            >
              Restore Post
            </Button>
          )}
        </div>
      )}

      <Link
        href="/forum"
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      <div className={cn("space-y-6", post.isDeleted && "opacity-75")}>
        <div className="space-y-4 border-b pb-6">
          <div className="flex gap-2 items-center text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            {isEditingPost ? (
              <select
                value={editPostCategory}
                onChange={(e) => setEditPostCategory(e.target.value)}
                className="px-2 py-1 bg-white border border-zinc-200 rounded-md outline-none focus:border-blue-500 text-zinc-900"
              >
                {/* CONTEXT: hardcode for now */}
                <option value="Mathematics">Mathematics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
                <option value="Biology">Biology</option>
                <option value="Khmer Literature">Khmer Literature</option>
                <option value="History">History</option>
                <option value="English">Foreign Language</option>
                <option value="Morality - Civics">Morality - Civics</option>
                <option value="Geography">Geography</option>
                <option value="Earth Science">Earth Science</option>
                {post.category &&
                  ![
                    "General Study",
                  ].includes(post.category) && (
                    <option value={post.category}>{post.category}</option>
                  )}
              </select>
            ) : (
              <span className="px-2 py-1 bg-zinc-100 rounded-md">
                {post.category}
              </span>
            )}

            {post.isResolved && (
              <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                <CheckCircle2 className="h-3 w-3" /> Resolved
              </span>
            )}
            {post.isArchived && (
              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                <Archive className="h-3 w-3" /> Archived
              </span>
            )}
          </div>

          {isEditingPost ? (
            <input
              value={editPostTitle}
              onChange={(e) => setEditPostTitle(e.target.value)}
              className="w-full text-3xl font-bold tracking-tight p-2 -ml-2 border border-zinc-200 rounded-lg outline-none focus:border-blue-500 bg-background"
              placeholder="Post Title..."
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          )}

          <div className="flex items-center justify-between">
            <UserDisplay
              key={post.userId}
              userId={post.userId}
              fallbackData={{ 
                name: post.user?.name || "Individual", 
                avatar: post.user?.avatar || "" 
              }}
            >
              {(userData) => (
                <div className="flex items-center gap-3">
                  <Image
                    src={userData.avatar}
                    className="h-10 w-10 rounded-full object-cover"
                    width={500}
                    height={500}
                    alt="User Avatar"
                  />
                  <div>
                    <p className="text-sm font-semibold">{userData.name}</p>
                    <p className="text-xs text-zinc-500">Original Poster</p>
                  </div>
                </div>
              )}
            </UserDisplay>

            <div className="flex gap-2">
              {isAdmin && !post.isDeleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleAction("delete")}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </Button>
              )}

              {currentUser && !isAuthor && !isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAction("report")}
                  title="Report"
                >
                  <Flag className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                </Button>
              )}
              {(isAuthor || isAdmin) && (
                <>
                  {isAuthor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!isEditingPost) {
                          setEditPostTitle(post.title || "");
                          setEditPostCategory(post.category || "");
                          setEditPostContent(post.content || "");
                        }
                        setIsEditingPost(!isEditingPost);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-zinc-400 hover:text-blue-500" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAction("archive")}
                      title={post.isArchived ? "Unarchive" : "Archive"}
                    >
                      <Archive
                        className={cn(
                          "h-4 w-4 text-zinc-400 hover:text-blue-500",
                          post.isArchived && "text-blue-600",
                        )}
                      />
                    </Button>
                  )}
                  {!post.isDeleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAction("delete")}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border">
            {isEditingPost ? (
              <div className="space-y-3">
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  className="w-full min-h-[100px] text-base bg-background dark:bg-zinc-950 p-3 border rounded-lg outline-none focus:border-blue-500 transition-colors"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingPost(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePostEdit}
                    className="bg-brand hover:bg-blue-600 text-white"
                  >
                    Save Edits
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>
                {post.updatedAt && (
                  <p className="text-[10px] text-zinc-400 mt-4 font-medium italic">
                    Edited at {formatEditTime(post.updatedAt)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* CONTEXT: Answers Section */}
        <div className="space-y-6 pt-4">
          <h3 className="font-semibold text-lg">{comments.length} Response(s)</h3>

          <div className="space-y-4">
            {comments.map((comment) => (
              <UserDisplay
                key={comment.id}
                userId={comment.userId}
                fallbackData={{ name: comment.userName, avatar: comment.userAvatar }}
              >
                {(userData) => (
                  <div
                    className={cn(
                      "p-4 rounded-xl border flex gap-4 group",
                      comment.isSolution ? "bg-green-50/50 border-green-200" : "",
                    )}
                  >
                    <Image
                      src={userData.avatar}
                      className="h-8 w-8 rounded-full object-cover shrink-0 mt-1"
                      width={500}
                      height={500}
                      alt="User Avatar"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{userData.name}</p>
                        <div className="flex items-center gap-3">
                          {comment.isSolution && (
                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Solution
                            </span>
                          )}

                          {(currentUser?.uid === comment.userId || isAdmin) && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {currentUser?.uid === comment.userId && (
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentText(comment.text);
                                  }}
                                  className="text-zinc-400 hover:text-blue-500"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteComment(comment.id)}
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="space-y-2 pt-2">
                          <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 p-2 border rounded-md outline-none focus:border-blue-500"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="text-[10px] text-zinc-500 hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveCommentEdit(comment.id)}
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {comment.text}
                          </p>
                          {comment.updatedAt && (
                            <p className="text-[10px] text-zinc-400 italic mt-1">
                              Edited at {formatEditTime(comment.updatedAt)}
                            </p>
                          )}
                        </>
                      )}

                      {isAuthor && !post.isResolved && !comment.isSolution && (
                        <button
                          onClick={() => markSolution(comment.id)}
                          className="text-xs font-semibold text-zinc-400 hover:text-green-600 transition-colors pt-2"
                        >
                          Mark as Solution
                        </button>
                      )}
                      {isAuthor && comment.isSolution && (
                        <button
                          onClick={() => undoSolution(comment.id)}
                          className="text-xs font-semibold text-zinc-400 hover:text-red-500 transition-colors pt-2 flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Undo Solution
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </UserDisplay>
            ))}
          </div>

          <div className="mt-8 border-t pt-6">
            {post.isArchived && (
              <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center gap-2 border border-blue-200">
                <ShieldAlert className="h-4 w-4" />
                This thread is now archived. Responses cannot be added in future time.
              </div>
            )}

            {post.isArchived === false && !post.isDeleted && currentUser && (
              <form onSubmit={handleAddComment} className="flex gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Provide a solution..."
                  className="flex-1 text-sm p-3 border rounded-xl resize-none outline-none focus:border-blue-500 transition-colors"
                  rows={3}
                />
                <Button
                  disabled={isSubmitting || !newComment.trim()}
                  className="self-end bg-brand zinc-900 text-white hover:bg-zinc-800"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </form>
            )}

            {post.isArchived === false && !currentUser && (
              <div className="p-6 bg-zinc-50 rounded-xl border border-dashed text-center">
                <p className="text-sm text-zinc-500">
                  Sign in to Join the Conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
