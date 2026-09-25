"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

interface CitationChipProps {
  resourceType: string;
  id: string;
  summary: string;
  onSelectCitation?: (resourceType: string, id: string) => void;
}

export function CitationChip({ resourceType, id, summary, onSelectCitation }: CitationChipProps) {
  const handleClick = () => {
    if (onSelectCitation) {
      onSelectCitation(resourceType, id);
    } else {
      const elementId = `${resourceType}-${id}`;
      const elem = document.getElementById(elementId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08] transition cursor-pointer"
    >
      <span className="truncate max-w-[200px]">{summary || `${resourceType}/${id}`}</span>
      <ArrowUpRight className="w-3 h-3 text-[#86868b]" />
    </button>
  );
}
