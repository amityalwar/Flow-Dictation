mod audio;
mod config;
mod formatting;
mod history;
mod transcription;
mod wav;

use audio::AudioRecorder;
use config::AppConfig;
use formatting::FormatStyle;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

struct AppState {
    recorder: Mutex<AudioRecorder>,
    config: Mutex<AppConfig>,
    history: history::HistoryDb,
}

#[tauri::command]
fn start_recording(state: tauri::State<'_, AppState>, source: String) -> Result<(), String> {
    log::info!("Starting recording with source: {}", source);
    let mut recorder = state.recorder.lock().map_err(|e| e.to_string())?;
    recorder.start()
}

#[tauri::command]
async fn stop_and_transcribe(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let (samples, sample_rate) = {
        let mut recorder = state.recorder.lock().map_err(|e| e.to_string())?;
        recorder.stop()?
    };

    if samples.is_empty() {
        return Err("No audio recorded".into());
    }

    let samples_16k = audio::resample(&samples, sample_rate, 16000);

    if !transcription::is_model_downloaded() {
        log::info!("Whisper model not found, downloading...");
        transcription::download_model(|downloaded, total| {
            log::info!("Download progress: {}/{} bytes", downloaded, total);
        })
        .await?;
    }

    let model_path = transcription::model_path()?;

    let transcript = tokio::task::spawn_blocking(move || {
        transcription::transcribe(&samples_16k, &model_path)
    })
    .await
    .map_err(|e| format!("Transcription task failed: {}", e))?
    .map_err(|e| format!("Transcription failed: {}", e))?;

    Ok(transcript)
}

#[tauri::command]
async fn format_text(
    state: tauri::State<'_, AppState>,
    transcript: String,
    style: FormatStyle,
) -> Result<String, String> {
    let api_key = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.gemini_api_key.clone()
    };

    if api_key.is_empty() {
        return Err("Gemini API key not configured. Please set it in Settings.".into());
    }

    formatting::format_with_gemini(&transcript, style, &api_key).await
}

#[tauri::command]
fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
    log::info!("Copied {} chars to clipboard", text.len());
    Ok(())
}

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
fn save_config(state: tauri::State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    *current = config;
    current.save()
}

#[tauri::command]
fn is_model_downloaded() -> bool {
    transcription::is_model_downloaded()
}

#[tauri::command]
fn save_dictation(
    state: tauri::State<'_, AppState>,
    audio_source: String,
    format_style: String,
    raw_transcript: String,
    formatted_text: String,
    duration_seconds: f64,
) -> Result<i64, String> {
    state.history.insert(&audio_source, &format_style, &raw_transcript, &formatted_text, duration_seconds)
}

#[tauri::command]
fn get_history(state: tauri::State<'_, AppState>, limit: Option<usize>) -> Result<Vec<history::DictationRecord>, String> {
    state.history.list(limit.unwrap_or(50))
}

#[tauri::command]
fn delete_dictation(state: tauri::State<'_, AppState>, id: i64) -> Result<(), String> {
    state.history.delete(id)
}

#[tauri::command]
fn clear_history(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.history.clear()
}

#[tauri::command]
async fn download_whisper_model() -> Result<(), String> {
    transcription::download_model(|downloaded, total| {
        log::info!("Download progress: {}/{} bytes", downloaded, total);
    })
    .await?;
    Ok(())
}

#[tauri::command]
fn minimize_to_pill(app: tauri::AppHandle) -> Result<(), String> {
    let main_win = app.get_webview_window("main").ok_or("Main window not found")?;
    let pill_win = app.get_webview_window("pill").ok_or("Pill window not found")?;

    // Position pill at top-right of the primary monitor
    if let Ok(Some(monitor)) = main_win.primary_monitor() {
        let screen_size = monitor.size();
        let scale = monitor.scale_factor();
        let pill_width = 220.0;
        let x = (screen_size.width as f64 / scale) - pill_width - 16.0;
        let y = 8.0;
        let _ = pill_win.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
    }

    main_win.hide().map_err(|e| e.to_string())?;
    pill_win.show().map_err(|e| e.to_string())?;
    pill_win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn restore_from_pill(app: tauri::AppHandle) -> Result<(), String> {
    let main_win = app.get_webview_window("main").ok_or("Main window not found")?;
    let pill_win = app.get_webview_window("pill").ok_or("Pill window not found")?;

    pill_win.hide().map_err(|e| e.to_string())?;
    main_win.show().map_err(|e| e.to_string())?;
    main_win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = AppConfig::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register global shortcut: Alt+Shift+D
            let app_handle = app.handle().clone();
            let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyD);

            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    log::info!("Global shortcut pressed");
                    let _ = app_handle.emit("toggle-recording", ());
                }
            })?;

            log::info!("Global shortcut registered: Alt+Shift+D");

            Ok(())
        })
        .manage(AppState {
            recorder: Mutex::new(AudioRecorder::new()),
            config: Mutex::new(config),
            history: history::HistoryDb::open().expect("Failed to open history database"),
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_and_transcribe,
            format_text,
            copy_to_clipboard,
            get_config,
            save_config,
            is_model_downloaded,
            download_whisper_model,
            save_dictation,
            get_history,
            delete_dictation,
            clear_history,
            minimize_to_pill,
            restore_from_pill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
