use std::path::PathBuf;

pub fn base_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("could not resolve home directory")?;
    Ok(home.join(".text-editor"))
}

pub fn sessions_dir() -> Result<PathBuf, String> {
    Ok(base_dir()?.join("sessions"))
}

pub fn session_id_path() -> Result<PathBuf, String> {
    Ok(sessions_dir()?.join("session_id.txt"))
}

pub fn current_marker_path() -> Result<PathBuf, String> {
    Ok(sessions_dir()?.join("current.json"))
}

pub fn autosave_dir(session_id: &str) -> Result<PathBuf, String> {
    Ok(base_dir()?.join("autosave").join(session_id))
}

pub fn manifest_path(session_id: &str) -> Result<PathBuf, String> {
    Ok(autosave_dir(session_id)?.join("manifest.json"))
}

pub fn snapshot_path(session_id: &str, tab_id: &str) -> Result<PathBuf, String> {
    Ok(autosave_dir(session_id)?.join(format!("{tab_id}.snapshot")))
}
