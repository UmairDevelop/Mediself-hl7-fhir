"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getStoredUser, User } from "@/lib/api";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setLoading(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-xs text-[#86868b]">
          Authenticating access permissions...
        </main>
      </div>
    );
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-10 shadow-xs">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-[#1d1d1f]">Admin Access Restricted</h2>
            <p className="text-xs text-[#86868b] mt-1">
              Admin Analytics, Staff Management, Audit Logs, and Settings require an Administrator account.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
            Admin Management Portal
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">
            Manage staff members, monitor API usage, token consumption, and system configuration.
          </p>
        </div>

        {children}
      </main>
    </div>
  );
}
