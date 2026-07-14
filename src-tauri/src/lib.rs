mod autosave;
mod commands;

use commands::autosave_commands::{
    autosave_close_tab, autosave_mark_saved, autosave_read_snapshot, autosave_write,
};
use commands::fs_commands::{read_file, write_file_atomic};
use commands::session_commands::{session_end, session_start};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file_atomic,
            session_start,
            session_end,
            autosave_write,
            autosave_read_snapshot,
            autosave_mark_saved,
            autosave_close_tab,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
