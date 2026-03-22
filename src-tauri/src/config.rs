use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub gemini_api_key: String,
    #[serde(default = "default_whisper_model")]
    pub whisper_model: String,
}

fn default_whisper_model() -> String {
    "base.en".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            gemini_api_key: String::new(),
            whisper_model: default_whisper_model(),
        }
    }
}

fn config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Could not determine config directory")?
        .join("flow-dictation");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("config.json"))
}

impl AppConfig {
    pub fn load() -> Self {
        let path = match config_path() {
            Ok(p) => p,
            Err(e) => {
                log::warn!("Could not get config path: {}", e);
                return Self::default();
            }
        };

        if !path.exists() {
            return Self::default();
        }

        match std::fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(e) => {
                log::warn!("Failed to read config: {}", e);
                Self::default()
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = config_path()?;
        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        std::fs::write(&path, contents)
            .map_err(|e| format!("Failed to write config: {}", e))?;
        Ok(())
    }
}
