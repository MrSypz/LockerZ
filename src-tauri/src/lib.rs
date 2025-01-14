mod modules {
    pub mod category;
    pub mod config;
    pub mod filecache;
    pub mod filehandler;
    pub mod imgoptimize;
    pub mod logger;
    pub mod pathutils;
    pub mod stats;
    pub mod db;
}

use modules::{
    category::create_category, category::delete_category, category::get_categories,
    category::rename_category,
    config::get_settings, config::setup_folders,config::update_settings,
    db::init_db,db as Database,
    filehandler::delete_file,filehandler::move_file, filehandler::move_file_category,filehandler::save_and_move_file,filehandler::get_files,
    imgoptimize::handle_optimize_image_request,
    logger::LOGGER,
    stats::get_stats
};
use tauri::Manager;
use window_vibrancy::apply_acrylic;
use crate::modules::db::{create_category_tags, migrate_database};

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
    let _ = init_db();
    log_pre!("Application started");
    if let Err(e) = migrate_database() {
        log_error!("Database migration failed: {}", e);
    }
    if let Err(e) = create_category_tags() {
        log_error!("Failed to create category tags: {}", e);
    }

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
            save_and_move_file,
            get_files,
            get_stats,
            Database::remove_image_tag, //Database
            Database::get_all_tags,
            Database::search_images_by_tags,
            Database::get_image_tags,
            Database::tag_image,
            Database::add_tag,
            Database::add_image,
            Database::get_image_id,
            Database::remove_tag,
            Database::edit_tag,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
