"use client";

import React, { useEffect, useState, use } from "react";
import { Navbar } from "@/components/Navbar";
import { PatientHeader } from "@/components/PatientHeader";
import { ConditionSection } from "@/components/ConditionSection";
import { MedicationSection } from "@/components/MedicationSection";
import { ObservationSection } from "@/components/ObservationSection";
import { AllergySection } from "@/components/AllergySection";
import { EncounterSection } from "@/components/EncounterSection";
import { ChatPanel } from "@/components/ChatPanel";
import { apiFetch, getStoredUser } from "@/lib/api";
import { MessageSquare, AlertCircle } from "lucide-react";

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [patient, setPatient] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");

  const user = getStoredUser();
  const isFrontDesk = user?.role === "FRONT_DESK";

  const loadAllChartData = async () => {
    setLoading(true);
    setError("");
    try {
      const pData = await apiFetch(`/patients/${patientId}`);
      setPatient(pData);

      if (!isFrontDesk) {
        const [cData, mData, oData, aData, eData] = await Promise.all([
          apiFetch(`/patients/${patientId}/conditions`).catch(() => ({ conditions: [] })),
          apiFetch(`/patients/${patientId}/medications`).catch(() => ({ medications: [] })),
          apiFetch(`/patients/${patientId}/observations`).catch(() => ({ observations: [] })),
          apiFetch(`/patients/${patientId}/allergies`).catch(() => ({ allergies: [] })),
          apiFetch(`/patients/${patientId}/encounters`).catch(() => ({ encounters: [] }))
        ]);

        setConditions(cData.conditions || []);
        setMedications(mData.medications || []);
        setObservations(oData.observations || []);
        setAllergies(aData.allergies || []);
        setEncounters(eData.encounters || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load patient chart data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllChartData();
  }, [patientId]);

  const handleSelectCitation = (resourceType: string, id: string) => {
    setHighlightId(id);
    const elementId = `${resourceType}-${id}`;
    const elem = document.getElementById(elementId);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightId(""), 4000);
  };

  const nameObj = patient?.name?.[0] || {};
  const patientName = `${nameObj.given?.join(" ") || ""} ${nameObj.family || ""}`.trim() || "Patient";

  return (
    <div className="min-h-screen bg-[#f5f5f7] relative pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[#86868b] text-xs">
            Retrieving patient chart records...
          </div>
        ) : (
          <>
            {/* Demographics Header */}
            <PatientHeader patient={patient} onRefresh={loadAllChartData} />

            {/* Front Desk Restriction Warning */}
            {isFrontDesk ? (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 text-amber-900 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-semibold">Demographics Access Only</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Front Desk registration accounts have access to patient demographic details only. Clinical charts and AI assistance require a Clinical role.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Clinical Sections (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                  <ConditionSection
                    patientId={patientId}
                    conditions={conditions}
                    onRefresh={loadAllChartData}
                    highlightId={highlightId}
                  />

                  <MedicationSection
                    patientId={patientId}
                    medications={medications}
                    onRefresh={loadAllChartData}
                    highlightId={highlightId}
                  />

                  <ObservationSection
                    patientId={patientId}
                    observations={observations}
                    onRefresh={loadAllChartData}
                    highlightId={highlightId}
                  />
                </div>

                {/* Sidebar Clinical Sections (1/3 width) */}
                <div className="space-y-6">
                  <AllergySection
                    patientId={patientId}
                    allergies={allergies}
                    onRefresh={loadAllChartData}
                    highlightId={highlightId}
                  />

                  <EncounterSection
                    patientId={patientId}
                    encounters={encounters}
                    onRefresh={loadAllChartData}
                    highlightId={highlightId}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Prominent Center-Bottom Floating AI Assistant Button */}
      {!isFrontDesk && !isChatOpen && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2.5 px-7 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm rounded-full shadow-2xl shadow-blue-500/30 border border-black/[0.08] transition hover:scale-105 active:scale-95"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Ask Clinical Assistant</span>
          </button>
        </div>
      )}

      {/* Centered Modal Overlay AI Chat Drawer */}
      {!isFrontDesk && isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl">
            <ChatPanel
              patientId={patientId}
              patientName={patientName}
              onClose={() => setIsChatOpen(false)}
              onSelectCitation={handleSelectCitation}
            />
          </div>
        </div>
      )}
    </div>
  );
}
