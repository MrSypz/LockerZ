mod modules {
    pub mod config;
    pub mod logger;
    pub mod category;
    pub mod imgoptimize;
    pub mod files;
    pub mod stats;
    pub mod filehandler;
}

use modules::{category::create_category,
              category::delete_category,
              category::get_categories,
              category::rename_category,
              config::get_settings,
              config::setup_folders,
              config::update_settings,
              filehandler::delete_file,
              filehandler::move_file,
              filehandler::move_file_category,
              files::get_files,
              imgoptimize::handle_optimize_image_request,
              logger::LOGGER,
              stats::get_stats
};
use tauri::Manager;
use window_vibrancy::{apply_acrylic};

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

// Run the Tauri app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = setup_folders();
    log_pre!("Application started");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            let window = _app.get_webview_window("main").unwrap();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed { .. } = event {
                    let _ = LOGGER.archive_log();
                }
            });
            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 10)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

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
            move_file_category,
            get_files,
            get_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
