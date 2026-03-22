import type { AppState } from "../App";

interface StatusBarProps {
  state: AppState;
}

const STATUS_CONFIG: Record<AppState, { text: string; style: React.CSSProperties }> = {
  idle: {
    text: "Tap to record or Alt+Shift+D",
    style: { color: "var(--md-on-surface-variant)", opacity: 0.6 },
  },
  recording: {
    text: "Listening...",
    style: { color: "var(--md-tertiary)" },
  },
  transcribing: {
    text: "Transcribing...",
    style: { color: "var(--md-primary)" },
  },
  formatting: {
    text: "Formatting with AI...",
    style: { color: "var(--md-primary)" },
  },
  done: {
    text: "Copied to clipboard",
    style: { color: "var(--md-primary)" },
  },
};

export function StatusBar({ state }: StatusBarProps) {
  const { text, style } = STATUS_CONFIG[state];

  return (
    <p
      className="text-center text-[13px] font-normal transition-all duration-300"
      style={style}
    >
      {text}
    </p>
  );
}
