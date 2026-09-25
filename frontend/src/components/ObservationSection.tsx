"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface ObservationSectionProps {
  patientId: string;
  observations: any[];
  onRefresh: () => void;
  highlightId?: string;
}

export function ObservationSection({ patientId, observations, onRefresh, highlightId }: ObservationSectionProps) {
  const user = getStoredUser();
  const canEdit = user?.role === "PHYSICIAN" || user?.role === "NURSE" || user?.role === "ADMIN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("2823-3");
  const [display, setDisplay] = useState("Potassium [Moles/volume] in Serum or Plasma");
  const [value, setValue] = useState("4.5");
  const [unit, setUnit] = useState("mmol/L");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonLabs = [
    { code: "2823-3", display: "Potassium [Moles/volume] in Serum or Plasma", unit: "mmol/L", defaultValue: "4.5" },
    { code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood", unit: "%", defaultValue: "6.5" },
    { code: "2093-3", display: "Cholesterol [Mass/volume] in Serum or Plasma", unit: "mg/dL", defaultValue: "190" },
    { code: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma", unit: "mg/dL", defaultValue: "0.9" },
    { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg", defaultValue: "120" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!display.trim() || !value.trim()) {
      setError("Please fill in test name and value");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/patients/${patientId}/observations`, {
        method: "POST",
        body: JSON.stringify({
          status: "final",
          code: {
            coding: [{ system: "http://loinc.org", code, display }]
          },
          valueQuantity: {
            value: parseFloat(value),
            unit,
            system: "http://unitsofmeasure.org",
            code: unit
          },
          effectiveDateTime: new Date().toISOString()
        })
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to record lab result");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Labs & Vitals (Observations)</h2>
          <p className="text-xs text-[#86868b]">Laboratory test measurements</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition"
          >
            <Plus className="w-3.5 h-3.5" /> Record Lab
          </button>
        )}
      </div>

      {observations.length === 0 ? (
        <p className="text-xs text-[#86868b] italic py-3 text-center">
          No lab results or vitals recorded.
        </p>
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {observations.map((obs) => {
            const obsId = obs.id;
            const isHighlighted = highlightId === obsId;
            const codeCoding = obs.code?.coding?.[0] || {};
            const title = codeCoding.display || "Unspecified Test";
            const val = obs.valueQuantity?.value ?? "N/A";
            const unitStr = obs.valueQuantity?.unit || "";
            const effDate = obs.effectiveDateTime ? obs.effectiveDateTime.slice(0, 10) : "N/A";

            const refRange = obs.referenceRange?.[0];
            let isAbnormal = false;
            if (refRange && typeof val === "number") {
              if (refRange.high && val > refRange.high.value) isAbnormal = true;
              if (refRange.low && val < refRange.low.value) isAbnormal = true;
            }

            return (
              <div
                key={obsId}
                id={`Observation-${obsId}`}
                className={`py-3 px-2 flex items-center justify-between rounded-xl transition ${
                  isHighlighted ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-black/[0.02]"
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-[#1d1d1f] block">{title}</span>
                  <span className="text-[11px] text-[#86868b]">{effDate}</span>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="text-sm font-semibold text-[#1d1d1f]">
                    {val} <span className="text-xs font-normal text-[#86868b]">{unitStr}</span>
                  </div>
                  {isAbnormal && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                      High
                    </span>
                  )}
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
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-4">Record Lab Result</h3>

            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Common Lab Preset</label>
                <select
                  onChange={(e) => {
                    const sel = commonLabs.find(l => l.code === e.target.value);
                    if (sel) {
                      setCode(sel.code);
                      setDisplay(sel.display);
                      setUnit(sel.unit);
                      setValue(sel.defaultValue);
                    }
                  }}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 bg-[#fcfcfd]"
                >
                  <option value="">Select a common lab test...</option>
                  {commonLabs.map(l => (
                    <option key={l.code} value={l.code}>{l.display}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1">Test Name</label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#86868b] mb-1">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868b] mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3]"
                    required
                  />
                </div>
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
