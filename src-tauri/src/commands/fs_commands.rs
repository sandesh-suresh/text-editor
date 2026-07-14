use std::fs;
use std::path::Path;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_atomic(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);
    let mut tmp_name = target
        .file_name()
        .ok_or_else(|| "invalid file path".to_string())?
        .to_os_string();
    tmp_name.push(".tmp");
    let tmp_path = target.with_file_name(tmp_name);

    fs::write(&tmp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, target).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_and_reads_back_content() {
        let dir = std::env::temp_dir().join(format!("te-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file_path = dir.join("note.md").to_string_lossy().to_string();

        write_file_atomic(file_path.clone(), "hello world".to_string()).unwrap();
        let read_back = read_file(file_path.clone()).unwrap();
        assert_eq!(read_back, "hello world");

        // tmp file should not remain after a successful write
        assert!(!Path::new(&format!("{file_path}.tmp")).exists());

        write_file_atomic(file_path.clone(), "updated content".to_string()).unwrap();
        assert_eq!(read_file(file_path.clone()).unwrap(), "updated content");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn read_file_missing_returns_err() {
        let missing = std::env::temp_dir().join("te-does-not-exist.txt");
        assert!(read_file(missing.to_string_lossy().to_string()).is_err());
    }
}
