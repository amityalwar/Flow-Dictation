use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictationRecord {
    pub id: i64,
    pub created_at: String,
    pub audio_source: String,
    pub format_style: String,
    pub raw_transcript: String,
    pub formatted_text: String,
    pub duration_seconds: f64,
}

pub struct HistoryDb {
    conn: Mutex<Connection>,
}

fn db_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or("Could not determine data directory")?
        .join("flow-dictation");
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;
    Ok(data_dir.join("history.db"))
}

impl HistoryDb {
    pub fn open() -> Result<Self, String> {
        let path = db_path()?;
        let conn = Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS dictations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                audio_source TEXT NOT NULL,
                format_style TEXT NOT NULL,
                raw_transcript TEXT NOT NULL,
                formatted_text TEXT NOT NULL,
                duration_seconds REAL NOT NULL
            );"
        ).map_err(|e| format!("Failed to create table: {}", e))?;

        log::info!("History database opened at {:?}", path);
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn insert(
        &self,
        audio_source: &str,
        format_style: &str,
        raw_transcript: &str,
        formatted_text: &str,
        duration_seconds: f64,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO dictations (audio_source, format_style, raw_transcript, formatted_text, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![audio_source, format_style, raw_transcript, formatted_text, duration_seconds],
        ).map_err(|e| format!("Failed to insert record: {}", e))?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list(&self, limit: usize) -> Result<Vec<DictationRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, created_at, audio_source, format_style, raw_transcript, formatted_text, duration_seconds
             FROM dictations ORDER BY created_at DESC LIMIT ?1"
        ).map_err(|e| format!("Failed to prepare query: {}", e))?;

        let rows = stmt.query_map(params![limit], |row| {
            Ok(DictationRecord {
                id: row.get(0)?,
                created_at: row.get(1)?,
                audio_source: row.get(2)?,
                format_style: row.get(3)?,
                raw_transcript: row.get(4)?,
                formatted_text: row.get(5)?,
                duration_seconds: row.get(6)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row.map_err(|e| format!("Row error: {}", e))?);
        }
        Ok(records)
    }

    pub fn delete(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM dictations WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete record: {}", e))?;
        Ok(())
    }

    pub fn clear(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM dictations", [])
            .map_err(|e| format!("Failed to clear history: {}", e))?;
        Ok(())
    }
}
