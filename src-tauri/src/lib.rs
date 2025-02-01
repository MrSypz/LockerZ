mod modules {
    pub mod category;
    pub mod config;
    pub mod db;
    pub mod filecache;
    pub mod filehandler;
    pub mod imagedupe;
    pub mod imgoptimize;
    pub mod logger;
    pub mod pathutils;
    pub mod stats;
}

use crate::modules::db::{create_category_tags, migrate_database};
use crate::modules::imgoptimize::start_cache_cleanup;
use modules::{
    category::create_category,
    category::delete_category,
    category::get_categories,
    category::rename_category,
    config::get_settings,
    config::setup_folders,
    config::update_settings,
    db as Database,
    db::init_db,
    filehandler::delete_file,
    filehandler::get_files,
    filehandler::move_file,
    filehandler::move_file_category,
    filehandler::save_and_move_file,
    imagedupe::find_duplicates, // Add this line
    imgoptimize::batch_optimize_images,
    imgoptimize::handle_optimize_image_request,
    logger::LOGGER,
    stats::get_stats,
};
use tauri::Manager;
use window_vibrancy::apply_acrylic;

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
fn show_in_photos(path: String) {
    #[cfg(target_os = "windows")]
    {
        let path = if path.contains(" ") {
            format!("\"{}\"", path)
        } else {
            path
        };

        std::process::Command::new("cmd")
            .args(&["/C", "start", &path])
            .spawn()
            .unwrap();
    }
}

// Run the Tauri app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let _ = setup_folders();
    let _ = init_db();
    log_pre!("Application started");
    if let Err(e) = migrate_database() {
        log_error!("Database migration failed: {}", e);
    }
    if let Err(e) = create_category_tags() {
        log_error!("Failed to create category tags: {}", e);
    }
    start_cache_cleanup();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
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
            show_in_photos,
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
            find_duplicates,
            batch_optimize_images,
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
            Database::create_category_tags,
            Database::set_category_icon,
            Database::get_category_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(()) // Return Result
}
