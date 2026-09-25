"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getStoredUser, clearSession, User } from "@/lib/api";
import { LogOut, Search, ShieldCheck, Cpu, Users, Settings } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (pathname === "/login") return null;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-black/[0.06] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          {/* Brand Logo */}
          <Link href="/search" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="MediSelf Logo" className="w-8 h-8 rounded-lg shadow-2xs" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-[#1d1d1f] tracking-tight">
                MediSelf
              </span>
              <span className="text-xs font-normal text-[#86868b]">
                Clinical
              </span>
            </div>
          </Link>

          {/* Minimalist Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            <Link
              href="/search"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                pathname === "/search"
                  ? "bg-black/[0.06] text-[#1d1d1f]"
                  : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Patient Search
            </Link>

            {user?.role === "ADMIN" && (
              <>
                <Link
                  href="/admin/tokens"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                    pathname === "/admin/tokens"
                      ? "bg-black/[0.06] text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  API & Tokens
                </Link>

                <Link
                  href="/admin/roster"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                    pathname === "/admin/roster"
                      ? "bg-black/[0.06] text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Staff Roster
                </Link>

                <Link
                  href="/admin/audit"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                    pathname === "/admin/audit"
                      ? "bg-black/[0.06] text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Audit Logs
                </Link>

                <Link
                  href="/admin/settings"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                    pathname === "/admin/settings"
                      ? "bg-black/[0.06] text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Link>
              </>
            )}
          </nav>

          {/* User Profile Info */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-[#1d1d1f] leading-none">
                  {user.name}
                </div>
                <div className="text-[11px] text-[#86868b] mt-0.5">{user.email}</div>
              </div>

              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-black/[0.04] text-[#1d1d1f] border border-black/[0.06] uppercase tracking-wider">
                {user.role.replace("_", " ")}
              </span>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-[#86868b] hover:text-red-600 hover:bg-red-50 rounded-full transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
