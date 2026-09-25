"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function AdminTokensPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    setError("");
    try {
      const mData = await apiFetch("/admin/metrics");
      setMetrics(mData);
    } catch (err: any) {
      setError(err.message || "Failed to load API & token usage metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">API Usage & Token Analytics</h2>
          <p className="text-xs text-[#86868b]">Monitor AI model requests, token consumption, latency, and estimated cost.</p>
        </div>
        <button
          onClick={loadMetrics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/[0.08] hover:bg-black/[0.02] text-[#1d1d1f] text-xs font-medium rounded-full shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#86868b] text-xs">
          Fetching API usage metrics and token analytics...
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Metric Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs">
              <div className="text-[11px] font-medium text-[#86868b]">Total AI Requests</div>
              <div className="text-2xl font-bold text-[#1d1d1f] mt-1">
                {metrics.summary.total_requests}
              </div>
              <div className="text-[10px] text-[#86868b] mt-1">
                Avg Latency: {metrics.summary.avg_latency_ms} ms
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs">
              <div className="text-[11px] font-medium text-[#86868b]">Prompt Tokens</div>
              <div className="text-2xl font-bold text-[#1d1d1f] mt-1">
                {metrics.summary.total_prompt_tokens.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#86868b] mt-1">
                Input token consumption
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs">
              <div className="text-[11px] font-medium text-[#86868b]">Candidate Tokens</div>
              <div className="text-2xl font-bold text-[#1d1d1f] mt-1">
                {metrics.summary.total_candidate_tokens.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#86868b] mt-1">
                Output token generation
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs">
              <div className="text-[11px] font-medium text-[#86868b]">Total Combined Tokens</div>
              <div className="text-2xl font-bold text-[#0071e3] mt-1">
                {metrics.summary.total_tokens.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#86868b] mt-1">
                Est. Cost: ${metrics.summary.estimated_cost_usd} USD
              </div>
            </div>
          </div>

          {/* Model Status Banner */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-semibold text-[#1d1d1f] block">Active AI Model Engine</span>
              <span className="text-xs text-[#86868b] mt-0.5">{metrics.summary.active_mode}</span>
            </div>

            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              metrics.summary.has_gemini_key
                ? "bg-blue-50 text-[#0071e3] border border-blue-100"
                : "bg-black/[0.04] text-[#1d1d1f]"
            }`}>
              {metrics.summary.has_gemini_key ? "Cloud Gemini 3.6 API" : "Offline Fallback Mode"}
            </span>
          </div>

          {/* Clinician User Token Usage Table */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-black/[0.04] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#1d1d1f]">Clinician Token Usage Breakdown</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5f5f7] border-b border-black/[0.04] text-[#86868b] font-medium">
                <tr>
                  <th className="py-2.5 px-4">Clinician Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4 text-center">Requests</th>
                  <th className="py-2.5 px-4 text-right">Total Tokens Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1d1d1f]">
                {metrics.user_breakdown.map((u: any, idx: number) => (
                  <tr key={idx} className="hover:bg-black/[0.02]">
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-[#86868b] font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4 text-center font-semibold">{u.requests}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#0071e3]">{u.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent API Call Logs */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-black/[0.04]">
              <h3 className="text-xs font-semibold text-[#1d1d1f]">Recent API Execution Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f5f7] border-b border-black/[0.04] text-[#86868b] font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Clinician</th>
                    <th className="py-2.5 px-4">Patient ID</th>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4 text-right">Prompt Tokens</th>
                    <th className="py-2.5 px-4 text-right">Output Tokens</th>
                    <th className="py-2.5 px-4 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] text-[#1d1d1f]">
                  {metrics.usage_logs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-black/[0.02]">
                      <td className="py-2.5 px-4 text-[#86868b] font-mono text-[11px]">{l.createdAt.slice(0, 19).replace("T", " ")}</td>
                      <td className="py-2.5 px-4 font-medium">{l.userName}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#0071e3]">{l.patientId}</td>
                      <td className="py-2.5 px-4 text-[11px]">{l.modelName}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#86868b]">{l.promptTokens}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#86868b]">{l.candidateTokens}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">{l.latencyMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
