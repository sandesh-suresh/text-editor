use crate::autosave::{manifest, paths, recovery};
use serde::Serialize;
use std::fs;
use uuid::Uuid;

#[derive(Serialize)]
pub struct SessionStartResult {
    pub session_id: String,
    pub manifest: manifest::Manifest,
    pub crashed: bool,
}

fn read_or_create_session_id() -> Result<String, String> {
    let id_path = paths::session_id_path()?;
    if let Ok(existing) = fs::read_to_string(&id_path) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    let id = Uuid::new_v4().to_string();
    if let Some(parent) = id_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&id_path, &id).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn session_start() -> Result<SessionStartResult, String> {
    let session_id = read_or_create_session_id()?;
    let marker_path = paths::current_marker_path()?;

    let previous = recovery::load_marker(&marker_path);
    let crashed = previous.map(|m| !m.clean_shutdown).unwrap_or(false);

    let marker = recovery::SessionMarker {
        session_id: session_id.clone(),
        pid: std::process::id(),
        started_at: recovery::now_millis(),
        clean_shutdown: false,
    };
    recovery::save_marker(&marker_path, &marker)?;

    let manifest_path = paths::manifest_path(&session_id)?;
    let loaded_manifest = manifest::load(&manifest_path);

    Ok(SessionStartResult {
        session_id,
        manifest: loaded_manifest,
        crashed,
    })
}

#[tauri::command]
pub fn session_end(session_id: String) -> Result<(), String> {
    let marker_path = paths::current_marker_path()?;
    let marker = recovery::SessionMarker {
        session_id,
        pid: std::process::id(),
        started_at: recovery::now_millis(),
        clean_shutdown: true,
    };
    recovery::save_marker(&marker_path, &marker)
}
