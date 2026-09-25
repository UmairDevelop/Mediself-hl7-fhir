"use client";

import React, { useState } from "react";
import { Send, X, Loader2, MessageSquare } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { CitationChip } from "./CitationChip";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: Array<{ resourceType: string; id: string; summary: string }>;
  timestamp: string;
}

interface ChatPanelProps {
  patientId: string;
  patientName: string;
  onClose?: () => void;
  onSelectCitation?: (resourceType: string, id: string) => void;
}

export function ChatPanel({ patientId, patientName, onClose, onSelectCitation }: ChatPanelProps) {
  const user = getStoredUser();
  const canUseChat = user?.role === "PHYSICIAN" || user?.role === "NURSE" || user?.role === "ADMIN";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello ${user?.name?.split(" ")[0] || "Clinician"}. How can I assist you with ${patientName}'s clinical chart?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const presets = [
    "Latest lab results?",
    "List active medications",
    "Allergy alert history",
    "Problem list summary"
  ];

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || question;
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const data = await apiFetch(`/patients/${patientId}/chat`, {
        method: "POST",
        body: JSON.stringify({ question: queryText })
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.answer,
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: `Error: ${err.message || "Unable to query patient record"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!canUseChat) {
    return (
      <div className="bg-white rounded-2xl border border-black/[0.06] p-6 text-center text-xs text-[#86868b]">
        AI Assistant query capability requires a Clinical role.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl flex flex-col h-[580px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-black/[0.06] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center text-[#0071e3]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">Clinical AI Assistant</h3>
            <p className="text-xs text-[#86868b]">{patientName} ({patientId})</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04] rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f5f5f7]/60">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                msg.sender === "user"
                  ? "bg-[#0071e3] text-white rounded-br-none"
                  : "bg-white border border-black/[0.06] text-[#1d1d1f] rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-black/[0.04]">
                  <div className="text-[10px] font-medium text-[#86868b] mb-1">
                    Source Citations:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((cit, idx) => (
                      <CitationChip
                        key={`${cit.resourceType}-${cit.id}-${idx}`}
                        resourceType={cit.resourceType}
                        id={cit.id}
                        summary={cit.summary}
                        onSelectCitation={onSelectCitation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-[#86868b] mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#86868b] text-xs py-2 px-3 bg-white rounded-xl border border-black/[0.06] w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071e3]" />
            Searching chart data...
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="px-3 py-2 bg-white border-t border-black/[0.04] flex items-center gap-1.5 overflow-x-auto text-xs">
        {presets.map((preset, i) => (
          <button
            key={i}
            onClick={() => handleSend(preset)}
            className="whitespace-nowrap px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] hover:bg-black/[0.06] transition font-medium text-xs"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-black/[0.06]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a plain-English question about this patient..."
            className="flex-1 text-xs bg-[#f5f5f7] border border-black/[0.06] rounded-full px-4 py-2.5 focus:outline-none focus:border-[#0071e3]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="p-2.5 bg-[#0071e3] text-white rounded-full hover:bg-[#0077ed] disabled:opacity-40 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
