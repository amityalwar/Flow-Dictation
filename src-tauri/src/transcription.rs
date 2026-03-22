use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const MODEL_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

/// Get the path to the models directory
fn models_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or("Could not determine data directory")?
        .join("flow-dictation")
        .join("models");
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;
    Ok(data_dir)
}

/// Get the path to the whisper model file
pub fn model_path() -> Result<PathBuf, String> {
    Ok(models_dir()?.join("ggml-base.en.bin"))
}

/// Check if the whisper model is downloaded
pub fn is_model_downloaded() -> bool {
    model_path().map(|p| p.exists()).unwrap_or(false)
}

/// Download the whisper model
pub async fn download_model(
    on_progress: impl Fn(u64, u64),
) -> Result<PathBuf, String> {
    let path = model_path()?;
    if path.exists() {
        log::info!("Model already exists at {:?}", path);
        return Ok(path);
    }

    log::info!("Downloading Whisper model from {}", MODEL_URL);

    let client = reqwest::Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    on_progress(bytes.len() as u64, total_size);

    // Write to a temp file first, then rename for atomicity
    let temp_path = path.with_extension("bin.tmp");
    std::fs::write(&temp_path, &bytes)
        .map_err(|e| format!("Failed to write model file: {}", e))?;
    std::fs::rename(&temp_path, &path)
        .map_err(|e| format!("Failed to rename model file: {}", e))?;

    log::info!("Model downloaded to {:?} ({} bytes)", path, bytes.len());
    Ok(path)
}

/// Transcribe audio samples using the local Whisper model
pub fn transcribe(samples: &[f32], model_path: &std::path::Path) -> Result<String, String> {
    log::info!(
        "Transcribing {} samples using model at {:?}",
        samples.len(),
        model_path
    );

    let ctx = WhisperContext::new_with_params(
        model_path.to_str().ok_or("Invalid model path")?,
        WhisperContextParameters::default(),
    )
    .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    params.set_n_threads(4);

    let mut state = ctx
        .create_state()
        .map_err(|e| format!("Failed to create Whisper state: {}", e))?;

    state
        .full(params, samples)
        .map_err(|e| format!("Transcription failed: {}", e))?;

    let num_segments = state
        .full_n_segments()
        .map_err(|e| format!("Failed to get segments: {}", e))?;

    let mut text = String::new();
    for i in 0..num_segments {
        if let Ok(segment) = state.full_get_segment_text(i) {
            text.push_str(&segment);
        }
    }

    let text = text.trim().to_string();
    log::info!("Transcription result: {} chars", text.len());
    Ok(text)
}
