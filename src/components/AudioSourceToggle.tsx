import type { AudioSource } from "../App";
import { Mic, Monitor, Combine } from "lucide-react";

interface AudioSourceToggleProps {
  value: AudioSource;
  onChange: (source: AudioSource) => void;
  disabled?: boolean;
}

const SOURCES: { value: AudioSource; label: string; icon: typeof Mic }[] = [
  { value: "microphone", label: "Mic", icon: Mic },
  { value: "system", label: "System", icon: Monitor },
  { value: "both", label: "Both", icon: Combine },
];

export function AudioSourceToggle({ value, onChange, disabled }: AudioSourceToggleProps) {
  return (
    <div
      className="flex rounded-full overflow-hidden"
      style={{ border: "1px solid var(--md-outline)" }}
    >
      {SOURCES.map(({ value: src, label, icon: Icon }, i) => (
        <button
          key={src}
          onClick={() => onChange(src)}
          disabled={disabled}
          className={`
            relative flex flex-1 items-center justify-center gap-1.5 py-[10px] text-[13px] font-medium
            transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
          style={{
            background: value === src ? "var(--md-secondary-container)" : "transparent",
            color: value === src ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)",
            borderLeft: i > 0 ? "1px solid var(--md-outline)" : "none",
          }}
        >
          <Icon className="h-[16px] w-[16px]" strokeWidth={value === src ? 2.2 : 1.5} />
          {label}
        </button>
      ))}
    </div>
  );
}
