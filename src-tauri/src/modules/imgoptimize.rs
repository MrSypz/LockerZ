use base64::{engine::general_purpose, Engine as _};
use opencv::core::AccessFlag::ACCESS_READ;
use opencv::core::UMatUsageFlags::USAGE_ALLOCATE_DEVICE_MEMORY;
use opencv::core::{have_opencl, set_use_opencl, UMat};
use opencv::{
    core::{Mat, Size, Vector},
    imgcodecs, imgproc,
    prelude::*,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{Mutex as AsyncMutex, Semaphore};
use tokio::task;

#[derive(Clone, Serialize, Deserialize)]
struct CachedImage {
    data: String,
    timestamp: u64,
    width: i32,
    height: i32,
    quality: i32,
    file_modified: u64,
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

lazy_static::lazy_static! {
    static ref CACHE: AsyncMutex<Cache> = AsyncMutex::new(Cache::new());
    static ref OPENCV_INIT: () = {
        if have_opencl().unwrap_or(false) {
            set_use_opencl(true).expect("Failed to initialize OpenCL");
        }
    };
}

struct Cache {
    images: HashMap<String, CachedImage>,
}

impl Cache {
    fn new() -> Self {
        Cache {
            images: HashMap::new(),
        }
    }

    fn generate_cache_key(path: &str, width: i32, height: i32, quality: i32) -> String {
        format!("{}:{}:{}:{}", path, width, height, quality)
    }

    fn get_with_metadata(&self, key: &str, file_modified: u64) -> Option<&CachedImage> {
        if let Some(cached) = self.images.get(key) {
            if cached.file_modified == file_modified {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now - cached.timestamp < 3600 { // 1 hour cache
                    return Some(cached);
                }
            }
        }
        None
    }

    fn set_with_metadata(&mut self, key: String, base64_data: String, width: i32, height: i32, quality: i32, file_modified: u64) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.images.insert(
            key,
            CachedImage {
                data: base64_data,
                timestamp,
                width,
                height,
                quality,
                file_modified,
            },
        );
    }

    fn cleanup_old_entries(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.images.retain(|_, cached| now - cached.timestamp < 3600);
    }
}

// Main processing functions
async fn process_image_with_cache(
    path: &str,
    width: Option<i32>,
    height: Option<i32>,
    quality: i32,
    cache: &AsyncMutex<Cache>,
) -> Result<BatchResult, Box<dyn std::error::Error + Send + Sync>> {
    let width = width.unwrap_or(1280);
    let height = height.unwrap_or(720);

    // Get file metadata
    let metadata = tokio::fs::metadata(path).await?;
    let file_modified = metadata.modified()?.duration_since(UNIX_EPOCH)?.as_secs();

    let cache_key = Cache::generate_cache_key(path, width, height, quality);

    // Check cache with file modification time
    let mut cache_guard = cache.lock().await;
    cache_guard.cleanup_old_entries();

    if let Some(cached_image) = cache_guard.get_with_metadata(&cache_key, file_modified) {
        return Ok(BatchResult {
            path: path.to_string(),
            data: Some(cached_image.data.clone()),
            error: None,
        });
    }

    // Process image if not in cache
    drop(cache_guard); // Release lock before processing

    match process_single_image(path, Some(width), Some(height), quality) {
        Ok(optimized_data) => {
            let base64_data = general_purpose::STANDARD.encode(&optimized_data);

            // Update cache with new image data
            let mut cache_guard = cache.lock().await;
            cache_guard.set_with_metadata(
                cache_key,
                base64_data.clone(),
                width,
                height,
                quality,
                file_modified,
            );

            Ok(BatchResult {
                path: path.to_string(),
                data: Some(base64_data),
                error: None,
            })
        }
        Err(e) => Ok(BatchResult {
            path: path.to_string(),
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

fn process_single_image(
    path: &str,
    width: Option<i32>,
    height: Option<i32>,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let src_path = Path::new(path);
    if !src_path.exists() {
        return Err(format!("File does not exist: {}", path).into());
    }

    let src_img = imgcodecs::imread(path, imgcodecs::IMREAD_COLOR)?;
    let src_width = src_img.cols();
    let src_height = src_img.rows();

    let (target_width, target_height) = calculate_dimensions(
        src_width,
        src_height,
        width,
        height,
    );

    if target_width <= 0 || target_height <= 0 {
        return Err("Invalid dimensions after resizing calculation.".into());
    }

    let interpolation = if target_width * target_height <= src_width * src_height {
        imgproc::INTER_AREA
    } else {
        imgproc::INTER_CUBIC
    };

    let dsize = Size::new(target_width, target_height);
    let mut buf = Vector::new();

    if target_width < src_width || target_height < src_height {
        // GPU processing for downscaling
        let src_umat = src_img.get_umat(ACCESS_READ, USAGE_ALLOCATE_DEVICE_MEMORY)?;
        let mut resized = UMat::new_def();
        imgproc::resize(&src_umat, &mut resized, dsize, 0.0, 0.0, interpolation)?;

        let mut params = Vector::new();
        params.push(imgcodecs::IMWRITE_JPEG_QUALITY);
        params.push(quality);
        imgcodecs::imencode(".jpg", &resized, &mut buf, &params)?;
    } else {
        // CPU processing for upscaling
        let mut resized = Mat::default();
        imgproc::resize(&src_img, &mut resized, dsize, 0.0, 0.0, interpolation)?;

        let mut params = Vector::new();
        params.push(imgcodecs::IMWRITE_JPEG_QUALITY);
        params.push(quality);
        imgcodecs::imencode(".jpg", &resized, &mut buf, &params)?;
    }

    Ok(buf.to_vec())
}

fn calculate_dimensions(
    src_width: i32,
    src_height: i32,
    width: Option<i32>,
    height: Option<i32>,
) -> (i32, i32) {
    match (width, height) {
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
        }
        (Some(w), None) => {
            let aspect_ratio = src_height as f32 / src_width as f32;
            let new_height = (w as f32 * aspect_ratio).round() as i32;
            (w, new_height)
        }
        (None, Some(h)) => {
            let aspect_ratio = src_width as f32 / src_height as f32;
            let new_width = (h as f32 * aspect_ratio).round() as i32;
            (new_width, h)
        }
        (None, None) => (src_width, src_height),
    }
}

// Public API functions
#[tauri::command]
pub async fn handle_optimize_image_request(
    src: String,
    width: Option<i32>,
    height: Option<i32>,
    quality: Option<i32>,
) -> Result<String, String> {
    let quality = quality.unwrap_or(90);

    match process_image_with_cache(&src, width, height, quality, &CACHE).await {
        Ok(result) => match result.data {
            Some(data) => Ok(data),
            None => Err(result.error.unwrap_or_else(|| "Unknown error".to_string())),
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn batch_optimize_images(request: BatchRequest) -> Result<Vec<BatchResult>, String> {
    lazy_static::initialize(&OPENCV_INIT);

    let max_concurrent = num_cpus::get();
    let semaphore = Arc::new(Semaphore::new(max_concurrent));
    let mut tasks = Vec::new();

    for path in request.paths {
        let sem = semaphore.clone();
        let quality = request.quality.unwrap_or(90);
        let width = request.width;
        let height = request.height;

        let task = task::spawn(async move {
            let _permit = sem.acquire().await.unwrap();

            process_image_with_cache(
                &path,
                width,
                height,
                quality,
                &CACHE,
            ).await.unwrap_or_else(|e| BatchResult {
                path,
                data: None,
                error: Some(e.to_string()),
            })
        });

        tasks.push(task);
    }

    let results = futures::future::join_all(tasks)
        .await
        .into_iter()
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}