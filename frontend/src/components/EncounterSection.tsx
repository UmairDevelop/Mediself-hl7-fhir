"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface EncounterSectionProps {
  patientId: string;
  encounters: any[];
  onRefresh: () => void;
  highlightId?: string;
}

export function EncounterSection({ patientId, encounters, onRefresh, highlightId }: EncounterSectionProps) {
  const user = getStoredUser();
  const canEdit = user?.role === "PHYSICIAN" || user?.role === "NURSE" || user?.role === "ADMIN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("185349003");
  const [display, setDisplay] = useState("Encounter for checkup");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonEncounters = [
    { code: "185349003", display: "Encounter for checkup" },
    { code: "371530004", display: "Consultation for asthma" },
    { code: "408443003", display: "Follow-up visit" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!display.trim()) {
      setError("Please specify visit title");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patientId}/encounters`, {
        method: "POST",
        body: JSON.stringify({
          status: "finished",
          class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
          type: [{ coding: [{ system: "http://snomed.info/sct", code, display }] }],
          period: { start: `${date}T09:00:00Z`, end: `${date}T10:00:00Z` }
        })
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to record encounter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Encounter History</h2>
          <p className="text-xs text-[#86868b]">Recent clinical visits</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition"
          >
            <Plus className="w-3.5 h-3.5" /> Record Visit
          </button>
        )}
      </div>

      {encounters.length === 0 ? (
        <p className="text-xs text-[#86868b] italic py-3 text-center">
          No encounter records.
        </p>
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {encounters.map((enc) => {
            const encId = enc.id;
            const isHighlighted = highlightId === encId;
            const typeCoding = enc.type?.[0]?.coding?.[0] || {};
            const title = typeCoding.display || "Clinical Visit";
            const startDate = enc.period?.start ? enc.period.start.slice(0, 10) : "N/A";

            return (
              <div
                key={encId}
                id={`Encounter-${encId}`}
                className={`py-3 px-2 flex items-center justify-between rounded-xl transition ${
                  isHighlighted ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-black/[0.02]"
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-[#1d1d1f] block">{title}</span>
                  <span className="text-[11px] text-[#86868b]">{startDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-black/[0.08]">
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-4">Record Encounter</h3>

            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Preset</label>
                <select
                  onChange={(e) => {
                    const sel = commonEncounters.find(item => item.code === e.target.value);
                    if (sel) {
                      setCode(sel.code);
                      setDisplay(sel.display);
                    }
                  }}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 bg-[#fcfcfd]"
                >
                  <option value="">Select visit type...</option>
                  {commonEncounters.map(e => (
                    <option key={e.code} value={e.code}>{e.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Visit Title</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
