"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { apiFetch } from "@/lib/api";
import { Search, ChevronRight } from "lucide-react";

export default function SearchPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPatients = async (searchTerm: string = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/patients/search?q=${encodeURIComponent(searchTerm)}`);
      setPatients(data.patients || []);
    } catch (err: any) {
      setError(err.message || "Failed to load patient directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients("");
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(query);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Minimal Search Header */}
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
            Patient Directory
          </h1>
          <p className="text-xs text-[#86868b] mt-1">
            Search patient records by name or MRN
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6 relative">
            <Search className="w-4 h-4 text-[#86868b] absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or MRN..."
              className="w-full pl-11 pr-24 py-2.5 text-xs bg-white border border-black/[0.08] rounded-full focus:outline-none focus:border-[#0071e3] transition shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-4 py-1.5 bg-[#0071e3] text-white font-medium text-xs rounded-full hover:bg-[#0077ed] transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#86868b] text-xs">
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center text-xs text-[#86868b]">
            No patient records match your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {patients.map((p) => {
              const nameObj = p.name?.[0] || {};
              const fullName = `${nameObj.given?.join(" ") || ""} ${nameObj.family || ""}`.trim() || "Unknown Patient";
              const mrn = p.identifier?.[0]?.value || p.id;
              const gender = p.gender || "unspecified";
              const birthDate = p.birthDate || "N/A";

              return (
                <Link
                  key={p.id}
                  href={`/patient/${p.id}`}
                  className="bg-white rounded-2xl border border-black/[0.06] p-5 hover:border-black/[0.15] hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
                        {gender}
                      </span>
                      <span className="text-[10px] font-mono bg-black/[0.04] text-[#1d1d1f] px-2 py-0.5 rounded-full">
                        {mrn}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition">
                      {fullName}
                    </h3>
                    <p className="text-xs text-[#86868b] mt-0.5">
                      DOB: {birthDate}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-black/[0.04] flex items-center justify-between text-xs font-medium text-[#0071e3]">
                    <span>View Chart</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
