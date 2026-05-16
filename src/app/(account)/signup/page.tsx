"use client";
// --- NEXT.JS ---
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Link from "next/link";
// --- FIREBASE ---
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  useCreateUserWithEmailAndPassword,
  useSendEmailVerification,
} from "react-firebase-hooks/auth";
import { updateProfile } from "firebase/auth";
// --- SHAD.CN UI COMPONENTS ---
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [createUser, user, loading, error] =
    useCreateUserWithEmailAndPassword(auth);
  const [sendEmailVerification] = useSendEmailVerification(auth);
  const [isRegistered, setIsRegistered] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!", { position: "top-center" });
      return;
    }

    try {
      const res = await createUser(formData.email, formData.password);

      if (res?.user) {
        await updateProfile(res.user, {
          displayName: formData.name,
        });

        await setDoc(doc(db, "users", res.user.uid), {
          email: formData.email,
          name: formData.name,
          username: formData.name,
          bio: "",
          profilePictureUrl: "/placeholder/profile_picture.jpg",
          createdAt: new Date().toISOString(),
        });

        if (res?.user) {
          await sendEmailVerification();
          setIsRegistered(true);
        }

        try {
          await sendEmailVerification();
          setIsRegistered(true);
        } catch (e) {
          toast.error(
            "Account created, but we couldn&apos;t send the email. Please try logging in to resend it.",
            { position: "top-center" },
          );
          router.push("/login");
          console.error(
            "[Registration]: Email verification failed to send.",
            e,
          );
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  if (isRegistered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Check your inbox!
            </CardTitle>
            <CardDescription className="mb-5">
              We&apos;ve sent a verification link to{" "}
              <strong>{formData.email}</strong>. Please verify your email to
              activate your account.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full mb-2" onClick={() => router.push("/login")}>
              Go to Sign In
            </Button>
          </CardFooter>

          <Button
            variant="link"
            onClick={async () => {
              await sendEmailVerification();
              toast.success("Verification email resent", {
                position: "top-center",
              });
            }}
          >
            Didn&apos;t get an email? Resend
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create an account
          </CardTitle>

          {loading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <CardDescription>Start Studying</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Name"
                required
                className="h-11"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                required
                className="h-11"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Create a password"
                className="h-11"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                required
                className="h-11"
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium text-center">
                {error.message.includes("email-already-in-use")
                  ? "This email is already registered. Try signing in instead."
                  : error.message.includes("weak-password")
                  ? "Password is too weak. Please use at least 6 characters."
                  : error.message.includes("invalid-email")
                  ? "Please enter a valid email address."
                  : "An error occurred while creating your account. Please try again."}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium mt-2 bg-brand"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2">Or sign up with</span>
            </div>
          </div>

          <div className="w-full mb-5">
            <Button variant="outline" className="h-11 w-full">
              Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}