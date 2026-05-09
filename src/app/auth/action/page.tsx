// --- NEXT.JS ---
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, applyActionCode, confirmPasswordReset } from "firebase/auth";
// --- SHAD.CN UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function AuthHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = getAuth();

  const mode = searchParams.get("mode");
  const token = searchParams.get("oobCode");

  const [status, setStatus] = useState<
    "processing" | "success" | "error" | "reset-form"
  >("processing");
  const [message, setMessage] = useState("Request is processing...");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!mode || !token) {
      setStatus("error");
      setMessage("Missing required parameters.");
      return;
    }

    switch (mode) {
      case "verifyEmail":
        handleVerifyEmail(token);
        break;
      case "resetPassword":
        setStatus("reset-form");
        break;
      case "recoverEmail":
        handleRecoverEmail(token);
        break;
      default:
        setStatus("error");
        setMessage("Unknown action mode.");
    }
  }, [mode, token]);

  const handleVerifyEmail = async (actionCode: string) => {
    try {
      await applyActionCode(auth, actionCode);
      setStatus("success");
      setMessage("Email verified successfully.");
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch {
      setStatus("error");
      setMessage("Verification failed. The link may be expired.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      await confirmPasswordReset(auth, token, newPassword);
      setStatus("success");
      setMessage("Password has been reset.");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setStatus("error");
      setMessage("Reset failed. Please try again.");
    }
  };

  const handleRecoverEmail = async (actionCode: string) => {
    try {
      await applyActionCode(auth, actionCode);
      setStatus("success");
      setMessage("Email recovery successful.");
      setTimeout(() => router.push("/settings"), 3000);
    } catch {
      setStatus("error");
      setMessage("Recovery failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-brand">WAPiWAPI {mode ? `// ${mode}` : ""}</CardTitle>
          <CardDescription className="mb-4">Account security selection (ASS)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "processing" && (
            <p className="text-muted-foreground italic">{message}</p>
          )}

          {status === "success" && (
            <div className="space-y-2">
              <p>{message}</p>
              <p className="text-xs text-muted-foreground">Redirecting...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="font-medium">{message}</p>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Return to Login
              </Button>
            </div>
          )}

          {status === "reset-form" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>
              <Button type="submit" className="text-brand w-full">
                Update Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <AuthHandler />
    </Suspense>
  );
}