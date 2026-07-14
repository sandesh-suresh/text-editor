use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMarker {
    pub session_id: String,
    pub pid: u32,
    pub started_at: u64,
    pub clean_shutdown: bool,
}

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn load_marker(path: &Path) -> Option<SessionMarker> {
    let s = fs::read_to_string(path).ok()?;
    serde_json::from_str(&s).ok()
}

pub fn save_marker(path: &Path, marker: &SessionMarker) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(marker).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}
