import "@/app/globals.css";
import Header from "@/components/layout/Header";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";

import { cn } from "@/lib/utils";

interface Props {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: Props) {
  return (
    <div>
      <main
        className={cn(
          "flex-1 h-screen transition-all",
          "md:pl-72",
          "pb-24 md:pb-8 ",
          "selection:bg-brand selection:text-white",
          // space for bottom nav on mobile
        )}
      >
        <DesktopSidebar />
        <Header />
        <MobileNavigation />
        <div
          className="
          p-4 md:p-6 overflow-visible 
          max-w-4xl lg:max-w-5xl mx-auto"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
