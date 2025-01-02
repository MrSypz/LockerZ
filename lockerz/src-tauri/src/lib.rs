mod modules {
    pub mod config;
    pub mod logger;
    pub mod category;
    pub mod imgoptimize;
    pub mod files;
    pub mod stats;
    pub mod filehandler;
}

use modules::{category::get_categories,
              category::rename_category,
              category::create_category,
              category::delete_category,
              config::update_settings,
              config::setup_folders,
              config::get_settings,
              files::get_files,
              filehandler::move_file,
              filehandler::delete_file,
              stats::get_stats,
              imgoptimize::handle_optimize_image_request,
              logger::LOGGER
};
use tauri_plugin_fs::FsExt;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

use std::sync::Arc;

#[tauri::command]
fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .unwrap();
    }
}

#[tauri::command]
fn expand_scope(app_handle: tauri::AppHandle, folder_path: std::path::PathBuf) -> Result<(), String> {
    app_handle.fs_scope().allow_directory(&folder_path, true)
        .map_err(|err| err.to_string())
}

// Run the Tauri app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = setup_folders();
    LOGGER.info("Application started").expect("Failed to log");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            let sidecar_command = _app.shell().sidecar("zaphire").unwrap();
            let (_rx, sidecar_child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

            let child = Arc::new(Mutex::new(Some(sidecar_child)));

            let child_clone = Arc::clone(&child);

            let window = _app.get_webview_window("main").unwrap();

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed { .. } = event {
                    let mut child_lock = child_clone.lock().unwrap();
                    if let Some(mut child_process) = child_lock.take() {
                        // LOGGER.archive_log();
                        if let Err(e) = child_process.write("exit\n".as_bytes()) {
                            eprintln!("Failed to write to stdin: {}", e);
                        }
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_in_folder,
            handle_optimize_image_request,
            get_categories,
            rename_category,
            create_category,
            delete_category,
            get_settings,
            update_settings,
            move_file,
            delete_file,
            get_files,
            get_stats,
            expand_scope,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
