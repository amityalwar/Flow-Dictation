# Flow Dictation

A native macOS AI-powered voice dictation app. Record your voice, get it transcribed locally with Whisper, and have it formatted by AI into clean text — all in one step.

Built with [Tauri v2](https://tauri.app/) (Rust + React).

![macOS](https://img.shields.io/badge/macOS-12.3+-black?logo=apple)
![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Local Transcription** — Uses [whisper.cpp](https://github.com/ggerganov/whisper.cpp) via `whisper-rs` for fully offline speech-to-text. No audio leaves your machine.
- **AI Formatting** — Sends the transcript (text only) to Google's Gemini Flash API for intelligent formatting into 7 styles.
- **Global Hotkey** — Press `Alt+Shift+D` from anywhere to start/stop recording.
- **Auto Clipboard** — Formatted text is automatically copied to your clipboard when done.
- **Minimize-to-Pill** — Collapse the window into a tiny floating pill at the top-right of your screen. Hover to reveal the stop button during recording.
- **History** — All dictations are saved locally in SQLite and can be browsed, copied, or deleted.
- **Material Design 3** — Dark theme UI following Google's M3 design system with proper color tokens, elevation, and motion.

## Format Styles

| Style | Description |
|-------|-------------|
| Clean Grammar | Fixes grammar and punctuation, preserves meaning |
| Professional Email | Formats as a polished email |
| Bullet Points | Extracts key points as a bulleted list |
| Meeting Notes | Structures as meeting notes with action items |
| Casual Message | Rewrites as a casual chat message |
| Technical Doc | Formats as technical documentation |
| Raw Transcript | No formatting, just the raw transcription |

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Tailwind)    │
│  ├── Main window (420×520, resizable)        │
│  └── Pill window (floating, always-on-top)   │
├─────────────────────────────────────────────┤
│  Tauri v2 Bridge (IPC commands + events)     │
├─────────────────────────────────────────────┤
│  Backend (Rust)                              │
│  ├── audio.rs      — Mic capture via cpal    │
│  ├── transcription — Whisper.cpp bindings     │
│  ├── formatting    — Gemini Flash API        │
│  ├── history       — SQLite persistence      │
│  └── config        — JSON settings           │
└─────────────────────────────────────────────┘
```

## Prerequisites

- **macOS 12.3+**
- **Rust** (1.77.2+) — [Install via rustup](https://rustup.rs/)
- **Node.js** (18+) and **npm**
- **Xcode Command Line Tools** — `xcode-select --install`
- **Gemini API Key** — Free from [Google AI Studio](https://aistudio.google.com/apikey)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/amityalwar/Flow-Dictation.git
cd Flow-Dictation
npm install
```

### 2. Build the app

```bash
npm run tauri build -- --bundles app
```

The built `.app` will be at:
```
src-tauri/target/release/bundle/macos/Flow Dictation.app
```

### 3. Run it

```bash
open "src-tauri/target/release/bundle/macos/Flow Dictation.app"
```

Or drag it to your Applications folder.

### 4. First-time setup

1. Open the app and click the **Settings** (gear) icon.
2. Enter your **Gemini API Key**.
3. Click **Download** to fetch the Whisper model (~142 MB, downloaded once).
4. Click **Save**.

You're ready to go — tap the mic button or press `Alt+Shift+D` to start dictating.

## Development

Run the app in dev mode with hot-reload:

```bash
npm run tauri dev
```

This starts the Vite dev server on `localhost:1420` and launches the Tauri window.

## How It Works

1. **Record** — Captures microphone audio via CoreAudio (`cpal` crate). Audio is buffered as 32-bit float samples.
2. **Resample** — Converts from device sample rate (typically 48kHz) to 16kHz for Whisper using linear interpolation.
3. **Transcribe** — Runs the audio through `whisper.cpp` (base.en model, 4 threads, greedy sampling). Fully local, no network required.
4. **Format** — Sends the text transcript to `gemini-2.0-flash` with a style-specific system prompt.
5. **Clipboard** — The formatted result is automatically copied to your clipboard.
6. **Save** — The dictation is persisted to a local SQLite database at `~/Library/Application Support/flow-dictation/history.db`.

## Data & Privacy

- **Audio never leaves your machine.** Whisper runs locally.
- **Only the text transcript** is sent to the Gemini API for formatting.
- Your API key is stored locally at `~/Library/Preferences/flow-dictation/config.json`.
- History is stored locally in SQLite. You can clear it from the app at any time.

## Project Structure

```
Flow-Dictation/
├── src/                          # React frontend
│   ├── App.tsx                   # Main app + routing (main/pill views)
│   ├── index.css                 # M3 design tokens + animations
│   └── components/
│       ├── RecordingIndicator    # FAB-style record/stop button
│       ├── AudioSourceToggle     # M3 segmented button
│       ├── FormatSelector        # Format style dropdown
│       ├── TranscriptDisplay     # Result card with copy/raw toggle
│       ├── StatusBar             # State-aware status text
│       ├── SettingsView          # API key + model management
│       ├── HistoryView           # Past dictations list
│       ├── PillView              # Floating mini widget
│       └── FloatingPanel         # Surface container wrapper
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri commands + app setup
│   │   ├── audio.rs              # cpal mic capture + resampling
│   │   ├── transcription.rs      # Whisper model download + inference
│   │   ├── formatting.rs         # Gemini API integration
│   │   ├── history.rs            # SQLite CRUD
│   │   └── config.rs             # JSON config persistence
│   ├── tauri.conf.json           # Window config, permissions
│   └── Cargo.toml                # Rust dependencies
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2 |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Backend | Rust |
| Audio | cpal (CoreAudio) |
| Transcription | whisper-rs / whisper.cpp |
| AI Formatting | Google Gemini Flash |
| Database | SQLite (rusqlite, bundled) |
| Icons | Lucide React |
| Build | Vite 8 |

## License

MIT
