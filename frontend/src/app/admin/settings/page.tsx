"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Key, Server, Check } from "lucide-react";

export default function AdminSettingsPage() {
  const [sysSettings, setSysSettings] = useState<any>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [newFhirUrl, setNewFhirUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const sData = await apiFetch("/admin/settings");
      setSysSettings(sData);
      setNewFhirUrl(sData.fhir_server_url || "");
    } catch (err: any) {
      setError(err.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveMessage("");
    setError("");

    try {
      const payload: any = {};
      if (newApiKey.trim()) payload.gemini_api_key = newApiKey.trim();
      if (newFhirUrl.trim()) payload.fhir_server_url = newFhirUrl.trim();

      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setSaveMessage("Settings saved successfully.");
      setNewApiKey("");
      const sData = await apiFetch("/admin/settings");
      setSysSettings(sData);
    } catch (err: any) {
      setError(err.message || "Failed to update system settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#1d1d1f]">System & AI Settings</h2>
        <p className="text-xs text-[#86868b]">Configure global parameters for Google Gemini AI model integration and FHIR server base endpoint.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[#86868b] text-xs">Loading system settings...</div>
      ) : sysSettings ? (
        <div className="max-w-2xl bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs">
          {saveMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" /> {saveMessage}
            </div>
          )}

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                Google Gemini API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[#86868b] absolute left-3 top-3" />
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={sysSettings.has_gemini_key ? `Configured (${sysSettings.gemini_api_key_masked})` : "Enter your Google Gemini API Key..."}
                  className="w-full pl-10 text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3] bg-[#fcfcfd]"
                />
              </div>
              <p className="text-[11px] text-[#86868b] mt-1">
                Currently: <strong className="text-[#1d1d1f]">{sysSettings.has_gemini_key ? "Live Gemini 3.6 API Key Active" : "No Key Set (Using Local Fallback Engine)"}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                FHIR Server Base URL
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-[#86868b] absolute left-3 top-3" />
                <input
                  type="text"
                  value={newFhirUrl}
                  onChange={(e) => setNewFhirUrl(e.target.value)}
                  className="w-full pl-10 text-xs border border-black/[0.1] rounded-xl p-2.5 focus:outline-none focus:border-[#0071e3] bg-[#fcfcfd]"
                />
              </div>

              {/* Live Connection Health Badge */}
              {sysSettings.fhir_health && (
                <div className="mt-3 p-3.5 bg-[#f5f5f7] border border-black/[0.06] rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1d1d1f] flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${sysSettings.fhir_health.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      Live FHIR Server Ping:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      sysSettings.fhir_health.status === 'connected' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {sysSettings.fhir_health.status === 'connected' ? 'CONNECTED & OPERATIONAL' : 'OFFLINE / FALLBACK'}
                    </span>
                  </div>

                  {sysSettings.fhir_health.status === 'connected' && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-[#86868b] pt-1">
                      <div>Engine: <strong className="text-[#1d1d1f]">{sysSettings.fhir_health.software_name}</strong></div>
                      <div>Spec Version: <strong className="text-[#1d1d1f]">{sysSettings.fhir_health.fhir_version}</strong></div>
                      <div>Latency: <strong className="text-[#0071e3]">{sysSettings.fhir_health.latency_ms} ms</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-black/[0.04] flex items-center justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2 bg-[#0071e3] text-white font-medium text-xs rounded-full hover:bg-[#0077ed] disabled:opacity-50 transition shadow-xs"
              >
                {savingSettings ? "Saving Settings..." : "Save System Settings"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
