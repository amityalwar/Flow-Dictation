import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Copy, Check, Trash2 } from "lucide-react";

interface DictationRecord {
  id: number;
  created_at: string;
  audio_source: string;
  format_style: string;
  raw_transcript: string;
  formatted_text: string;
  duration_seconds: number;
}

export function HistoryView() {
  const [records, setRecords] = useState<DictationRecord[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadHistory = () => {
    invoke<DictationRecord[]>("get_history", { limit: 50 })
      .then(setRecords)
      .catch(console.error);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCopy = async (text: string, id: number) => {
    await invoke("copy_to_clipboard", { text });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    await invoke("delete_dictation", { id });
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const styleLabel: Record<string, string> = {
    clean_grammar: "Grammar",
    professional_email: "Email",
    bullet_points: "Bullets",
    meeting_notes: "Notes",
    casual_message: "Casual",
    technical_doc: "Tech",
    raw: "Raw",
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 animate-m3-enter">
        <p className="text-[14px]" style={{ color: "var(--md-on-surface-variant)", opacity: 0.5 }}>
          No dictations yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex max-h-52 flex-col overflow-y-auto rounded-[16px] animate-m3-enter"
      style={{ background: "var(--md-surface-container)" }}
    >
      {records.map((r, i) => (
        <div
          key={r.id}
          className="group flex flex-col gap-1 px-4 py-3 transition-colors duration-150"
          style={{
            borderTop: i > 0 ? "1px solid var(--md-outline-variant)" : "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--md-surface-container-high)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color: "var(--md-on-surface-variant)" }}>
                {formatDate(r.created_at)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: "var(--md-surface-container-highest)",
                  color: "var(--md-on-surface-variant)",
                }}
              >
                {styleLabel[r.format_style] || r.format_style}
              </span>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onClick={() => handleCopy(r.formatted_text, r.id)}
                className="rounded-full p-1.5 transition-all hover:opacity-80 active:scale-90"
                style={{ color: copiedId === r.id ? "var(--md-primary)" : "var(--md-on-surface-variant)" }}
              >
                {copiedId === r.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="rounded-full p-1.5 transition-all hover:opacity-80 active:scale-90"
                style={{ color: "var(--md-error)" }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="line-clamp-2 text-[13px] leading-[1.5]" style={{ color: "var(--md-on-surface)", opacity: 0.7 }}>
            {r.formatted_text}
          </p>
        </div>
      ))}
    </div>
  );
}
