use base64::{engine::general_purpose, Engine as _};
use dashmap::DashMap;
use opencv::{
    core::{Mat, Size, Vector},
    imgcodecs, imgproc,
    prelude::*,
};
use serde::{Deserialize, Serialize};
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::Semaphore;
use tokio::task;

// Improved cache structure using DashMap for concurrent access
lazy_static::lazy_static! {
    static ref IMAGE_CACHE: Arc<DashMap<String, CachedImage>> = Arc::new(DashMap::new());
    static ref PROCESSING_SEMAPHORE: Arc<Semaphore> = Arc::new(Semaphore::new(num_cpus::get() * 2));
}

#[derive(Clone, Serialize, Deserialize)]
struct CachedImage {
    data: String,
    timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchRequest {
    pub paths: Vec<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub quality: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct BatchResult {
    pub path: String,
    pub data: Option<String>,
    pub error: Option<String>,
}

// Helper function to check cache
fn get_cached_image(cache_key: &str) -> Option<String> {
    IMAGE_CACHE.get(cache_key).and_then(|cached| {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if now - cached.timestamp < 3600 {
            Some(cached.data.clone())
        } else {
            None
        }
    })
}

// Helper function to cache image
fn cache_image(cache_key: String, data: String) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    IMAGE_CACHE.insert(cache_key, CachedImage { data, timestamp });
}

#[tauri::command]
pub async fn handle_optimize_image_request(
    src: String,
    width: Option<i32>,
    height: Option<i32>,
    quality: Option<i32>,
) -> Result<String, String> {
    let width = width.unwrap_or(1280);
    let height = height.unwrap_or(720);
    let quality = quality.unwrap_or(90);

    let cache_key = format!("{}:{}:{}:{}", src, width, height, quality);

    // Check cache first
    if let Some(cached) = get_cached_image(&cache_key) {
        return Ok(cached);
    }

    // Acquire semaphore permit
    let _permit = PROCESSING_SEMAPHORE
        .acquire()
        .await
        .map_err(|e| e.to_string())?;

    match process_image(src, width, height, quality).await {
        Ok(optimized_image) => {
            let base64_image = general_purpose::STANDARD.encode(&optimized_image);
            cache_image(cache_key, base64_image.clone());
            Ok(base64_image)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn batch_optimize_images(request: BatchRequest) -> Result<Vec<BatchResult>, String> {
    let mut tasks = Vec::new();
    let width = request.width.unwrap_or(1280);
    let height = request.height.unwrap_or(720);
    let quality = request.quality.unwrap_or(90);

    for path in request.paths {
        let path_clone = path.clone();

        let task = task::spawn(async move {
            let cache_key = format!("{}:{}:{}:{}", path, width, height, quality);

            // Check cache first
            if let Some(cached) = get_cached_image(&cache_key) {
                return BatchResult {
                    path: path_clone,
                    data: Some(cached),
                    error: None,
                };
            }

            // Acquire semaphore permit
            let _permit = PROCESSING_SEMAPHORE.acquire().await.unwrap();

            match process_image(path, width, height, quality).await {
                Ok(optimized) => {
                    let base64_data = general_purpose::STANDARD.encode(&optimized);
                    cache_image(cache_key, base64_data.clone());

                    BatchResult {
                        path: path_clone,
                        data: Some(base64_data),
                        error: None,
                    }
                }
                Err(e) => BatchResult {
                    path: path_clone,
                    data: None,
                    error: Some(e.to_string()),
                },
            }
        });

        tasks.push(task);
    }

    Ok(futures::future::join_all(tasks)
        .await
        .into_iter()
        .filter_map(|r| r.ok())
        .collect())
}

async fn process_image(
    path: String,
    width: i32,
    height: i32,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    // Offload CPU-intensive work to blocking thread
    task::spawn_blocking(move || {
        let src_path = Path::new(&path);
        if !src_path.exists() {
            return Err(format!("File does not exist: {}", path).into());
        }

        let src_img = imgcodecs::imread(&path, imgcodecs::IMREAD_COLOR)?;
        let src_width = src_img.cols();
        let src_height = src_img.rows();

        let (target_width, target_height) =
            calculate_dimensions(src_width, src_height, width, height);

        let interpolation = if target_width * target_height <= src_width * src_height {
            imgproc::INTER_AREA
        } else {
            imgproc::INTER_CUBIC
        };

        let mut resized = Mat::default();
        imgproc::resize(
            &src_img,
            &mut resized,
            Size::new(target_width, target_height),
            0.0,
            0.0,
            interpolation,
        )?;

        let mut buf = Vector::new();
        let mut params = Vector::new();
        params.push(imgcodecs::IMWRITE_JPEG_QUALITY);
        params.push(quality);

        imgcodecs::imencode(".jpg", &resized, &mut buf, &params)?;
        Ok(buf.to_vec())
    })
    .await?
}

fn calculate_dimensions(
    src_width: i32,
    src_height: i32,
    target_width: i32,
    target_height: i32,
) -> (i32, i32) {
    let src_aspect = src_width as f32 / src_height as f32;
    let target_aspect = target_width as f32 / target_height as f32;

    if src_aspect > target_aspect {
        let new_height = (target_width as f32 / src_aspect).round() as i32;
        (target_width, new_height.min(target_height))
    } else {
        let new_width = (target_height as f32 * src_aspect).round() as i32;
        (new_width.min(target_width), target_height)
    }
}

// Periodic cache cleanup task
pub async fn start_cache_cleanup() {
    tokio::spawn(async {
        let mut interval = tokio::time::interval(Duration::from_secs(3600));
        loop {
            interval.tick().await;
            cleanup_old_cache_entries();
        }
    });
}

fn cleanup_old_cache_entries() {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    IMAGE_CACHE.retain(|_, v| now - v.timestamp < 3600);
}
