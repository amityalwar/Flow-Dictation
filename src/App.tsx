import { useState, useEffect, useCallback, useRef } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { FloatingPanel } from "./components/FloatingPanel";
import { RecordingIndicator } from "./components/RecordingIndicator";
import { FormatSelector } from "./components/FormatSelector";
import { AudioSourceToggle } from "./components/AudioSourceToggle";
import { TranscriptDisplay } from "./components/TranscriptDisplay";
import { StatusBar } from "./components/StatusBar";
import { SettingsView } from "./components/SettingsView";
import { HistoryView } from "./components/HistoryView";
import { PillView } from "./components/PillView";
import { Settings, Clock, Minus } from "lucide-react";

export type AppState = "idle" | "recording" | "transcribing" | "formatting" | "done";
export type AudioSource = "microphone" | "system" | "both";
export type FormatStyle =
  | "clean_grammar"
  | "professional_email"
  | "bullet_points"
  | "meeting_notes"
  | "casual_message"
  | "technical_doc"
  | "raw";

type View = "main" | "settings" | "history";

// Check if this is the pill window
const isPillView = new URLSearchParams(window.location.search).get("view") === "pill";

function App() {
  if (isPillView) {
    return <PillView />;
  }
  return <MainApp />;
}

function MainApp() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [audioSource, setAudioSource] = useState<AudioSource>("microphone");
  const [formatStyle, setFormatStyle] = useState<FormatStyle>("clean_grammar");
  const [rawTranscript, setRawTranscript] = useState("");
  const [formattedText, setFormattedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [view, setView] = useState<View>("main");
  const durationRef = useRef(0);

  // Sync state to pill window
  useEffect(() => {
    emit("pill-state-update", { state: appState }).catch(() => {});
  }, [appState]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRawTranscript("");
      setFormattedText("");
      durationRef.current = 0;
      await invoke("start_recording", { source: audioSource });
      setAppState("recording");
    } catch (e) {
      setError(`Failed to start recording: ${e}`);
    }
  }, [audioSource]);

  const stopRecording = useCallback(async () => {
    try {
      const duration = durationRef.current;
      setAppState("transcribing");
      const transcript = await invoke<string>("stop_and_transcribe");
      setRawTranscript(transcript);

      let finalText = transcript;
      if (formatStyle === "raw") {
        setFormattedText(transcript);
        await invoke("copy_to_clipboard", { text: transcript });
      } else {
        setAppState("formatting");
        const formatted = await invoke<string>("format_text", {
          transcript,
          style: formatStyle,
        });
        setFormattedText(formatted);
        finalText = formatted;
        await invoke("copy_to_clipboard", { text: formatted });
      }

      await invoke("save_dictation", {
        audioSource,
        formatStyle,
        rawTranscript: transcript,
        formattedText: finalText,
        durationSeconds: duration,
      }).catch((e: unknown) => console.log("Failed to save to history:", e));

      setAppState("done");
    } catch (e) {
      setError(`Processing failed: ${e}`);
      setAppState("idle");
    }
  }, [formatStyle, audioSource]);

  const toggleRecording = useCallback(() => {
    if (appState === "idle" || appState === "done") {
      startRecording();
    } else if (appState === "recording") {
      stopRecording();
    }
  }, [appState, startRecording, stopRecording]);

  useEffect(() => {
    const unlisten = listen("toggle-recording", () => {
      toggleRecording();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [toggleRecording]);

  useEffect(() => {
    if (appState !== "recording") {
      setRecordingDuration(0);
      return;
    }
    const interval = setInterval(() => {
      durationRef.current += 1;
      setRecordingDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [appState]);

  const handleMinimize = async () => {
    try {
      await invoke("minimize_to_pill");
    } catch (e) {
      console.error("Failed to minimize:", e);
    }
  };

  return (
    <FloatingPanel>
      <div className="relative flex flex-col gap-4 px-5 pb-6 pt-10">
        {/* Top bar */}
        <div className="flex items-center justify-between" data-tauri-drag-region>
          <span
            className="text-[16px] font-medium"
            style={{ color: "var(--md-on-surface)" }}
          >
            Flow
          </span>
          <div className="flex items-center gap-1">
            <FormatSelector value={formatStyle} onChange={setFormatStyle} disabled={appState === "recording"} />
            <M3IconButton
              active={view === "history"}
              onClick={() => setView(view === "history" ? "main" : "history")}
              title="History"
            >
              <Clock className="h-5 w-5" />
            </M3IconButton>
            <M3IconButton
              active={view === "settings"}
              onClick={() => setView(view === "settings" ? "main" : "settings")}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </M3IconButton>
            <M3IconButton
              active={false}
              onClick={handleMinimize}
              title="Minimize to pill"
            >
              <Minus className="h-5 w-5" />
            </M3IconButton>
          </div>
        </div>

        {view === "main" && (
          <>
            <AudioSourceToggle value={audioSource} onChange={setAudioSource} disabled={appState === "recording"} />

            <div className="flex flex-col items-center gap-3 py-1">
              <RecordingIndicator
                state={appState}
                duration={recordingDuration}
                onClick={toggleRecording}
              />
              <StatusBar state={appState} />
            </div>

            {(rawTranscript || formattedText) && (
              <TranscriptDisplay
                rawTranscript={rawTranscript}
                formattedText={formattedText}
                state={appState}
              />
            )}

            {error && (
              <div
                className="rounded-[16px] px-4 py-3 text-[13px] animate-m3-enter"
                style={{
                  background: "var(--md-error-container)",
                  color: "var(--md-on-error-container)",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        {view === "settings" && (
          <SettingsView isOpen={true} onClose={() => setView("main")} />
        )}

        {view === "history" && (
          <HistoryView />
        )}
      </div>
    </FloatingPanel>
  );
}

function M3IconButton({ active, onClick, title, children }: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full p-[8px] transition-all duration-200 active:scale-90"
      style={{
        background: active ? "var(--md-secondary-container)" : "transparent",
        color: active ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)",
      }}
      title={title}
    >
      {children}
    </button>
  );
}

export default App;
