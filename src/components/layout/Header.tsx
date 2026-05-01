"use client";
// --- Next.JS ---
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// --- Authentication ---
import { auth, db } from "@/lib/firebase";
import { SignedIn } from "../auth/signed-in";
import { SignedOut } from "../auth/signed-out";
import { useAuthState, useSignOut } from "react-firebase-hooks/auth";
import { doc, onSnapshot } from "firebase/firestore";
// -- Shadcn UI Component ---
import { Button } from "@/components/ui/button";

export default function Header() {
  const router = useRouter();

  const [user] = useAuthState(auth);
  const [signOut] = useSignOut(auth);

  const [profileName, setProfileName] = useState<string | null>(null);

  let content;

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileName(docSnap.data().username);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (user) {
    content = (
      <SignedIn>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-xs">
            <span className="font-medium">
              {profileName || user?.displayName || "User"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-[10px] uppercase tracking-widest"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </SignedIn>
    );
  } else {
    content = (
      <SignedOut>
        <div className="flex items-center gap-2 select-none">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-24 text-center"
          >
            <Link
              href="/login"
              className="text-[10px] uppercase tracking-widest"
            >
              Sign in
            </Link>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-32 text-center"
          >
            <Link
              href="/signup"
              className="text-[10px] uppercase tracking-widest"
            >
              Create account
            </Link>
          </Button>
        </div>
      </SignedOut>
    );
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 justify-end opacity-80 backdrop-blur px-6">
      {content}
    </header>
  );
}
