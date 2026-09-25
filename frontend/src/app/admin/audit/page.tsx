"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [patientFilter, setPatientFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const url = "/admin/audit" + (patientFilter.trim() ? `?patient_id=${encodeURIComponent(patientFilter.trim())}` : "");
      const data = await apiFetch(url);
      setLogs(data.audit_entries || []);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#1d1d1f]">Compliance Audit Logs</h2>
        <p className="text-xs text-[#86868b]">Immutable record of all patient data accesses, searches, and AI-generated clinical summaries.</p>
      </div>

      <form onSubmit={handleFilter} className="flex items-center gap-3">
        <input
          type="text"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          placeholder="Filter logs by Patient ID..."
          className="text-xs border border-black/[0.1] rounded-xl px-3 py-2 bg-white flex-1 max-w-sm focus:outline-none focus:border-[#0071e3]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#0071e3] text-white font-medium text-xs rounded-full hover:bg-[#0077ed] transition"
        >
          Filter
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[#86868b] text-xs">Loading compliance audit logs...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5f5f7] border-b border-black/[0.04] text-[#86868b] font-medium">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1d1d1f]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#86868b]">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((e) => (
                  <tr key={e.id} className="hover:bg-black/[0.02]">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#86868b]">{e.createdAt.slice(0, 19).replace("T", " ")}</td>
                    <td className="py-3 px-4 font-medium">{e.userName}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-black/[0.04] text-[10px] font-medium">{e.userRole}</span></td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#0071e3] font-medium">{e.patientId}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{e.action}</td>
                    <td className="py-3 px-4 text-[#86868b] max-w-xs truncate font-mono text-[11px]">{JSON.stringify(e.detail)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
