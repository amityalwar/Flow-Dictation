import { Mic, Square, Loader2 } from "lucide-react";
import type { AppState } from "../App";

interface RecordingIndicatorProps {
  state: AppState;
  duration: number;
  onClick: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordingIndicator({ state, duration, onClick }: RecordingIndicatorProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "transcribing" || state === "formatting";
  const canClick = state === "idle" || state === "done" || state === "recording";

  return (
    <div className="relative flex flex-col items-center gap-4 py-2">
      {/* M3 ripple ring */}
      {isRecording && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+8px)]">
          <div
            className="h-[100px] w-[100px] rounded-[28px] animate-m3-ripple"
            style={{ border: "2px solid var(--md-primary)", opacity: 0.3 }}
          />
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={canClick ? onClick : undefined}
        disabled={!canClick}
        className={`
          relative flex items-center justify-center rounded-[28px]
          transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
          ${isRecording
            ? "h-[80px] w-[80px] animate-m3-pulse"
            : isProcessing
              ? "h-[80px] w-[80px]"
              : "h-[80px] w-[80px] hover:shadow-[0_6px_10px_rgba(0,0,0,0.3),0_1px_18px_rgba(0,0,0,0.25)] active:scale-95"
          }
          ${canClick ? "cursor-pointer" : "cursor-default"}
          shadow-[0_3px_5px_rgba(0,0,0,0.2),0_1px_10px_rgba(0,0,0,0.15)]
        `}
        style={{
          background: isRecording
            ? "var(--md-tertiary-container)"
            : isProcessing
              ? "var(--md-surface-container-high)"
              : "var(--md-primary-container)",
        }}
      >
        {isRecording ? (
          <div className="flex flex-col items-center gap-1">
            <Square
              className="h-5 w-5"
              fill="var(--md-on-tertiary-container)"
              stroke="var(--md-on-tertiary-container)"
              strokeWidth={0}
            />
            <span
              className="text-[11px] font-medium tabular-nums"
              style={{ color: "var(--md-on-tertiary-container)" }}
            >
              {formatDuration(duration)}
            </span>
          </div>
        ) : isProcessing ? (
          <Loader2
            className="h-6 w-6 animate-m3-spin"
            style={{ color: "var(--md-on-surface-variant)" }}
          />
        ) : (
          <Mic
            className="h-7 w-7"
            style={{ color: "var(--md-on-primary-container)" }}
          />
        )}
      </button>
    </div>
  );
}

export { formatDuration };
