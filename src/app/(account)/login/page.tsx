"use client";
// --- Next.JS ---
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// --- FIREBASE ---
import { auth, db} from "@/lib/firebase";
import { getDoc, setDoc, doc } from "firebase/firestore";
import {
  useSignInWithEmailAndPassword,
  useSignInWithGoogle,
} from "react-firebase-hooks/auth";
import { sendPasswordResetEmail } from "firebase/auth";
// --- SHADCN UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(0);

  const [signInWithEmailAndPassword, user, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [signInWithGoogle, gUser, gLoading, gError] = useSignInWithGoogle(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCooldown, setResetCooldown] = useState(false);

  useEffect(() => {
    const savedExpiry = localStorage.getItem("reset_expiry");
    
    if (savedExpiry) {
      const remaining = Math.ceil((Number.parseInt(savedExpiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        localStorage.removeItem("reset_expiry");
      }
    }

    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            localStorage.removeItem("reset_expiry");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const authenticatedUser = user?.user || gUser?.user;

    if (authenticatedUser) {
      // CONTEXT: Adding email verification for email/pass users
      if (user && !authenticatedUser.emailVerified) {
        return;
      }

      router.push("/dashboard");
    }
  }, [user, gUser, router]);

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }

    if (countdown > 0) {
      toast.warning(`Please wait ${countdown}s before requesting another link.`);
      return;
    }

    const resetAction = async () => {
      await sendPasswordResetEmail(auth, email);
    };

    toast.promise(resetAction(), {
      loading: "Following the principals of recovery...",
      success: () => {
        const expiry = Date.now() + 60000;
        localStorage.setItem("reset_expiry", expiry.toString());
        setCountdown(60);
        
        return "We've just sent you an email.";
      },
      error: (err) => {
        if (err.code === "auth/invalid-email") return "Invalid email.";
        if (err.code === "auth/too-many-requests") return "Too many requests. Try later.";
        return "Error: Link not available.";
      },
      position: "top-center", 
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginAction = async () => {
      const res = await signInWithEmailAndPassword(email, password);

      // CONTEXT: undefined? the error loaded internally: e.g: wrong password
      if (!res) throw new Error("Invalid credentials");

      if (res.user && !res.user.emailVerified) {
        // CONTEXT: correct email/pass, but they have to verify their account
        await auth.signOut();
        throw new Error("unverified");
      }

      const userRef = doc(db, "users", res.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: res.user.email,
          name: res.user.displayName || "User",
          username: res.user.email?.split('@')[0] || "user",
          bio: "",
          profilePictureUrl: "/placeholder/profile_picture.jpg",
          createdAt: new Date().toISOString(),
        });
      }
    
      return res.user;
    };
    
    toast.promise(loginAction(), {
      loading: "Verifying Identity...",
      success: "Welcome back.",
      error: (err) => {
        if (err.message === "unverified") return "Please verify your email first.";
        return "Wrong Password.";
      },
      position: "top-center", 
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription>Start Studying</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetCooldown}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {countdown > 0 ? `Wait ${countdown}s...` : "Forgot password?"}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                required
                placeholder="Password"
                className="h-11"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {(error || gError) && (
              <p className="text-sm font-medium text-center text-red-500">
                {(() => {
                  if (gError) return "Google sign-in failed. Please try again.";
                  
                  const msg = error?.message || "";
                  if (msg.includes("auth/too-many-requests")) return "Too many attempts. Please try again later.";
                  if (msg.includes("auth/invalid-credential")) return "Invalid email or password.";
                  if (msg.includes("auth/user-not-found")) return "No account found with this email.";
                  
                  return "An unexpected error occurred.";
                })()}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 bg-brand">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mb-5">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="h-11 w-full"
              disabled={gLoading}
            >
              {gLoading ? "Connecting..." : "Google"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm text-muted-foreground">
          <span>Don&apos;t have an account?</span>
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
