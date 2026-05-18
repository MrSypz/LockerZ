use crate::modules::config::get_config;
use dashmap::DashMap;
use image::imageops;
use rayon::prelude::*;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::Emitter;
use tokio::task;

const BATCH_SIZE: usize = 200;

const PHASE_INIT: &str = "Initializing";
const PHASE_COLLECTING: &str = "Collecting Images";
const PHASE_HASHING: &str = "Computing Image Hashes";
const PHASE_COMPARING: &str = "Comparing Images";
const PHASE_FINALIZING: &str = "Finalizing Results";
const PHASE_COMPLETE: &str = "Complete";

#[derive(Debug, Serialize, Clone)]
pub struct DuplicateImage {
    pub path: String,
    pub category: String,
    pub similarity: f64,
    pub duplicates: Vec<DuplicateMatch>,
}

#[derive(Debug, Serialize, Clone)]
pub struct DuplicateMatch {
    pub path: String,
    pub category: String,
    pub similarity: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ProgressInfo {
    pub filename: String,
    pub progress: f32,
    pub status: String,
    pub phase: String,
    pub current_file: Option<String>,
    pub target_file: Option<String>,
    pub processed_files: usize,
    pub total_files: usize,
    pub estimated_time_remaining: Option<String>,
    pub elapsed_time: Option<String>,
}

#[derive(Clone)]
struct ImageHash {
    path: PathBuf,
    category: String,
    hash: u64,
    file_size: u64,
}

lazy_static::lazy_static! {
    static ref PROCESSED_SET: Arc<DashMap<PathBuf, bool>> = Arc::new(DashMap::new());
    static ref PROGRESS_COUNTER: AtomicUsize = AtomicUsize::new(0);
}

// dHash: resize to 9x8 grayscale, compare each pixel with its right neighbour.
// Result is a packed 64-bit integer; Hamming distance gives similarity.
fn compute_dhash(path: &Path) -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
    let img = image::open(path)?.into_luma8();
    let small = imageops::resize(&img, 9, 8, imageops::FilterType::Triangle);

    let mut hash: u64 = 0;
    for y in 0..8u32 {
        for x in 0..8u32 {
            if small.get_pixel(x, y)[0] > small.get_pixel(x + 1, y)[0] {
                hash |= 1u64 << (y * 8 + x);
            }
        }
    }
    Ok(hash)
}

#[inline(always)]
fn hamming_similarity(a: u64, b: u64) -> f64 {
    1.0 - ((a ^ b).count_ones() as f64 / 64.0)
}

fn similarity_with_size_hint(a: u64, b: u64, size_a: u64, size_b: u64, threshold: f64) -> f64 {
    if threshold >= 1.0 {
        let ratio = size_a.min(size_b) as f64 / size_a.max(size_b) as f64;
        if ratio < 0.95 {
            return 0.0;
        }
    }
    hamming_similarity(a, b)
}

fn format_time(secs: f64) -> String {
    if secs < 60.0 {
        format!("{:.0} seconds", secs)
    } else if secs < 3600.0 {
        format!("{:.1} minutes", secs / 60.0)
    } else {
        format!("{:.0}h {:.0}m", (secs / 3600.0).floor(), ((secs % 3600.0) / 60.0).floor())
    }
}

#[tauri::command]
pub async fn find_duplicates(
    similarity_threshold: Option<f64>,
    window: tauri::Window,
) -> Result<Vec<DuplicateImage>, String> {
    let threshold = similarity_threshold.unwrap_or(0.95);
    let config = get_config();
    let root_path = config.folderPath;
    let start = std::time::Instant::now();

    PROCESSED_SET.clear();
    PROGRESS_COUNTER.store(0, Ordering::Relaxed);

    let _ = window.emit("dupe-check-started", ProgressInfo {
        filename: "Duplicate Check".to_string(),
        progress: 0.0,
        status: "starting".to_string(),
        phase: PHASE_INIT.to_string(),
        current_file: None,
        target_file: None,
        processed_files: 0,
        total_files: 0,
        estimated_time_remaining: None,
        elapsed_time: Some("0 seconds".to_string()),
    });

    task::spawn_blocking(move || {
        window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 5.0,
            status: "processing".to_string(),
            phase: PHASE_COLLECTING.to_string(),
            current_file: Some(root_path.to_string_lossy().to_string()),
            target_file: None,
            processed_files: 0,
            total_files: 0,
            estimated_time_remaining: None,
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        }).unwrap_or_default();

        let image_paths = collect_image_paths(&root_path)
            .map_err(|e| format!("Failed to collect image paths: {}", e))?;
        let total = image_paths.len();
        let hashed = Arc::new(AtomicUsize::new(0));
        let window = Arc::new(window);

        let _ = window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 10.0,
            status: "processing".to_string(),
            phase: PHASE_HASHING.to_string(),
            current_file: None,
            target_file: None,
            processed_files: 0,
            total_files: total,
            estimated_time_remaining: None,
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        });

        let hash_start = std::time::Instant::now();
        let image_hashes: Vec<ImageHash> = image_paths
            .par_chunks(BATCH_SIZE)
            .flat_map(|batch| {
                let mut results = Vec::with_capacity(batch.len());
                for (path, category, file_size) in batch {
                    if let Ok(hash) = compute_dhash(path) {
                        let n = hashed.fetch_add(1, Ordering::Relaxed);
                        if n % 20 == 0 || n == total.saturating_sub(1) {
                            let elapsed = hash_start.elapsed().as_secs_f64();
                            let eta = (n > 0).then(|| format_time((elapsed / n as f64) * (total - n) as f64));
                            let _ = window.emit("dupe-check-progress", ProgressInfo {
                                filename: "Duplicate Check".to_string(),
                                progress: (n as f32 / total as f32) * 40.0 + 10.0,
                                status: "processing".to_string(),
                                phase: PHASE_HASHING.to_string(),
                                current_file: Some(path.to_string_lossy().to_string()),
                                target_file: None,
                                processed_files: n,
                                total_files: total,
                                estimated_time_remaining: eta,
                                elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
                            });
                        }
                        results.push(ImageHash { path: path.clone(), category: category.clone(), hash, file_size: *file_size });
                    }
                }
                results
            })
            .collect();

        let _ = window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 50.0,
            status: "processing".to_string(),
            phase: PHASE_COMPARING.to_string(),
            current_file: None,
            target_file: None,
            processed_files: 0,
            total_files: image_hashes.len(),
            estimated_time_remaining: None,
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        });

        let total_cmp = image_hashes.len() * image_hashes.len().saturating_sub(1) / 2;
        let cmp_start = std::time::Instant::now();
        let results = compare_hashes(&image_hashes, threshold, &window, total_cmp, cmp_start, start);

        let _ = window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 99.0,
            status: "finalizing".to_string(),
            phase: PHASE_FINALIZING.to_string(),
            current_file: None,
            target_file: None,
            processed_files: total_cmp,
            total_files: total_cmp,
            estimated_time_remaining: Some("Almost done".to_string()),
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        });

        let _ = window.emit("dupe-check-finished", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 100.0,
            status: "complete".to_string(),
            phase: PHASE_COMPLETE.to_string(),
            current_file: None,
            target_file: None,
            processed_files: results.len(),
            total_files: total,
            estimated_time_remaining: None,
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        });

        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn compare_hashes(
    hashes: &[ImageHash],
    threshold: f64,
    window: &Arc<tauri::Window>,
    total_cmp: usize,
    cmp_start: std::time::Instant,
    start: std::time::Instant,
) -> Vec<DuplicateImage> {
    let num_cores = num_cpus::get();
    let per_core = (hashes.len() + num_cores - 1) / num_cores;

    (0..num_cores)
        .into_par_iter()
        .flat_map(|core| {
            let start_i = core * per_core;
            let end_i = ((core + 1) * per_core).min(hashes.len());
            if start_i >= hashes.len() {
                return Vec::new();
            }

            let mut core_results = Vec::new();
            for i in start_i..end_i {
                let img1 = &hashes[i];
                if PROCESSED_SET.contains_key(&img1.path) {
                    continue;
                }
                let mut matches = Vec::new();
                for img2 in hashes.iter().skip(i + 1) {
                    if PROCESSED_SET.contains_key(&img2.path) {
                        continue;
                    }
                    let g = PROGRESS_COUNTER.fetch_add(1, Ordering::Relaxed);
                    if g % 5000 == 0 && core == 0 {
                        let elapsed = cmp_start.elapsed().as_secs_f64();
                        let eta = (g > 0).then(|| format_time((elapsed / g as f64) * (total_cmp - g) as f64));
                        let _ = window.emit("dupe-check-progress", ProgressInfo {
                            filename: "Duplicate Check".to_string(),
                            progress: (50.0 + (g as f32 / total_cmp as f32) * 45.0).min(95.0),
                            status: "processing".to_string(),
                            phase: PHASE_COMPARING.to_string(),
                            current_file: Some(format!("Core {} active", core)),
                            target_file: None,
                            processed_files: g,
                            total_files: total_cmp,
                            estimated_time_remaining: eta,
                            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
                        });
                    }
                    let sim = similarity_with_size_hint(img1.hash, img2.hash, img1.file_size, img2.file_size, threshold);
                    if sim >= threshold {
                        PROCESSED_SET.insert(img2.path.clone(), true);
                        matches.push(DuplicateMatch {
                            path: img2.path.to_string_lossy().to_string(),
                            category: img2.category.clone(),
                            similarity: sim,
                        });
                    }
                }
                if !matches.is_empty() {
                    core_results.push(DuplicateImage {
                        path: img1.path.to_string_lossy().to_string(),
                        category: img1.category.clone(),
                        similarity: 1.0,
                        duplicates: matches,
                    });
                }
            }
            core_results
        })
        .collect()
}

fn collect_image_paths(root: &Path) -> Result<Vec<(PathBuf, String, u64)>, String> {
    if !root.exists() {
        return Err(format!("Root path does not exist: {}", root.display()));
    }
    let entries = std::fs::read_dir(root)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries
        .par_iter()
        .filter_map(|entry| {
            let dir = entry.path();
            if !dir.is_dir() { return None; }
            let cat = dir.file_name()?.to_str()?.to_string();
            if cat == "temp" { return None; }

            let files = std::fs::read_dir(&dir).ok()?
                .collect::<Result<Vec<_>, _>>().ok()?;

            let paths: Vec<_> = files.par_iter().filter_map(|f| {
                let p = f.path();
                let ext = p.extension()?.to_str()?.to_lowercase();
                if ["jpg", "jpeg", "png", "jfif", "webp", "bmp", "tiff", "gif"].contains(&ext.as_str()) {
                    let size = std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                    Some((p, cat.clone(), size))
                } else {
                    None
                }
            }).collect();

            Some(paths)
        })
        .flatten()
        .collect())
}
