"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface AllergySectionProps {
  patientId: string;
  allergies: any[];
  onRefresh: () => void;
  highlightId?: string;
}

export function AllergySection({ patientId, allergies, onRefresh, highlightId }: AllergySectionProps) {
  const user = getStoredUser();
  const canEdit = user?.role === "PHYSICIAN" || user?.role === "NURSE" || user?.role === "ADMIN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("7980");
  const [display, setDisplay] = useState("Penicillin - allergy");
  const [criticality, setCriticality] = useState("high");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonAllergies = [
    { code: "7980", display: "Penicillin - allergy", criticality: "high" },
    { code: "91936005", display: "Allergy to sulfonamide", criticality: "medium" },
    { code: "300916003", display: "Latex allergy", criticality: "high" },
    { code: "294805000", display: "Aspirin allergy", criticality: "medium" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!display.trim()) {
      setError("Please specify allergy");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patientId}/allergies`, {
        method: "POST",
        body: JSON.stringify({
          clinicalStatus: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }]
          },
          verificationStatus: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }]
          },
          criticality,
          code: {
            coding: [{ system: "http://snomed.info/sct", code, display }]
          }
        })
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to add allergy");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (allergyId: string) => {
    if (!confirm("Are you sure you want to deactivate this allergy record?")) return;
    try {
      await apiFetch(`/patients/${patientId}/allergies/${allergyId}`, {
        method: "DELETE"
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate allergy");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Allergies & Alerts</h2>
          <p className="text-xs text-[#86868b]">Adverse reaction history</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Allergy
          </button>
        )}
      </div>

      {allergies.length === 0 ? (
        <p className="text-xs text-[#86868b] italic py-3 text-center">
          No active allergies recorded.
        </p>
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {allergies.map((allergy) => {
            const allergyId = allergy.id;
            const isHighlighted = highlightId === allergyId;
            const coding = allergy.code?.coding?.[0] || {};
            const title = coding.display || "Unspecified Allergy";
            const status = allergy.clinicalStatus?.coding?.[0]?.code || "active";
            const crit = allergy.criticality || "unspecified";
            const isActive = status === "active";

            return (
              <div
                key={allergyId}
                id={`AllergyIntolerance-${allergyId}`}
                className={`py-3 px-2 flex items-center justify-between rounded-xl transition ${
                  isHighlighted ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-black/[0.02]"
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-[#1d1d1f] block">{title}</span>
                  <span className="text-[10px] font-medium text-red-600 capitalize">
                    {crit} risk
                  </span>
                </div>

                {canEdit && isActive && (
                  <button
                    onClick={() => handleDeactivate(allergyId)}
                    className="text-xs text-[#86868b] hover:text-red-600 px-2 py-1 transition"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-black/[0.08]">
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-4">Add Allergy Alert</h3>

            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Common Allergen</label>
                <select
                  onChange={(e) => {
                    const sel = commonAllergies.find(a => a.code === e.target.value);
                    if (sel) {
                      setCode(sel.code);
                      setDisplay(sel.display);
                      setCriticality(sel.criticality);
                    }
                  }}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 bg-[#fcfcfd]"
                >
                  <option value="">Select a common allergen...</option>
                  {commonAllergies.map(a => (
                    <option key={a.code} value={a.code}>{a.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Allergen Name</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Criticality</label>
                <select
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value)}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#86868b] hover:text-[#1d1d1f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-medium bg-[#0071e3] text-white rounded-full hover:bg-[#0077ed] disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
