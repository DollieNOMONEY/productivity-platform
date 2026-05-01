"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    // CONTEXT: redirect once loading finished and no user
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  // CONTEXT: show page if user exists
  return <>{children}</>;
}
