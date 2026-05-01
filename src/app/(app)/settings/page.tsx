// -- NEXT.JS --
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
// -- FIREBASE --
import { auth, db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// -- SHAD.CN UI COMPONENTS --
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// -- DESIGN --
import { useTheme } from "next-themes";
import { Loader2, Camera, User as UserIcon } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [loaded, setLoaded] = useState(false);

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePictureUrl, setprofilePictureUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CONTEXT: Fetch user data on load
  useEffect(() => {
    setLoaded(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || "");
          setBio(data.bio || "");
          setprofilePictureUrl(data.profilePictureUrl || user.photoURL || "");
        } else {
          // CONTEXT: initialize doc if it is the user's first time opening the settings
          await setDoc(
            userRef,
            {
              createdAt: new Date(),
              profilePictureUrl: user.photoURL || "",
            },
            { merge: true },
          );
        }
      } else {
        setUid(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePFPClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // CONTEXT: Use auth.currentUser directly, so that token is fresh for upload
    const user = auth.currentUser;

    if (!file || !user) return;

    setIsUploading(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      // CONTREXT: Remove potential spaces from UID path
      const storageRef = ref(
        storage,
        `profile_pictures/${user.uid}.${extension}`,
      );

      // Upload
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Update Local State
      setprofilePictureUrl(downloadURL);

      // Update Auth Profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update Firestore User Doc
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePictureUrl: downloadURL });

      toast.success("Profile Picture updated!", { position: "top-center" });
    } catch (error: any) {
      console.error("Upload Error:", error);
      // This is where 'unauthorized' error triggers
      toast.error(
        `Upload failed: ${error.code === "storage/unauthorized" ? "Permission Denied" : "Check connection"}`,
        { position: "top-center" },
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!uid || !auth.currentUser) return;
    setIsSaving(true);

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      // CONTEXT: Check if anyone other than you is using this name
      let isTaken = false;
      querySnapshot.forEach((doc) => {
        if (doc.id !== uid) isTaken = true;
      });

      if (isTaken) {
        toast.error("This username is already taken. Please choose another.", {
          position: "top-center",
        });
        setIsSaving(false);
        return;
      }
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        username,
        bio,
        profilePictureUrl,
      });

      toast.success("Profile updated successfully!", {
        position: "top-center",
      });
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(`Failed to save: ${error.message}`, {
        position: "top-center",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!loaded) return null;

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!loading && uid && (
        <section className="space-y-4 p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
          <h3 className="text-xl font-semibold">Profile Information</h3>

          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handlePFPClick}
              className="relative group cursor-pointer w-24 h-24 border border-black overflow-hidden flex items-center justify-center"
            >
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt="Profile Picture"
                  fill
                  className="object-cover"
                  sizes="96px"
                  priority // Load First
                />
              ) : (
                <UserIcon className="w-8 h-8 text-black" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white w-6 h-6" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-[10px] uppercase font-bold">
              Tap to Change Picture
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={bio}
                placeholder="What is something you want to achieve or have achieved?"
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={handleSaveProfile}
            disabled={isSaving || !uid}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </section>
      )}

      <section className="space-y-4 p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Appearance</h3>
          {/* CONTEXT: Reset button to go back to "Auto" if stuck */}
          {theme !== "system" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setTheme("system")}
            >
              Reset to System
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="dark-mode-toggle" className="text-base font-medium">
              {theme === "system" ? "Syncing with System" : "Manual"}
            </Label>
            <p className="text-xs">Current: {resolvedTheme} mode</p>
          </div>
          <Switch
            id="dark-mode-toggle"
            // CONTEXT: shows what browser is doing
            checked={resolvedTheme === "dark"}
            onCheckedChange={(checked) => {
              // CONTEXT: If toggled, it becomes "Manual". To go to "Automatic", set it to "System"
              setTheme(checked ? "dark" : "light");
            }}
          />
        </div>
      </section>
    </div>
  );
}
