// NEXT.JS
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// --- FIREBASE ---
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
// -- ICON --
import {
  LucideIcon,
  LayoutDashboard,
  Timer,
  CheckCircle,
  Vault,
  Settings,
  User as UserIcon,
  Loader2,
} from "lucide-react";
// --- UTILITY AND INTERFACE ---
import { cn } from "@/lib/utils";

interface NavItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  isMobile: boolean;
  activeTab: string;
  setActiveTab: (id: string) => void;
}
const NavItem = ({
  id,
  icon: Icon,
  label,
  isMobile,
  activeTab,
  setActiveTab,
}: NavItemProps) => (
  <Link
    href={id}
    onClick={() => setActiveTab(id)}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
      isMobile ? "flex-col gap-1 p-2 text-[10px]" : "w-full justify-start",
      // CONTEXT: Updated to check for exact match OR nested match (e.g., /forum/123)
      activeTab === id || activeTab.startsWith(id + "/")
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900",
    )}
  >
    <Icon className={cn("transition-all", isMobile ? "h-5 w-5" : "h-4 w-4")} />
    <span>{label}</span>
  </Link>
);

export default function MobileNavigation() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, loading] = useAuthState(auth);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 flex-col border-r px-4 py-6 fixed h-full left-0 top-0 z-20 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </aside>
    );
  }

  // CONTEXT: Applying DRY Principal
  const commonProps = {
    isMobile,
    activeTab: pathname, // Uses URL directly
    setActiveTab: () => {}, // Empty function to prevent errors, Link handles navigation
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t px-4 py-2 pb-safe flex justify-around items-center z-50 bg-background">
      {user && (
        <NavItem
          id="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          {...commonProps}
        />
      )}
      {user && (
        <NavItem
          id="/mission"
          icon={CheckCircle}
          label="Mission"
          {...commonProps}
        />
      )}
      {user && (
        <NavItem id="/sprints" icon={Timer} label="Sprints" {...commonProps} />
      )}
      {user && (
        <NavItem id="/vault" icon={Vault} label="Vault" {...commonProps} />
      )}
      <NavItem id="/forum" icon={UserIcon} label="Forum" {...commonProps} />
      <NavItem
        id="/settings"
        icon={Settings}
        label="Settings"
        {...commonProps}
      />
    </div>
  );
}
