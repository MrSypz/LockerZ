use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // if cfg!(debug_assertions) {
            //     app.handle().plugin(
            //         tauri_plugin_log::Builder::default()
            //             .level(log::LevelFilter::Info)
            //             .build(),
            //     )?;
            // }
            // let sidecar_command = app.shell().sidecar("zaphire").unwrap();
            // let (_rx, sidecar_child) = sidecar_command.spawn().expect("Failed to spawn sidecar");
            //
            // let child = Arc::new(Mutex::new(Some(sidecar_child)));
            //
            // let child_clone = Arc::clone(&child);
            //
            // let window = app.get_webview_window("main").unwrap();
            //
            // window.on_window_event(move |event| {
            //     if let tauri::WindowEvent::CloseRequested { .. } = event {
            //         let mut child_lock = child_clone.lock().unwrap();
            //         if let Some(mut child_process) = child_lock.take() {
            //             if let Err(e) = child_process.write("exit\n".as_bytes()) {
            //                 println!("Fail to send to stdin of Python: {}", e);
            //             }
            //
            //             if let Err(e) = child_process.kill() {
            //                 eprintln!("Failed to kill child process: {}", e);
            //             }
            //         }
            //     }
            // });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
