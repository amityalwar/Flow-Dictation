import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, Check } from "lucide-react";

interface AppConfig {
  gemini_api_key: string;
  whisper_model: string;
}

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsView({ isOpen }: SettingsViewProps) {
  const [config, setConfig] = useState<AppConfig>({ gemini_api_key: "", whisper_model: "base.en" });
  const [modelDownloaded, setModelDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      invoke<AppConfig>("get_config").then(setConfig).catch(console.error);
      invoke<boolean>("is_model_downloaded").then(setModelDownloaded).catch(console.error);
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      await invoke("save_config", { config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  };

  const handleDownloadModel = async () => {
    setDownloading(true);
    try {
      await invoke("download_whisper_model");
      setModelDownloaded(true);
    } catch (e) {
      console.error("Failed to download model:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-4 animate-m3-enter">
      {/* Gemini API Key card */}
      <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--md-surface-container)" }}>
        <div className="px-4 pt-3 pb-1">
          <label
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--md-primary)" }}
          >
            Gemini API Key
          </label>
        </div>
        <div className="px-4 pb-3">
          <input
            type="password"
            value={config.gemini_api_key}
            onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
            placeholder="Enter your API key..."
            className="w-full bg-transparent text-[14px] outline-none"
            style={{
              color: "var(--md-on-surface)",
              caretColor: "var(--md-primary)",
            }}
          />
        </div>
        <div className="px-4 py-2" style={{ borderTop: "1px solid var(--md-outline-variant)" }}>
          <p className="text-[12px]" style={{ color: "var(--md-on-surface-variant)", opacity: 0.7 }}>
            Required for AI formatting. Get one at aistudio.google.com
          </p>
        </div>
      </div>

      {/* Whisper Model card */}
      <div
        className="flex items-center justify-between rounded-[16px] px-4 py-3.5"
        style={{ background: "var(--md-surface-container)" }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px]" style={{ color: "var(--md-on-surface)" }}>Whisper Model</span>
          <span className="text-[12px]" style={{ color: "var(--md-on-surface-variant)" }}>{config.whisper_model}</span>
        </div>
        {modelDownloaded ? (
          <span
            className="flex items-center gap-1 text-[13px] font-medium"
            style={{ color: "var(--md-primary)" }}
          >
            <Check className="h-4 w-4" /> Ready
          </span>
        ) : (
          <button
            onClick={handleDownloadModel}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-full px-4 py-[8px] text-[13px] font-medium
              transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{
              background: "var(--md-primary)",
              color: "var(--md-on-primary)",
            }}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Downloading..." : "Download"}
          </button>
        )}
      </div>

      {/* Save — M3 filled tonal button */}
      <button
        onClick={handleSave}
        className="rounded-full py-[10px] text-[14px] font-medium transition-all duration-200 active:scale-[0.98] hover:opacity-90"
        style={{
          background: saved ? "var(--md-primary)" : "var(--md-secondary-container)",
          color: saved ? "var(--md-on-primary)" : "var(--md-on-secondary-container)",
        }}
      >
        {saved ? "Saved" : "Save settings"}
      </button>
    </div>
  );
}
