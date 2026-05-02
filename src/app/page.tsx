"use client";
import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, Menu, X } from "lucide-react";

export default function LandingPage() {
  const [user, loading] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col font-sans transition-colors">
      <nav className="flex items-center justify-between px-6 md:px-10 py-8 relative z-50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-brand">
            WAPIWAPI
          </span>
        </div>

        <div className="hidden md:flex gap-2">
          {user ? (
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full w-24 text-center hover:cursor-pointer"
            >
              <Link
                href="/dashboard"
                className="text-[10px] uppercase tracking-widest"
              >
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full w-24 text-center"
            >
              <Link
                href="/login"
                className="text-[10px] uppercase tracking-widest"
              >
                Sign In
              </Link>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-32 text-center hover:cursor-pointer"
          >
            <Link
              href="/forum"
              className="text-[10px] uppercase tracking-widest"
            >
              Active / Support
            </Link>
          </Button>
        </div>

        <button
          className="md:hidden p-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full border-b flex flex-col p-6 gap-4 md:hidden animate-in fade-in slide-in-from-top-2">
            <Link
              href="/forum"
              className="text-xs uppercase tracking-widest py-2"
            >
              Active / Support
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="text-xs uppercase tracking-widest py-2"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-xs uppercase tracking-widest py-2"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 md:px-10">
        <div className="max-w-4xl w-full ">
          <h1 className="text-[15vw] text-center md:text-[120px] font-black leading-[0.85] tracking-tighter mb-8 animate-in fade-in duration-700">
            <span className="text-brand">INDIVI</span> <br/>
            <span className="text-brand">DUALS</span> <br/>
            WAPI <br/>
            <span className="text-brand">INDIVI</span> <br/>
            <span className="text-brand">DUALS</span> 
          </h1>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 md:gap-12 mb-12">
            <div>
              <p className="max-w-[360px] text-sm md:text-sm leading-relaxed tracking-tight">
                <span className="font-bold">Student. Developer. Director.</span> <br/> 
                "We are Prepared Individuals" is the only assistant you need. <br/> 
                <span className="font-bold">1.62%</span>
              </p>
            </div>

            <div className="flex flex-col items-start">
              {user ? (
                <Link href="/dashboard" className="w-full md:w-auto">
                  <Button
                    className="
                  w-full md:w-auto h-14 px-12 
                  rounded-l-4xl hover:rounded-l-none hover:rounded-r-4xl
                  bg-brand text-[10px] uppercase tracking-[0.2em] font-bold
                  hover:opacity-90 transition-all duration-700 hover:cursor-pointer"
                  >
                    RESUME PROGRESS
                  </Button>
                </Link>
              ) : (
                <Link href="/login" className="w-full md:w-auto">
                  <Button
                    className=" w-full md:w-auto h-14 px-12 
                  rounded-l-4xl hover:rounded-l-none hover:rounded-r-4xl
                  bg-brand
                  text-[10px] uppercase tracking-[0.2em] font-bold
                  hover:opacity-90 transition-all duration-700"
                  >
                    ENTER A NEW WORLD
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 md:absolute md:bottom-12 w-full px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-0 pt-8 pb-10 md:pb-0">
          <div className="flex flex-wrap gap-8 md:gap-12">
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1">
                MADE BY
              </p>
              <p className="text-[10px] md:text-xs font-medium">DOLLAR</p>
            </div>
          </div>

          <div className="text-[9px] uppercase tracking-[0.4em] hidden sm:block">
            %1.62 Collective
          </div>
        </div>
      </main>
    </div>
  );
}
