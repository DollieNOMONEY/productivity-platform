"use client";
// --- Next.JS ---
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// --- FIREBASE ---
import { auth } from "@/lib/firebase";
import {
  useSignInWithEmailAndPassword,
  useSignInWithGoogle,
} from "react-firebase-hooks/auth";
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

  const [signInWithEmailAndPassword, user, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [signInWithGoogle, gUser, gLoading, gError] = useSignInWithGoogle(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      return res.user;
    };
    
    toast.promise(loginAction(), {
      loading: "Verifying Identity...",
      success: "Welcome back.",
      error: (err) => {
        if (err.message === "unverified")
          return "Please verify your email first.";
        return "Identity not matched: Access Denied.";
      },
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
                <Link
                  href="#"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
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
                {gError && "Google sign-in failed. Please try again."}
                {!gError &&
                  error?.message.includes("auth/invalid-credential") &&
                  "Invalid email or password."}
                {!gError &&
                  !error?.message.includes("auth/invalid-credential") &&
                  error?.message}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11">
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
