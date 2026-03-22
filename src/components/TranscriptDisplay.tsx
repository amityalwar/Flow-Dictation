import { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import type { AppState } from "../App";

interface TranscriptDisplayProps {
  rawTranscript: string;
  formattedText: string;
  state: AppState;
}

export function TranscriptDisplay({ rawTranscript, formattedText, state }: TranscriptDisplayProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayText = formattedText || rawTranscript;

  const handleCopy = async () => {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback handled by backend
    }
  };

  return (
    <div
      className="flex flex-col rounded-[16px] overflow-hidden animate-m3-enter"
      style={{ background: "var(--md-surface-container)" }}
    >
      {/* Body */}
      <div
        className="max-h-28 overflow-y-auto px-4 py-3 text-[14px] leading-[1.6] whitespace-pre-wrap"
        style={{ color: "var(--md-on-surface)" }}
      >
        {displayText}
      </div>

      {/* Actions row */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ borderTop: "1px solid var(--md-outline-variant)" }}
      >
        {/* Copy — tonal icon button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[12px] font-medium
            transition-all duration-200 hover:opacity-80 active:scale-95"
          style={{
            color: copied ? "var(--md-primary)" : "var(--md-on-surface-variant)",
          }}
        >
          {copied ? (
            <><Check className="h-4 w-4" /> Copied</>
          ) : (
            <><Copy className="h-4 w-4" /> Copy</>
          )}
        </button>

        {formattedText && rawTranscript && formattedText !== rawTranscript && (
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1 rounded-full px-3 py-[6px] text-[12px] font-medium
              transition-all duration-200 hover:opacity-80 active:scale-95"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showRaw ? "Hide raw" : "Show raw"}
          </button>
        )}
      </div>

      {/* Raw transcript expand */}
      {showRaw && (
        <div
          className="px-4 py-3 text-[12px] leading-[1.6] whitespace-pre-wrap animate-m3-enter"
          style={{
            borderTop: "1px solid var(--md-outline-variant)",
            color: "var(--md-on-surface-variant)",
          }}
        >
          {rawTranscript}
        </div>
      )}

      {/* Done confirmation */}
      {state === "done" && (
        <div
          className="py-2.5 text-center text-[12px] font-medium"
          style={{
            borderTop: "1px solid var(--md-outline-variant)",
            color: "var(--md-primary)",
          }}
        >
          Auto-copied to clipboard
        </div>
      )}
    </div>
  );
}
