use crate::autosave::{manifest, paths, recovery};
use std::fs;

#[tauri::command]
pub fn autosave_write(
    session_id: String,
    tab_id: String,
    content: String,
    original_path: Option<String>,
    title: String,
    mode: String,
) -> Result<(), String> {
    let snapshot_path = paths::snapshot_path(&session_id, &tab_id)?;
    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&snapshot_path, content).map_err(|e| e.to_string())?;

    let manifest_path = paths::manifest_path(&session_id)?;
    let mut loaded = manifest::load(&manifest_path);
    manifest::upsert(
        &mut loaded,
        manifest::ManifestEntry {
            tab_id,
            original_path,
            title,
            mode,
            autosaved_at: recovery::now_millis(),
        },
    );
    manifest::save(&manifest_path, &loaded)
}

#[tauri::command]
pub fn autosave_read_snapshot(session_id: String, tab_id: String) -> Result<Option<String>, String> {
    let snapshot_path = paths::snapshot_path(&session_id, &tab_id)?;
    match fs::read_to_string(&snapshot_path) {
        Ok(content) => Ok(Some(content)),
        Err(_) => Ok(None),
    }
}

fn discard_snapshot(session_id: &str, tab_id: &str) -> Result<(), String> {
    let snapshot_path = paths::snapshot_path(session_id, tab_id)?;
    if snapshot_path.exists() {
        fs::remove_file(&snapshot_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn autosave_mark_saved(
    session_id: String,
    tab_id: String,
    original_path: String,
    title: String,
) -> Result<(), String> {
    discard_snapshot(&session_id, &tab_id)?;

    let manifest_path = paths::manifest_path(&session_id)?;
    let mut loaded = manifest::load(&manifest_path);
    let mode = loaded
        .iter()
        .find(|e| e.tab_id == tab_id)
        .map(|e| e.mode.clone())
        .unwrap_or_else(|| "code".to_string());
    manifest::upsert(
        &mut loaded,
        manifest::ManifestEntry {
            tab_id,
            original_path: Some(original_path),
            title,
            mode,
            autosaved_at: recovery::now_millis(),
        },
    );
    manifest::save(&manifest_path, &loaded)
}

#[tauri::command]
pub fn autosave_close_tab(session_id: String, tab_id: String) -> Result<(), String> {
    discard_snapshot(&session_id, &tab_id)?;

    let manifest_path = paths::manifest_path(&session_id)?;
    let mut loaded = manifest::load(&manifest_path);
    manifest::remove(&mut loaded, &tab_id);
    manifest::save(&manifest_path, &loaded)
}
