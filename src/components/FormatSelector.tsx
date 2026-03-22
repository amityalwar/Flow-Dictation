import type { FormatStyle } from "../App";
import { ChevronDown } from "lucide-react";

interface FormatSelectorProps {
  value: FormatStyle;
  onChange: (style: FormatStyle) => void;
  disabled?: boolean;
}

const FORMAT_OPTIONS: { value: FormatStyle; label: string }[] = [
  { value: "clean_grammar", label: "Clean Grammar" },
  { value: "professional_email", label: "Professional Email" },
  { value: "bullet_points", label: "Bullet Points" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "casual_message", label: "Casual Message" },
  { value: "technical_doc", label: "Technical Doc" },
  { value: "raw", label: "Raw Transcript" },
];

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormatStyle)}
        disabled={disabled}
        className="appearance-none rounded-full px-3 py-[6px] pr-7 text-[12px] font-medium
          outline-none transition-all duration-200
          hover:opacity-90
          disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: "var(--md-surface-container-highest)",
          color: "var(--md-on-surface-variant)",
        }}
      >
        {FORMAT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: "var(--md-surface-container)", color: "var(--md-on-surface)" }}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
        style={{ color: "var(--md-on-surface-variant)" }}
      />
    </div>
  );
}
