use std::sync::{Arc, Mutex};
use tauri_plugin_shell::ShellExt;
use tauri::async_runtime::spawn;
use tauri::{AppHandle, Manager, State};
use tokio::time::{sleep, Duration};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}


pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            spawn(setup(app.handle().clone()));

            // let sidecar_command = app.shell().sidecar("zaphire").unwrap();
            // let ( _rx, sidecar_child) = sidecar_command
            //     .spawn()
            //     .expect("Failed to spawn sidecar");
            //
            // let child = Arc::new(Mutex::new(Some(sidecar_child)));
            //
            // let child_clone = Arc::clone(&child);
            //
            // let window = app.get_webview_window("main").unwrap();
            //
            // window.on_window_event( move |event| {
            //     if let tauri::WindowEvent::Destroyed { .. } = event {
            //
            //         let mut child_lock = child_clone.lock().unwrap();
            //         if let Some(mut child_process) = child_lock.take() {
            //             if let Err(e) = child_process.write("exit\n".as_bytes()) {
            //                 println!("Fail to send to stdin of Node.js: {}", e);
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
        .invoke_handler(tauri::generate_handler![set_complete])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), ()> {
    // Lock the state without write access
    let mut state_lock = state.lock().unwrap();
    match task.as_str() {
        "frontend" => state_lock.frontend_task = true,
        "backend" => state_lock.backend_task = true,
        _ => panic!("invalid task completed!"),
    }
    // Check if both tasks are completed
    if state_lock.backend_task && state_lock.frontend_task {
        // Setup is complete, we can close the splashscreen
        // and unhide the main window!
        let splash_window = app.get_webview_window("loading").unwrap();
        let main_window = app.get_webview_window("main").unwrap();
        splash_window.close().unwrap();
        main_window.show().unwrap();
    }
    Ok(())
}

// An async function that does some heavy setup task
async fn setup(app: AppHandle) -> Result<(), ()> {
    // Fake performing some heavy action for 3 seconds
    println!("Performing really heavy backend setup task...");
    sleep(Duration::from_secs(1)).await;
    println!("Backend setup task completed!");
    set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
        .await?;
    Ok(())
}