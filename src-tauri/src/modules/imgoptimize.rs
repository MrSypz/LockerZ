use base64::{engine::general_purpose, Engine as _};
use dashmap::DashMap;
use fast_image_resize as fr;
use image::{codecs::jpeg::JpegEncoder, DynamicImage, RgbImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    io::Cursor,
    path::Path,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::task;

lazy_static::lazy_static! {
    static ref IMAGE_CACHE: Arc<DashMap<u64, CachedImage>> = Arc::new(DashMap::new());
}

#[derive(Clone)]
struct CachedImage {
    data: Vec<u8>,
    timestamp: u64,
    access_count: u32,
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

fn cache_key(path: &str, width: i32, height: i32, quality: i32) -> u64 {
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    width.hash(&mut h);
    height.hash(&mut h);
    quality.hash(&mut h);
    h.finish()
}

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

fn get_cached(key: u64) -> Option<Vec<u8>> {
    if let Some(mut entry) = IMAGE_CACHE.get_mut(&key) {
        let age = now_secs() - entry.timestamp;
        let ttl = if entry.access_count > 10 { 14400 } else if entry.access_count > 3 { 7200 } else { 3600 };
        if age < ttl {
            entry.access_count += 1;
            return Some(entry.data.clone());
        }
        drop(entry);
        IMAGE_CACHE.remove(&key);
    }
    None
}

fn set_cached(key: u64, data: Vec<u8>) {
    IMAGE_CACHE.insert(key, CachedImage { data, timestamp: now_secs(), access_count: 1 });
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
    let key = cache_key(&src, width, height, quality);

    if let Some(cached) = get_cached(key) {
        return Ok(general_purpose::STANDARD.encode(&cached));
    }

    let bytes = task::spawn_blocking(move || process_image(&src, width, height, quality))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    set_cached(key, bytes.clone());
    Ok(general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
pub async fn batch_optimize_images(request: BatchRequest) -> Result<Vec<BatchResult>, String> {
    let width = request.width.unwrap_or(1280);
    let height = request.height.unwrap_or(720);
    let quality = request.quality.unwrap_or(90);

    Ok(request.paths
        .into_par_iter()
        .map(|path| {
            let key = cache_key(&path, width, height, quality);
            if let Some(cached) = get_cached(key) {
                return BatchResult { path, data: Some(general_purpose::STANDARD.encode(&cached)), error: None };
            }
            match process_image(&path, width, height, quality) {
                Ok(bytes) => {
                    set_cached(key, bytes.clone());
                    BatchResult { path, data: Some(general_purpose::STANDARD.encode(&bytes)), error: None }
                }
                Err(e) => BatchResult { path, data: None, error: Some(e.to_string()) },
            }
        })
        .collect())
}

fn process_image(
    path: &str,
    max_w: i32,
    max_h: i32,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    if !Path::new(path).exists() {
        return Err(format!("File does not exist: {}", path).into());
    }

    let img = image::open(path)?.into_rgb8();
    let (src_w, src_h) = img.dimensions();
    let (dst_w, dst_h) = fit_dimensions(src_w, src_h, max_w as u32, max_h as u32);

    let resized = if src_w == dst_w && src_h == dst_h {
        img
    } else {
        resize_simd(img, dst_w, dst_h)?
    };

    encode_jpeg(&DynamicImage::ImageRgb8(resized), quality as u8)
}

fn resize_simd(
    img: RgbImage,
    dst_w: u32,
    dst_h: u32,
) -> Result<RgbImage, Box<dyn std::error::Error + Send + Sync>> {
    let (src_w, src_h) = img.dimensions();
    let src = fr::images::Image::from_vec_u8(src_w, src_h, img.into_raw(), fr::PixelType::U8x3)?;
    let mut dst = fr::images::Image::new(dst_w, dst_h, fr::PixelType::U8x3);

    let scale = (dst_w * dst_h) as f64 / (src_w * src_h) as f64;
    let alg = if scale <= 0.25 {
        fr::ResizeAlg::Convolution(fr::FilterType::Box)
    } else if scale <= 1.0 {
        fr::ResizeAlg::Convolution(fr::FilterType::Bilinear)
    } else {
        fr::ResizeAlg::Convolution(fr::FilterType::Lanczos3)
    };

    fr::Resizer::new().resize(&src, &mut dst, &fr::ResizeOptions::new().resize_alg(alg))?;

    RgbImage::from_raw(dst_w, dst_h, dst.into_vec())
        .ok_or_else(|| "Failed to construct resized image".into())
}

fn encode_jpeg(
    img: &DynamicImage,
    quality: u8,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let mut buf = Cursor::new(Vec::new());
    JpegEncoder::new_with_quality(&mut buf, quality).encode_image(img)?;
    Ok(buf.into_inner())
}

// Keep even dimensions for better JPEG compression ratios
fn fit_dimensions(src_w: u32, src_h: u32, max_w: u32, max_h: u32) -> (u32, u32) {
    if src_w <= max_w && src_h <= max_h {
        return (src_w, src_h);
    }
    let (new_w, new_h) = if src_w as f64 / max_w as f64 > src_h as f64 / max_h as f64 {
        let h = (max_w as f64 * src_h as f64 / src_w as f64).round() as u32;
        (max_w, h.min(max_h))
    } else {
        let w = (max_h as f64 * src_w as f64 / src_h as f64).round() as u32;
        (w.min(max_w), max_h)
    };
    (new_w & !1, new_h & !1)
}

pub fn start_cache_cleanup() {
    tauri::async_runtime::spawn(async {
        let mut interval = tokio::time::interval(Duration::from_secs(1800));
        loop {
            interval.tick().await;
            let now = now_secs();
            IMAGE_CACHE.retain(|_, v| {
                let age = now - v.timestamp;
                if v.access_count > 10 { age < 14400 }
                else if v.access_count > 3 { age < 7200 }
                else { age < 3600 }
            });
        }
    });
}
