use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use std::path::Path;
use tauri::Manager;
use opencv::{
    core::{Mat, Size, Vector},
    imgcodecs,
    imgproc,
    prelude::*,
};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};

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

// Cache structure
struct Cache {
    images: HashMap<String, CachedImage>,
}

// Cacheable struct without `Mat`
#[derive(Clone, Serialize, Deserialize)]
struct CachedImage {
    data: String,    // Base64-encoded image data
    timestamp: u64,  // Time when the image was cached
}

// Cache implementation
impl Cache {
    fn new() -> Self {
        Cache {
            images: HashMap::new(),
        }
    }

    fn get(&self, key: &str) -> Option<&CachedImage> {
        self.images.get(key)
    }

    fn set(&mut self, key: String, base64_data: String) {
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        self.images.insert(key, CachedImage {
            data: base64_data,
            timestamp,
        });
    }
}

// Lazy initialization for the cache
lazy_static::lazy_static! {
    static ref CACHE: Mutex<Cache> = Mutex::new(Cache::new());
}

// Image optimization function
use std::time::Instant;

fn optimize_image(
    src: &str,
    width: Option<i32>,
    height: Option<i32>,
    quality: i32
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // Validate file existence
    let src_path = Path::new(src);
    if !src_path.exists() {
        return Err(format!("File does not exist: {}", src).into());
    }

    // Read the image
    let src_img = imgcodecs::imread(src, imgcodecs::IMREAD_COLOR)?;
    let src_width = src_img.cols();
    let src_height = src_img.rows();

    // Calculate target dimensions
    let (target_width, target_height) = match (width, height) {
        (Some(w), Some(h)) => {
            let src_aspect = src_width as f32 / src_height as f32;
            let target_aspect = w as f32 / h as f32;
            if src_aspect > target_aspect {
                let new_height = (w as f32 / src_aspect).round() as i32;
                (w, new_height.min(h))
            } else {
                let new_width = (h as f32 * src_aspect).round() as i32;
                (new_width.min(w), h)
            }
        },
        (Some(w), None) => {
            let aspect_ratio = src_height as f32 / src_width as f32;
            let new_height = (w as f32 * aspect_ratio).round() as i32;
            (w, new_height)
        },
        (None, Some(h)) => {
            let aspect_ratio = src_width as f32 / src_height as f32;
            let new_width = (h as f32 * aspect_ratio).round() as i32;
            (new_width, h)
        },
        (None, None) => (src_width, src_height),
    };

    // Resize the image
    let mut resized = Mat::default();
    let dsize = Size::new(target_width, target_height);
    imgproc::resize(&src_img, &mut resized, dsize, 0.0, 0.0, imgproc::INTER_LINEAR)?;

    // Encode to WebP
    let params = Vector::from(vec![imgcodecs::IMWRITE_WEBP_QUALITY, quality]);
    let mut buf = Vector::new();
    imgcodecs::imencode(".webp", &resized, &mut buf, &params)?;

    Ok(buf.to_vec())
}


// Handle Tauri command for image optimization
#[tauri::command]
fn handle_optimize_image_request(
    src: String,
    width: Option<i32>,
    height: Option<i32>,
    quality: Option<i32>
) -> Result<String, String> {
    let width = width.unwrap_or(0);
    let height = height.unwrap_or(0);
    let quality = quality.unwrap_or(90);

    // Create a cache key
    let cache_key = format!("{}:{}:{}:{}", src, width, height, quality);

    // Check the cache
    let mut cache = CACHE.lock().unwrap();
    if let Some(cached_image) = cache.get(&cache_key) {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        if now - cached_image.timestamp < 3600 {
            return Ok(cached_image.data.clone());
        }
    }

    // Optimize and cache the image
    match optimize_image(&src, Some(width), Some(height), quality) {
        Ok(optimized_image) => {
            let base64_image = general_purpose::STANDARD.encode(&optimized_image);
            cache.set(cache_key, base64_image.clone());
            Ok(base64_image)
        },
        Err(e) => Err(e.to_string()),
    }
}

// Run the Tauri app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
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
        .invoke_handler(tauri::generate_handler![show_in_folder, handle_optimize_image_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}