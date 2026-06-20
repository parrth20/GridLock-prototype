"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { postAssistant } from "@/lib/api-client";
import { useDashboardStore } from "@/lib/store";
import type { AssistantResponse } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  text: string;
  data?: AssistantResponse;
}

const STARTERS = [
  "Which zones have the highest risk?",
  "Why is this zone critical?",
  "What is the best enforcement window?",
  "Generate a patrol plan for two units.",
  "Explain the risk methodology.",
  "What are the system limitations?",
];

const BASIS_STYLE: Record<string, string> = {
  observed: "border-cyan-400/30 text-cyan-300",
  calculated: "border-amber-400/30 text-amber-300",
  forecast: "border-violet-400/30 text-violet-300",
};

export function SahayakAssistant() {
  const open = useDashboardStore((s) => s.assistantOpen);
  const setOpen = useDashboardStore((s) => s.setAssistantOpen);
  const toggle = useDashboardStore((s) => s.toggleAssistant);
  const selected = useDashboardStore((s) => s.selectedHotspot);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Namaskara! I'm ClearLane Sahayak. Ask me anything about Bengaluru's parking data — the riskiest spots, the best time to send patrols, or a quick patrol plan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await postAssistant({
        message: trimmed,
        selectedHotspotId: selected?.id ?? null,
      });
      setMessages((m) => [...m, { role: "assistant", text: res.answer, data: res }]);
      setSuggestions(res.suggestedQuestions.length ? res.suggestedQuestions : STARTERS);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Sorry — I couldn't answer that (${(e as Error).message}).` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close ClearLane Sahayak" : "Open ClearLane Sahayak"}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-3 z-50 flex h-[72vh] max-h-[640px] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0d121c] shadow-2xl sm:right-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a0e16] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">ClearLane Sahayak</p>
                <p className="text-[11px] text-slate-500">Bengaluru traffic intelligence assistant</p>
              </div>
            </div>
            <span className="rounded border border-cyan-400/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan-300">
              AI
            </span>
          </div>

          {selected && (
            <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-2 text-[11px] text-slate-400">
              Context: <span className="text-cyan-300">{selected.name}</span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="cl-scroll flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-slate-800 bg-slate-900/60 text-slate-200"
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>

                  {m.data && m.data.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5 border-t border-slate-700/60 pt-2 text-[13px] text-slate-300">
                      {m.data.bullets.map((b, j) => (
                        <li key={j} className="flex gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" /> {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {m.data && m.data.sources.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-slate-700/60 pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                      {m.data.sources.map((s, j) => (
                        <div key={j} className="flex items-start justify-between gap-2 text-[11px]">
                          <span className="text-slate-500">{s.label}</span>
                          <span className="flex items-center gap-1.5 text-right text-slate-300">
                            {s.value}
                            {s.basis && (
                              <span className={`rounded border px-1 py-0.5 text-[8px] font-semibold uppercase ${BASIS_STYLE[s.basis]}`}>
                                {s.basis}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.data?.disclaimer && (
                    <p className="mt-2 text-[10px] italic text-slate-500">{m.data.disclaimer}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <Dot delay="0s" /><Dot delay="0.15s" /><Dot delay="0.3s" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="cl-scroll flex gap-2 overflow-x-auto border-t border-slate-800 px-3 py-2">
            {suggestions.slice(0, 5).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-800 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the dashboard…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-slate-500"
      style={{ animationDelay: delay }}
    />
  );
}
