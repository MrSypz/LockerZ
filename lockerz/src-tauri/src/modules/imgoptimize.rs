use std::collections::HashMap;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use base64::{engine::general_purpose, Engine as _};
use opencv::{
    core::{Mat, Size, Vector},
    imgcodecs, imgproc,
    prelude::*,
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex as AsyncMutex;
use tokio::task;

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

    let mut cache = CACHE.lock().await;
    if let Some(cached_image) = cache.get(&cache_key) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        if now - cached_image.timestamp < 3600 {
            return Ok(cached_image.data.clone());
        }
    }

    match optimize_image(src.clone(), Some(width), Some(height), quality).await {
        Ok(optimized_image) => {
            let base64_image = general_purpose::STANDARD.encode(&optimized_image);
            cache.set(cache_key, base64_image.clone());
            Ok(base64_image)
        }
        Err(e) => Err(e.to_string()),
    }
}

struct Cache {
    images: HashMap<String, CachedImage>,
}

// Cacheable struct without `Mat`
#[derive(Clone, Serialize, Deserialize)]
struct CachedImage {
    data: String,
    timestamp: u64,
}

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
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.images.insert(
            key,
            CachedImage {
                data: base64_data,
                timestamp,
            },
        );
    }
}

lazy_static::lazy_static! {
    static ref CACHE: AsyncMutex<Cache> = AsyncMutex::new(Cache::new());
}

pub async fn optimize_image(
    src: String,
    width: Option<i32>,
    height: Option<i32>,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    task::spawn_blocking(move || {
        let src_path = Path::new(&src);
        if !src_path.exists() {
            return Err(format!("File does not exist: {}", src).into());
        }

        let src_img = imgcodecs::imread(&src, imgcodecs::IMREAD_COLOR)?;
        let src_width = src_img.cols();
        let src_height = src_img.rows();

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
        };

        let mut resized = Mat::default();
        let dsize = Size::new(target_width, target_height);
        let interpolation = if target_width * target_height <= src_width * src_height {
            imgproc::INTER_AREA
        } else {
            imgproc::INTER_CUBIC
        };
        imgproc::resize(&src_img, &mut resized, dsize, 0.0, 0.0, interpolation)?;

        let mut params = Vector::new();
        params.push(imgcodecs::IMWRITE_WEBP_QUALITY);
        params.push(quality);
        params.push(imgcodecs::IMWRITE_TIFF_COMPRESSION_WEBP);
        params.push(0);
        let mut buf = Vector::new();
        imgcodecs::imencode(".webp", &resized, &mut buf, &params)?;

        Ok(buf.to_vec())
    })
        .await?
}
