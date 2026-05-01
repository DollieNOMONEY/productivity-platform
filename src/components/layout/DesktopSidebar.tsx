// --- Next.JS ---
"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
// --- FIREBASE ---
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
// --- ICONS ---
import {
  LayoutDashboard,
  Settings,
  User as UserIcon,
  LucideIcon,
  Timer,
  CheckCircle,
  Vault,
} from "lucide-react";
// --- UTILITY AND INTERFACE ---
import { cn } from "@/lib/utils";
interface NavItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isMobile: boolean;
}

const NavItem = ({
  id,
  icon: Icon,
  label,
  isActive,
  isMobile,
}: NavItemProps) => {
  return (
    <Link
      href={`/${id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-l-4xl hover:rounded-l-none hover:rounded-r-4xl hover:opacity-90 duration-700",
        isMobile ? "flex-col gap-1 p-2 text-[10px]" : "w-full justify-start",
        isActive
          ? "bg-brand text-brand-text"
          : "text-brand-highlight hover:bg-brand/62 hover:text-brand-text",
      )}
    >
      <Icon
        className={cn("transition-all", isMobile ? "h-5 w-5" : "h-4 w-4")}
      />
      <span>{label}</span>
    </Link>
  );
};

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const checkActive = (id: string) =>
    pathname === `/${id}` || (pathname === "/" && id === "dashboard");

  return (
    <aside className="hidden md:flex w-64 flex-col border-r px-4 py-6 fixed h-full left-0 top-0 z-50">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-[10px] md:text-xs tracking-[0.2em] font-black">
          WAPIWAPI
        </span>
      </div>

      <nav className="space-y-1 flex-1 select-none">
        {user && (
          <NavItem
            id="dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            isActive={checkActive("dashboard")}
            isMobile={isMobile}
          />
        )}
        {user && (
          <NavItem
            id="mission"
            icon={CheckCircle}
            label="Mission"
            isActive={checkActive("mission")}
            isMobile={isMobile}
          />
        )}
        {user && (
          <NavItem
            id="sprints"
            icon={Timer}
            label="Sprints"
            isActive={checkActive("sprints")}
            isMobile={isMobile}
          />
        )}
        {user && (
          <NavItem
            id="vault"
            icon={Vault}
            label="Vault"
            isActive={checkActive("vault")}
            isMobile={isMobile}
          />
        )}
        <NavItem
          id="forum"
          icon={UserIcon}
          label="Forum"
          isActive={checkActive("forum")}
          isMobile={isMobile}
        />
      </nav>

      <div className="pt-4 border-t select-none">
        <NavItem
          id="settings"
          icon={Settings}
          label="Settings"
          isActive={checkActive("settings")}
          isMobile={isMobile}
        />
      </div>
    </aside>
  );
}
