use base64::{engine::general_purpose, Engine as _};
use dashmap::DashMap;
use opencv::{
    core::{Mat, Size, Vector, CV_8UC3},
    imgcodecs, imgproc,
    prelude::*,
};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    path::Path,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tokio::sync::Semaphore;
use tokio::task;

// Ultra-fast cache using integer keys and raw bytes
lazy_static::lazy_static! {
    static ref IMAGE_CACHE: Arc<DashMap<u64, CachedImageBytes>> = Arc::new(DashMap::new());
    static ref PROCESSING_SEMAPHORE: Arc<Semaphore> = Arc::new(Semaphore::new(num_cpus::get() * 4)); // Increased concurrency
    static ref MAT_POOL: Arc<Mutex<Vec<Mat>>> = Arc::new(Mutex::new(Vec::with_capacity(50)));
    static ref BUFFER_POOL: Arc<Mutex<Vec<Vector<u8>>>> = Arc::new(Mutex::new(Vec::with_capacity(50)));
    static ref PROCESS_COUNTER: AtomicUsize = AtomicUsize::new(0);
}

#[derive(Clone)]
struct CachedImageBytes {
    data: Vec<u8>,  // Store raw bytes, not base64
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

// Ultra-fast hash function for cache keys
#[inline(always)]
fn fast_hash(path: &str, width: i32, height: i32, quality: i32) -> u64 {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    (width as u64).hash(&mut hasher);
    (height as u64).hash(&mut hasher);
    (quality as u64).hash(&mut hasher);
    hasher.finish()
}

// Memory pools for zero-allocation processing
#[inline(always)]
fn get_mat_from_pool() -> Mat {
    let mut pool = MAT_POOL.lock().unwrap();
    pool.pop().unwrap_or_else(|| Mat::default())
}

#[inline(always)]
fn return_mat_to_pool(mat: Mat) {
    let mut pool = MAT_POOL.lock().unwrap();
    if pool.len() < 50 {
        pool.push(mat);
    }
}

#[inline(always)]
fn get_buffer_from_pool() -> Vector<u8> {
    let mut pool = BUFFER_POOL.lock().unwrap();
    pool.pop().unwrap_or_else(|| Vector::new())
}

#[inline(always)]
fn return_buffer_to_pool(mut buffer: Vector<u8>) {
    buffer.clear();
    let mut pool = BUFFER_POOL.lock().unwrap();
    if pool.len() < 50 {
        pool.push(buffer);
    }
}

// Lightning-fast cache lookup with no allocations
#[inline(always)]
fn get_cached_image(cache_key: u64) -> Option<Vec<u8>> {
    if let Some(mut cached) = IMAGE_CACHE.get_mut(&cache_key) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if now - cached.timestamp < 7200 { // 2 hour cache
            cached.access_count += 1;
            return Some(cached.data.clone());
        } else {
            drop(cached);
            IMAGE_CACHE.remove(&cache_key);
        }
    }
    None
}

#[inline(always)]
fn cache_image(cache_key: u64, data: Vec<u8>) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    IMAGE_CACHE.insert(cache_key, CachedImageBytes {
        data,
        timestamp,
        access_count: 1
    });
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

    let cache_key = fast_hash(&src, width, height, quality);

    // Ultra-fast cache lookup
    if let Some(cached_bytes) = get_cached_image(cache_key) {
        return Ok(general_purpose::STANDARD.encode(&cached_bytes));
    }

    // No semaphore bottleneck for individual requests
    match process_image_ultra_fast(src, width, height, quality).await {
        Ok(optimized_bytes) => {
            cache_image(cache_key, optimized_bytes.clone());
            Ok(general_purpose::STANDARD.encode(&optimized_bytes))
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn batch_optimize_images(request: BatchRequest) -> Result<Vec<BatchResult>, String> {
    let width = request.width.unwrap_or(1280);
    let height = request.height.unwrap_or(720);
    let quality = request.quality.unwrap_or(90);

    // Use Rayon for CPU-bound parallel processing - much faster than async for this
    let results: Vec<BatchResult> = request.paths
        .into_par_iter() // Parallel iterator using all CPU cores
        .map(|path| {
            let cache_key = fast_hash(&path, width, height, quality);

            // Check cache first
            if let Some(cached_bytes) = get_cached_image(cache_key) {
                return BatchResult {
                    path: path.clone(),
                    data: Some(general_purpose::STANDARD.encode(&cached_bytes)),
                    error: None,
                };
            }

            // Process using blocking (synchronous) code for maximum speed
            match process_image_sync(&path, width, height, quality) {
                Ok(optimized_bytes) => {
                    cache_image(cache_key, optimized_bytes.clone());
                    BatchResult {
                        path,
                        data: Some(general_purpose::STANDARD.encode(&optimized_bytes)),
                        error: None,
                    }
                }
                Err(e) => BatchResult {
                    path,
                    data: None,
                    error: Some(e.to_string()),
                },
            }
        })
        .collect();

    Ok(results)
}

// Ultra-fast async version using dedicated thread pool
async fn process_image_ultra_fast(
    path: String,
    width: i32,
    height: i32,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let start = Instant::now();
    let clonepath = path.clone();
    // Use dedicated blocking thread pool for CPU-intensive work
    let result = task::spawn_blocking(move || {
        process_image_sync(&path, width, height, quality)
    }).await??;

    // Log slow operations for optimization
    if start.elapsed() > Duration::from_millis(50) {
        println!("Slow processing: {} took {:?}", clonepath, start.elapsed());
    }

    Ok(result)
}

// Synchronous version optimized for maximum speed
fn process_image_sync(
    path: &str,
    width: i32,
    height: i32,
    quality: i32,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    PROCESS_COUNTER.fetch_add(1, Ordering::Relaxed);

    let src_path = Path::new(path);
    if !src_path.exists() {
        return Err(format!("File does not exist: {}", path).into());
    }

    // Load image with error recovery
    let src_img = load_image_optimized(path)?;

    if src_img.empty() {
        return Err(format!("Failed to load image: {}", path).into());
    }

    let src_width = src_img.cols();
    let src_height = src_img.rows();

    let (target_width, target_height) =
        calculate_dimensions_fast(src_width, src_height, width, height);

    // Skip processing if already at target size
    if src_width == target_width && src_height == target_height {
        return encode_image_fast(&src_img, quality);
    }

    // Get pooled Mat for zero allocation
    let mut resized = get_mat_from_pool();

    // Use fastest interpolation based on scaling factor
    let scale_factor = (target_width * target_height) as f64 / (src_width * src_height) as f64;
    let interpolation = match scale_factor {
        s if s <= 0.25 => imgproc::INTER_AREA,      // Heavy downsampling
        s if s <= 1.0 => imgproc::INTER_LINEAR,     // Moderate downsampling
        _ => imgproc::INTER_CUBIC,                  // Upsampling
    };

    imgproc::resize(
        &src_img,
        &mut resized,
        Size::new(target_width, target_height),
        0.0,
        0.0,
        interpolation,
    )?;

    let result = encode_image_fast(&resized, quality);

    // Return Mat to pool
    return_mat_to_pool(resized);

    result
}

// Optimized image loading with fallback strategies
#[inline]
fn load_image_optimized(path: &str) -> Result<Mat, Box<dyn std::error::Error + Send + Sync>> {
    // Try normal loading first
    match imgcodecs::imread(path, imgcodecs::IMREAD_COLOR) {
        Ok(img) if !img.empty() => Ok(img),
        _ => {
            // Fallback: try different loading modes
            imgcodecs::imread(path, imgcodecs::IMREAD_UNCHANGED)
                .or_else(|_| imgcodecs::imread(path, imgcodecs::IMREAD_ANYDEPTH))
                .map_err(|e| format!("Failed to load image {}: {}", path, e).into())
        }
    }
}

// Ultra-fast encoding with pooled buffers
#[inline]
fn encode_image_fast(img: &Mat, quality: i32) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let mut buf = get_buffer_from_pool();

    // Optimized JPEG parameters for speed
    let mut params = Vector::new();
    params.push(imgcodecs::IMWRITE_JPEG_QUALITY);
    params.push(quality);
    params.push(imgcodecs::IMWRITE_JPEG_OPTIMIZE);
    params.push(1);
    params.push(imgcodecs::IMWRITE_JPEG_PROGRESSIVE);
    params.push(0); // Disable progressive for speed

    imgcodecs::imencode(".jpg", img, &mut buf, &params)?;
    let result = buf.to_vec();

    return_buffer_to_pool(buf);
    Ok(result)
}

// Fastest dimension calculation
#[inline(always)]
fn calculate_dimensions_fast(
    src_width: i32,
    src_height: i32,
    target_width: i32,
    target_height: i32,
) -> (i32, i32) {
    // Early return if source is smaller than target
    if src_width <= target_width && src_height <= target_height {
        return (src_width, src_height);
    }

    let src_aspect = src_width as f64 / src_height as f64;
    let target_aspect = target_width as f64 / target_height as f64;

    let (new_width, new_height) = if src_aspect > target_aspect {
        let height = (target_width as f64 / src_aspect).round() as i32;
        (target_width, height.min(target_height))
    } else {
        let width = (target_height as f64 * src_aspect).round() as i32;
        (width.min(target_width), target_height)
    };

    // Ensure even dimensions for better JPEG compression
    (new_width & !1, new_height & !1)
}

// Batch processing with work-stealing for maximum CPU utilization
#[tauri::command]
pub async fn batch_optimize_images_ultra_fast(request: BatchRequest) -> Result<Vec<BatchResult>, String> {
    let width = request.width.unwrap_or(1280);
    let height = request.height.unwrap_or(720);
    let quality = request.quality.unwrap_or(90);

    let start = Instant::now();

    // Use Rayon's work-stealing thread pool for maximum CPU utilization
    let results: Vec<BatchResult> = request.paths
        .into_par_iter()
        .with_min_len(1) // Process even single items in parallel
        .map(|path| {
            let process_start = Instant::now();
            let cache_key = fast_hash(&path, width, height, quality);

            // Lightning fast cache check
            if let Some(cached_bytes) = get_cached_image(cache_key) {
                return BatchResult {
                    path: path.clone(),
                    data: Some(general_purpose::STANDARD.encode(&cached_bytes)),
                    error: None,
                };
            }

            // Process with maximum speed
            match process_image_sync(&path, width, height, quality) {
                Ok(optimized_bytes) => {
                    cache_image(cache_key, optimized_bytes.clone());

                    // Track slow files
                    if process_start.elapsed() > Duration::from_millis(100) {
                        println!("Slow file: {} took {:?}", path, process_start.elapsed());
                    }

                    BatchResult {
                        path,
                        data: Some(general_purpose::STANDARD.encode(&optimized_bytes)),
                        error: None,
                    }
                }
                Err(e) => BatchResult {
                    path,
                    data: None,
                    error: Some(e.to_string()),
                },
            }
        })
        .collect();

    let total_time = start.elapsed();
    let processed_count = PROCESS_COUNTER.load(Ordering::Relaxed);

    println!("Batch processed {} images in {:?} ({:.2} images/sec)",
             results.len(), total_time, results.len() as f64 / total_time.as_secs_f64());

    Ok(results)
}

// Memory-efficient cache cleanup
pub async fn start_cache_cleanup() {
    tokio::spawn(async {
        let mut interval = tokio::time::interval(Duration::from_secs(1800)); // 30 minutes
        loop {
            interval.tick().await;
            cleanup_cache_efficient();
        }
    });
}

fn cleanup_cache_efficient() {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Use retain for efficient in-place cleanup
    IMAGE_CACHE.retain(|_k, v| {
        let age = now - v.timestamp;
        // Keep frequently accessed items longer
        if v.access_count > 10 {
            age < 14400 // 4 hours for hot items
        } else if v.access_count > 3 {
            age < 7200  // 2 hours for warm items
        } else {
            age < 3600  // 1 hour for cold items
        }
    });

    println!("Cache cleanup: {} items remaining", IMAGE_CACHE.len());
}

// Prefetch common sizes for better performance
#[tauri::command]
pub async fn prefetch_images(paths: Vec<String>) -> Result<(), String> {
    let common_sizes = [(1920, 1080), (1280, 720), (800, 600), (400, 300)];

    // Use Rayon for parallel prefetching
    paths.into_par_iter().for_each(|path| {
        for (w, h) in common_sizes {
            let cache_key = fast_hash(&path, w, h, 90);
            if get_cached_image(cache_key).is_none() {
                if let Ok(bytes) = process_image_sync(&path, w, h, 90) {
                    cache_image(cache_key, bytes);
                }
            }
        }
    });

    Ok(())
}

// Performance monitoring
#[tauri::command]
pub async fn get_performance_stats() -> Result<serde_json::Value, String> {
    let cache_size = IMAGE_CACHE.len();
    let processed_count = PROCESS_COUNTER.load(Ordering::Relaxed);

    Ok(serde_json::json!({
        "cache_size": cache_size,
        "processed_count": processed_count,
        "cpu_cores": num_cpus::get(),
        "semaphore_permits": num_cpus::get() * 4
    }))
}

// Warm up the system for better initial performance
pub fn warmup_system() {
    // Pre-allocate Mat objects
    let mut pool = MAT_POOL.lock().unwrap();
    for _ in 0..20 {
        pool.push(Mat::default());
    }
    drop(pool);

    // Pre-allocate buffer objects
    let mut buf_pool = BUFFER_POOL.lock().unwrap();
    for _ in 0..20 {
        buf_pool.push(Vector::new());
    }

    println!("System warmed up with {} CPU cores", num_cpus::get());
}