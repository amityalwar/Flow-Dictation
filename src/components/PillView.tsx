import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Square, Mic, Loader2 } from "lucide-react";

type PillState = "idle" | "recording" | "transcribing" | "formatting" | "done";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PillView() {
  const [hovered, setHovered] = useState(false);
  const [state, setState] = useState<PillState>("idle");
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);

  // Listen for state changes from the main window
  useEffect(() => {
    const unlistens = [
      listen("pill-state-update", (event) => {
        const payload = event.payload as { state: PillState };
        setState(payload.state);
      }),
    ];
    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  // Duration counter
  useEffect(() => {
    if (state !== "recording") {
      setDuration(0);
      durationRef.current = 0;
      return;
    }
    const interval = setInterval(() => {
      durationRef.current += 1;
      setDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  const handleRestore = useCallback(async () => {
    try {
      await invoke("restore_from_pill");
    } catch (e) {
      console.error("Failed to restore:", e);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    try {
      // Emit to main window to stop recording
      const { emit } = await import("@tauri-apps/api/event");
      await emit("toggle-recording");
    } catch (e) {
      console.error("Failed to stop:", e);
    }
  }, []);

  const isRecording = state === "recording";
  const isProcessing = state === "transcribing" || state === "formatting";

  return (
    <div
      className="h-full w-full flex items-center justify-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 rounded-full cursor-pointer overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{
          background: isRecording
            ? "var(--md-tertiary-container)"
            : "var(--md-surface-container-high)",
          padding: hovered ? "6px 14px 6px 16px" : "6px 12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
        onClick={isRecording ? undefined : handleRestore}
      >
        {/* Status indicator dot / icon */}
        {isRecording ? (
          <>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ background: "var(--md-on-tertiary-container)" }}
              />
              <span
                className="text-[13px] font-medium tabular-nums"
                style={{ color: "var(--md-on-tertiary-container)" }}
              >
                {formatDuration(duration)}
              </span>
            </div>

            {/* Stop button — visible on hover */}
            <div
              className="transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden"
              style={{
                width: hovered ? "32px" : "0px",
                opacity: hovered ? 1 : 0,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStopRecording();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full ml-1 transition-all active:scale-90"
                style={{
                  background: "var(--md-on-tertiary-container)",
                }}
              >
                <Square
                  className="h-3 w-3"
                  fill="var(--md-tertiary-container)"
                  stroke="var(--md-tertiary-container)"
                  strokeWidth={0}
                />
              </button>
            </div>
          </>
        ) : isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2
              className="h-4 w-4 animate-m3-spin"
              style={{ color: "var(--md-primary)" }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--md-on-surface-variant)" }}
            >
              Processing...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4" style={{ color: "var(--md-primary)" }} />
            {hovered && (
              <span
                className="text-[12px] font-medium whitespace-nowrap"
                style={{ color: "var(--md-on-surface)" }}
              >
                Flow
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
