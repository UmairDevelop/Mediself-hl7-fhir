"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface ConditionSectionProps {
  patientId: string;
  conditions: any[];
  onRefresh: () => void;
  highlightId?: string;
}

export function ConditionSection({ patientId, conditions, onRefresh, highlightId }: ConditionSectionProps) {
  const user = getStoredUser();
  const canEdit = user?.role === "PHYSICIAN" || user?.role === "ADMIN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("44054006");
  const [display, setDisplay] = useState("");
  const [onsetDate, setOnsetDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonConditions = [
    { code: "44054006", display: "Type 2 diabetes mellitus" },
    { code: "38341003", display: "Essential hypertension" },
    { code: "195967001", display: "Asthma" },
    { code: "53741008", display: "Coronary arteriosclerosis" },
    { code: "709044004", display: "Chronic kidney disease stage 3" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!display.trim()) {
      setError("Please specify condition name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patientId}/conditions`, {
        method: "POST",
        body: JSON.stringify({
          code: {
            coding: [{ system: "http://snomed.info/sct", code, display }]
          },
          clinicalStatus: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
          },
          onsetDateTime: onsetDate
        })
      });
      setIsModalOpen(false);
      setDisplay("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to add condition");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (condId: string) => {
    if (!confirm("Are you sure you want to deactivate this condition?")) return;
    try {
      await apiFetch(`/patients/${patientId}/conditions/${condId}`, {
        method: "DELETE"
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate condition");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Conditions & Diagnoses</h2>
          <p className="text-xs text-[#86868b]">Active problem list</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Condition
          </button>
        )}
      </div>

      {conditions.length === 0 ? (
        <p className="text-xs text-[#86868b] italic py-3 text-center">
          No medical conditions recorded.
        </p>
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {conditions.map((cond) => {
            const condId = cond.id;
            const isHighlighted = highlightId === condId;
            const codeObj = cond.code?.coding?.[0] || {};
            const title = codeObj.display || "Unspecified Condition";
            const status = cond.clinicalStatus?.coding?.[0]?.code || "active";
            const onset = cond.onsetDateTime || "Unknown onset";
            const isActive = status === "active";

            return (
              <div
                key={condId}
                id={`Condition-${condId}`}
                className={`py-3 px-2 flex items-center justify-between rounded-xl transition ${
                  isHighlighted ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-black/[0.02]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#1d1d1f]">{title}</span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-black/[0.04] text-[#86868b]"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#86868b] mt-0.5">
                    Onset: {onset}
                  </div>
                </div>

                {canEdit && isActive && (
                  <button
                    onClick={() => handleDeactivate(condId)}
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
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-4">Add Condition</h3>

            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Select Preset</label>
                <select
                  onChange={(e) => {
                    const sel = commonConditions.find(c => c.code === e.target.value);
                    if (sel) {
                      setCode(sel.code);
                      setDisplay(sel.display);
                    }
                  }}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 bg-[#fcfcfd]"
                >
                  <option value="">Select a common condition...</option>
                  {commonConditions.map(c => (
                    <option key={c.code} value={c.code}>{c.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Condition Display</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  placeholder="e.g. Type 2 diabetes mellitus"
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Onset Date</label>
                <input
                  type="date"
                  value={onsetDate}
                  onChange={(e) => setOnsetDate(e.target.value)}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                />
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
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
