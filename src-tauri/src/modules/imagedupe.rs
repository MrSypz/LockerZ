use crate::modules::config::get_config;
use dashmap::DashMap;
use image::imageops;
use once_cell::sync::Lazy;
use rayon::prelude::*;
use serde::Serialize;
use std::f64::consts::PI;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::Emitter;
use tokio::task;

// ── constants ─────────────────────────────────────────────────────────────────

const HASH_RESIZE: u32 = 32;
const DCT_SIZE: usize = 8; // top-left DCT coefficients to use

const PHASE_INIT: &str = "Initializing";
const PHASE_COLLECTING: &str = "Collecting Images";
const PHASE_HASHING: &str = "Computing Perceptual Hashes";
const PHASE_COMPARING: &str = "Comparing Images";
const PHASE_FINALIZING: &str = "Finalizing Results";
const PHASE_COMPLETE: &str = "Complete";

// ── types ─────────────────────────────────────────────────────────────────────

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

// ── global state ──────────────────────────────────────────────────────────────

static PROCESSED_SET: Lazy<DashMap<PathBuf, bool>> = Lazy::new(DashMap::new);
static PROGRESS_COUNTER: AtomicUsize = AtomicUsize::new(0);

// Pre-computed DCT cosine table: cos_table[k][n] = cos(π/32 * (n+0.5) * k)
static DCT_COS: Lazy<[[f64; 32]; 8]> = Lazy::new(|| {
    let mut table = [[0.0f64; 32]; 8];
    for k in 0..8usize {
        for n in 0..32usize {
            table[k][n] = (PI / 32.0 * (n as f64 + 0.5) * k as f64).cos();
        }
    }
    table
});

// ── pHash (DCT perceptual hash) ───────────────────────────────────────────────
//
// Much smarter than dHash: captures frequency-domain patterns, so it detects
// duplicates even after resize, crop, mild colour shift, or JPEG re-encode.
//
// Algorithm:
//   1. Resize to 32×32 grayscale (Lanczos for quality)
//   2. Apply 2-D DCT-II (rows then columns); only compute first 8 coefficients
//   3. Extract the 8×8 = 64 low-frequency coefficients
//   4. Threshold against the mean → 64-bit hash

fn dct1d_partial(row: &[f64]) -> [f64; DCT_SIZE] {
    let cos = &*DCT_COS;
    let mut out = [0.0f64; DCT_SIZE];
    for k in 0..DCT_SIZE {
        out[k] = row.iter().enumerate().map(|(n, &v)| v * cos[k][n]).sum();
    }
    out
}

fn compute_phash(path: &Path) -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
    let img = image::open(path)?.into_luma8();
    let small = imageops::resize(&img, HASH_RESIZE, HASH_RESIZE, imageops::FilterType::Lanczos3);

    // Build float rows
    let rows: Vec<[f64; 32]> = (0..32)
        .map(|y| {
            let mut row = [0.0f64; 32];
            for x in 0..32usize {
                row[x] = small.get_pixel(x as u32, y as u32)[0] as f64;
            }
            row
        })
        .collect();

    // Row DCT: rows[y] → dct_rows[y][0..8]
    let dct_rows: Vec<[f64; DCT_SIZE]> = rows.iter().map(|r| dct1d_partial(r)).collect();

    // Column DCT on the 8 kept columns: col[y] → dct2[0..8][x]
    let mut coeffs = [[0.0f64; DCT_SIZE]; DCT_SIZE];
    for x in 0..DCT_SIZE {
        let col: [f64; 32] = std::array::from_fn(|y| dct_rows[y][x]);
        let col_dct = dct1d_partial(&col);
        for k in 0..DCT_SIZE {
            coeffs[k][x] = col_dct[k];
        }
    }

    // Flatten the 8×8 block
    let flat: Vec<f64> = coeffs.iter().flat_map(|row| row.iter().copied()).collect();

    // Mean threshold → 64-bit hash
    let mean = flat.iter().sum::<f64>() / 64.0;
    let mut hash: u64 = 0;
    for (i, &v) in flat.iter().enumerate() {
        if v > mean {
            hash |= 1u64 << i;
        }
    }
    Ok(hash)
}

// Hamming distance → [0,1] similarity
#[inline(always)]
fn hamming_similarity(a: u64, b: u64) -> f64 {
    1.0 - ((a ^ b).count_ones() as f64 / 64.0)
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn format_time(secs: f64) -> String {
    if secs < 60.0 {
        format!("{:.0}s", secs)
    } else if secs < 3600.0 {
        format!("{:.1} min", secs / 60.0)
    } else {
        format!("{:.0}h {:.0}m", (secs / 3600.0).floor(), ((secs % 3600.0) / 60.0).floor())
    }
}

fn emit_progress(win: &Arc<tauri::Window>, phase: &str, progress: f32, current: usize, total: usize, start: std::time::Instant) {
    let _ = win.emit("dupe-check-progress", ProgressInfo {
        filename: "Duplicate Check".to_string(),
        progress,
        status: "processing".to_string(),
        phase: phase.to_string(),
        current_file: None,
        target_file: None,
        processed_files: current,
        total_files: total,
        estimated_time_remaining: None,
        elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
    });
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

            let paths: Vec<_> = files.iter().filter_map(|f| {
                let p = f.path();
                let ext = p.extension()?.to_str()?.to_lowercase();
                if ["jpg", "jpeg", "png", "jfif", "webp", "bmp", "tiff", "gif"]
                    .contains(&ext.as_str())
                {
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

// ── command ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn find_duplicates(
    similarity_threshold: Option<f64>,
    window: tauri::Window,
) -> Result<Vec<DuplicateImage>, String> {
    let threshold = similarity_threshold.unwrap_or(0.90);
    let root_path = get_config().folderPath;
    let start = std::time::Instant::now();

    PROCESSED_SET.clear();
    PROGRESS_COUNTER.store(0, Ordering::Relaxed);

    let _ = window.emit("dupe-check-started", ProgressInfo {
        filename: "Duplicate Check".to_string(),
        progress: 0.0,
        status: "starting".to_string(),
        phase: PHASE_INIT.to_string(),
        current_file: None, target_file: None,
        processed_files: 0, total_files: 0,
        estimated_time_remaining: None,
        elapsed_time: Some("0s".to_string()),
    });

    task::spawn_blocking(move || {
        let window = Arc::new(window);

        // ── Phase 1: collect paths ────────────────────────────────────────────
        emit_progress(&window, PHASE_COLLECTING, 5.0, 0, 0, start);

        let image_paths = collect_image_paths(&root_path)
            .map_err(|e| format!("Failed to collect image paths: {}", e))?;
        let total = image_paths.len();

        emit_progress(&window, PHASE_HASHING, 10.0, 0, total, start);

        // ── Phase 2: hash all images in parallel ──────────────────────────────
        let hashed = Arc::new(AtomicUsize::new(0));
        let hash_start = std::time::Instant::now();
        let win2 = window.clone();

        let image_hashes: Vec<ImageHash> = image_paths
            .par_iter()
            .filter_map(|(path, category, file_size)| {
                match compute_phash(path) {
                    Ok(hash) => {
                        let n = hashed.fetch_add(1, Ordering::Relaxed);
                        // Throttle progress events
                        if n % 20 == 0 || n == total.saturating_sub(1) {
                            let elapsed = hash_start.elapsed().as_secs_f64();
                            let eta = (n > 5).then(||
                                format_time((elapsed / n as f64) * (total - n) as f64)
                            );
                            let _ = win2.emit("dupe-check-progress", ProgressInfo {
                                filename: "Duplicate Check".to_string(),
                                progress: 10.0 + (n as f32 / total as f32) * 40.0,
                                status: "processing".to_string(),
                                phase: PHASE_HASHING.to_string(),
                                current_file: Some(path.file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_default()),
                                target_file: None,
                                processed_files: n,
                                total_files: total,
                                estimated_time_remaining: eta,
                                elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
                            });
                        }
                        Some(ImageHash {
                            path: path.clone(),
                            category: category.clone(),
                            hash,
                            file_size: *file_size,
                        })
                    }
                    Err(_) => None,
                }
            })
            .collect();

        let n = image_hashes.len();
        let total_pairs = n * n.saturating_sub(1) / 2;

        emit_progress(&window, PHASE_COMPARING, 50.0, 0, total_pairs, start);

        // ── Phase 3: batch pairwise comparison ────────────────────────────────
        //
        // Outer loop parallelised with Rayon — each thread owns a slice of `i`
        // indices and scans all j > i within that slice.  No manual core
        // splitting needed; Rayon's work-stealer balances the load.
        let cmp_start = std::time::Instant::now();
        let win3 = window.clone();
        let hashes = Arc::new(image_hashes);
        let h = &*hashes;

        let results: Vec<DuplicateImage> = (0..n)
            .into_par_iter()
            .filter_map(|i| {
                if PROCESSED_SET.contains_key(&h[i].path) {
                    return None;
                }

                let matches: Vec<DuplicateMatch> = (i + 1..n)
                    .filter_map(|j| {
                        if PROCESSED_SET.contains_key(&h[j].path) {
                            return None;
                        }

                        // Fast size pre-filter: skip pairs with very different file sizes
                        let size_ratio = h[i].file_size.min(h[j].file_size) as f64
                            / h[i].file_size.max(h[j].file_size).max(1) as f64;
                        if size_ratio < 0.2 {
                            return None;
                        }

                        let g = PROGRESS_COUNTER.fetch_add(1, Ordering::Relaxed);
                        if g % 10_000 == 0 && g > 0 {
                            let elapsed = cmp_start.elapsed().as_secs_f64();
                            let eta = format_time((elapsed / g as f64) * (total_pairs - g) as f64);
                            let _ = win3.emit("dupe-check-progress", ProgressInfo {
                                filename: "Duplicate Check".to_string(),
                                progress: (50.0 + (g as f32 / total_pairs as f32) * 45.0).min(95.0),
                                status: "processing".to_string(),
                                phase: PHASE_COMPARING.to_string(),
                                current_file: None,
                                target_file: None,
                                processed_files: g,
                                total_files: total_pairs,
                                estimated_time_remaining: Some(eta),
                                elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
                            });
                        }

                        let sim = hamming_similarity(h[i].hash, h[j].hash);
                        if sim >= threshold {
                            PROCESSED_SET.insert(h[j].path.clone(), true);
                            Some(DuplicateMatch {
                                path: h[j].path.to_string_lossy().to_string(),
                                category: h[j].category.clone(),
                                similarity: sim,
                            })
                        } else {
                            None
                        }
                    })
                    .collect();

                if !matches.is_empty() {
                    Some(DuplicateImage {
                        path: h[i].path.to_string_lossy().to_string(),
                        category: h[i].category.clone(),
                        similarity: 1.0,
                        duplicates: matches,
                    })
                } else {
                    None
                }
            })
            .collect();

        // ── Done ─────────────────────────────────────────────────────────────
        let _ = window.emit("dupe-check-finished", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 100.0,
            status: "complete".to_string(),
            phase: PHASE_COMPLETE.to_string(),
            current_file: None, target_file: None,
            processed_files: results.len(),
            total_files: n,
            estimated_time_remaining: None,
            elapsed_time: Some(format_time(start.elapsed().as_secs_f64())),
        });

        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}
