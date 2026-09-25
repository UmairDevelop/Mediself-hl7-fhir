"use client";

import React, { useState } from "react";
import { Edit3, X, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PatientHeaderProps {
  patient: any;
  onRefresh?: () => void;
}

export function PatientHeader({ patient, onRefresh }: PatientHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nameObj = patient?.name?.[0] || {};
  const givenName = nameObj.given?.join(" ") || "";
  const familyName = nameObj.family || "";
  const fullName = `${givenName} ${familyName}`.trim() || "Unknown Patient";

  const mrn = patient?.identifier?.[0]?.value || patient?.id;
  const gender = patient?.gender || "unspecified";
  const birthDate = patient?.birthDate || "";
  const phone = patient?.telecom?.find((t: any) => t.system === "phone")?.value || "";
  const address = patient?.address?.[0];
  const addressLine = address?.line?.join(", ") || "";

  let age = "N/A";
  if (patient?.birthDate) {
    const dob = new Date(patient.birthDate);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    age = Math.abs(age_dt.getUTCFullYear() - 1970).toString() + " yrs";
  }

  // Form State
  const [formData, setFormData] = useState({
    given: givenName,
    family: familyName,
    mrn: mrn,
    birthDate: birthDate,
    gender: gender,
    phone: phone,
    address: addressLine
  });

  const handleOpen = () => {
    setFormData({
      given: givenName,
      family: familyName,
      mrn: mrn,
      birthDate: birthDate,
      gender: gender,
      phone: phone,
      address: addressLine
    });
    setError("");
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patient.id}`, {
        method: "PUT",
        body: JSON.stringify(formData)
      });
      setIsEditing(false);
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || "Failed to update demographics");
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  const addressStr = addressLine ? `${addressLine}${address?.city ? `, ${address.city}` : ""}${address?.state ? `, ${address.state}` : ""}` : "N/A";

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">{fullName}</h1>
            <span className="bg-black/[0.04] text-[#1d1d1f] text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">
              {gender} • {age}
            </span>
            <button
              onClick={handleOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f5f5f7] hover:bg-black/[0.06] text-[#1d1d1f] text-xs font-medium rounded-full border border-black/[0.06] transition"
              title="Edit Demographics"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#86868b]" />
              <span>Edit</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#86868b] mt-2 font-normal">
            <span>MRN: <strong className="text-[#1d1d1f] font-medium">{mrn}</strong></span>
            <span>•</span>
            <span>DOB: {birthDate || "N/A"}</span>
            <span>•</span>
            <span>Phone: {phone || "N/A"}</span>
          </div>
        </div>

        <div className="text-xs text-[#86868b] max-w-xs bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
          <span className="font-medium text-[#1d1d1f]">Address:</span> {addressStr}
        </div>
      </div>

      {/* Edit Demographics Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 mb-4">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Edit Patient Demographics</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-[#86868b] hover:text-[#1d1d1f] p-1 rounded-lg hover:bg-black/[0.04]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1d1d1f] mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.given}
                    onChange={(e) => setFormData({ ...formData, given: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1d1d1f] mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.family}
                    onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Medical Record Number (MRN)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRN-123456"
                  value={formData.mrn}
                  onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1d1d1f] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1d1d1f] mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                  >
                    <option value="male">male</option>
                    <option value="female">female</option>
                    <option value="other">other</option>
                    <option value="unknown">unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-[#f5f5f7] hover:bg-black/[0.06] text-[#1d1d1f] font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-xl transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
