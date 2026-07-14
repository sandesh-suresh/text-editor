use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestEntry {
    pub tab_id: String,
    pub original_path: Option<String>,
    pub title: String,
    pub mode: String,
    pub autosaved_at: u64,
}

pub type Manifest = Vec<ManifestEntry>;

pub fn load(path: &Path) -> Manifest {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(path: &Path, manifest: &Manifest) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn upsert(manifest: &mut Manifest, entry: ManifestEntry) {
    match manifest.iter_mut().find(|e| e.tab_id == entry.tab_id) {
        Some(existing) => *existing = entry,
        None => manifest.push(entry),
    }
}

pub fn remove(manifest: &mut Manifest, tab_id: &str) {
    manifest.retain(|e| e.tab_id != tab_id);
}
