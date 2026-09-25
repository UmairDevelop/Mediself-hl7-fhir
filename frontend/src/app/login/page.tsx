"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/lib/api";
import { Lock, Mail, KeyRound, Stethoscope, UserCheck, Building2, ShieldCheck, ArrowRight } from "lucide-react";

type RoleType = "PHYSICIAN" | "NURSE" | "FRONT_DESK" | "ADMIN";

interface RoleConfig {
  id: RoleType;
  label: string;
  title: string;
  subtitle: string;
  icon: any;
  defaultEmail: string;
  defaultPass: string;
}

const ROLES: RoleConfig[] = [
  {
    id: "PHYSICIAN",
    label: "Physician",
    title: "Physician Clinical Portal",
    subtitle: "Complete clinical access for diagnosis, medication orders, lab results, and AI search.",
    icon: Stethoscope,
    defaultEmail: "physician@hospital.org",
    defaultPass: "doctor123",
  },
  {
    id: "NURSE",
    label: "Nurse",
    title: "Nursing Staff Portal",
    subtitle: "Access for lab recording, allergy alerts, visit encounters, and AI patient search.",
    icon: UserCheck,
    defaultEmail: "nurse@hospital.org",
    defaultPass: "nurse123",
  },
  {
    id: "FRONT_DESK",
    label: "Front Desk",
    title: "Front Desk & Reception",
    subtitle: "Patient check-in, registration, and demographic details lookup.",
    icon: Building2,
    defaultEmail: "frontdesk@hospital.org",
    defaultPass: "frontdesk123",
  },
  {
    id: "ADMIN",
    label: "Admin",
    title: "IT & Compliance Admin",
    subtitle: "System administration and HIPAA compliance audit logging.",
    icon: ShieldCheck,
    defaultEmail: "admin@hospital.org",
    defaultPass: "admin123",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleConfig>(ROLES[0]);
  const [email, setEmail] = useState(ROLES[0].defaultEmail);
  const [password, setPassword] = useState(ROLES[0].defaultPass);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: RoleConfig) => {
    setSelectedRole(role);
    setEmail(role.defaultEmail);
    setPassword(role.defaultPass);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setSession(data.access_token, data.user);
      router.push("/search");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const RoleIcon = selectedRole.icon;

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding with Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="MediSelf Logo"
            className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-md shadow-black/5"
          />
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
            MediSelf Clinical Portal
          </h1>
          <p className="text-xs text-[#86868b] mt-1 font-normal">
            Select your clinical role to proceed
          </p>
        </div>

        {/* Apple Segmented Control */}
        <div className="bg-[#e5e5e7]/60 p-1 rounded-full flex gap-1 mb-6">
          {ROLES.map((r) => {
            const isSelected = selectedRole.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r)}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all text-center ${
                  isSelected
                    ? "bg-white text-[#1d1d1f] shadow-xs"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Minimal Login Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-black/[0.04] flex items-center justify-center text-[#1d1d1f]">
              <RoleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f]">{selectedRole.title}</h2>
              <p className="text-xs text-[#86868b]">{selectedRole.subtitle}</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 text-xs border border-black/[0.1] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#0071e3] transition bg-[#fcfcfd]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 text-xs border border-black/[0.1] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#0071e3] transition bg-[#fcfcfd]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? "Signing in..." : `Continue as ${selectedRole.label}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-[#86868b]">
            Demo credentials: <span className="font-mono text-[#1d1d1f] font-medium">{selectedRole.defaultEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
