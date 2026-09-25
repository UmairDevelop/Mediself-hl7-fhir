"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface MedicationSectionProps {
  patientId: string;
  medications: any[];
  onRefresh: () => void;
  highlightId?: string;
}

export function MedicationSection({ patientId, medications, onRefresh, highlightId }: MedicationSectionProps) {
  const user = getStoredUser();
  const canEdit = user?.role === "PHYSICIAN" || user?.role === "ADMIN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("860975");
  const [display, setDisplay] = useState("");
  const [dosage, setDosage] = useState("Take 1 tablet daily");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonMeds = [
    { code: "860975", display: "Metformin hydrochloride 500 MG Oral Tablet", dosage: "Take 1 tablet twice daily with meals" },
    { code: "314076", display: "Lisinopril 10 MG Oral Tablet", dosage: "Take 1 tablet once daily in morning" },
    { code: "617314", display: "Atorvastatin 20 MG Oral Tablet", dosage: "Take 1 tablet at bedtime" },
    { code: "630208", display: "Albuterol 0.09 MG/ACTUAT Inhaler", dosage: "Inhale 2 puffs every 4-6 hours as needed" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!display.trim()) {
      setError("Please specify medication name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patientId}/medications`, {
        method: "POST",
        body: JSON.stringify({
          status: "active",
          intent: "order",
          medicationCodeableConcept: {
            coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code, display }]
          },
          dosageInstruction: [{ text: dosage }],
          authoredOn: new Date().toISOString().slice(0, 10)
        })
      });
      setIsModalOpen(false);
      setDisplay("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to add medication");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (medId: string) => {
    if (!confirm("Are you sure you want to stop this medication order?")) return;
    try {
      await apiFetch(`/patients/${patientId}/medications/${medId}`, {
        method: "DELETE"
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to stop medication");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Medication Orders</h2>
          <p className="text-xs text-[#86868b]">Active prescriptions</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition"
          >
            <Plus className="w-3.5 h-3.5" /> Order Medication
          </button>
        )}
      </div>

      {medications.length === 0 ? (
        <p className="text-xs text-[#86868b] italic py-3 text-center">
          No medication orders recorded.
        </p>
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {medications.map((med) => {
            const medId = med.id;
            const isHighlighted = highlightId === medId;
            const medCoding = med.medicationCodeableConcept?.coding?.[0] || {};
            const title = medCoding.display || "Unspecified Medication";
            const status = med.status || "active";
            const dosageText = med.dosageInstruction?.[0]?.text || "";
            const isActive = status === "active";

            return (
              <div
                key={medId}
                id={`MedicationRequest-${medId}`}
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
                          ? "bg-blue-50 text-blue-700"
                          : "bg-black/[0.04] text-[#86868b]"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  {dosageText && (
                    <div className="text-[11px] text-[#86868b] mt-0.5">
                      {dosageText}
                    </div>
                  )}
                </div>

                {canEdit && isActive && (
                  <button
                    onClick={() => handleDeactivate(medId)}
                    className="text-xs text-[#86868b] hover:text-red-600 px-2 py-1 transition"
                  >
                    Stop
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
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-4">Order Medication</h3>

            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Drug Preset</label>
                <select
                  onChange={(e) => {
                    const sel = commonMeds.find(m => m.code === e.target.value);
                    if (sel) {
                      setCode(sel.code);
                      setDisplay(sel.display);
                      setDosage(sel.dosage);
                    }
                  }}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 bg-[#fcfcfd]"
                >
                  <option value="">Select a common drug...</option>
                  {commonMeds.map(m => (
                    <option key={m.code} value={m.code}>{m.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Medication Name</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  placeholder="e.g. Metformin hydrochloride"
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Dosage Instructions</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. Take 1 tablet daily"
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
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
                  {loading ? "Ordering..." : "Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
