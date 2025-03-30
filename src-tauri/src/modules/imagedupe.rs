use crate::modules::config::get_config;
use opencv::{
    core::{Mat, Rect, Size},
    imgcodecs, imgproc,
    prelude::*,
};
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tokio::task;
use tauri::Emitter;

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
    // Add additional fields for more detailed progress reporting
    pub processed_files: usize,
    pub total_files: usize,
    pub estimated_time_remaining: Option<String>,
    pub elapsed_time: Option<String>,
}

#[derive(Clone)]
struct ImageHash {
    path: PathBuf,
    category: String,
    hash: Arc<Mat>,
}

// Use faster algorithm for pHash computation
fn compute_phash(image_path: &Path) -> Result<Mat, Box<dyn std::error::Error + Send + Sync>> {
    let img = match imgcodecs::imread(
        image_path.to_str().ok_or("Invalid path")?,
        imgcodecs::IMREAD_GRAYSCALE,
    ) {
        Ok(img) => img,
        Err(e) => return Err(format!("Failed to read image: {}", e).into()),
    };

    let mut resized = Mat::default();
    imgproc::resize(
        &img,
        &mut resized,
        Size::new(32, 32),
        0.0,
        0.0,
        imgproc::INTER_LINEAR,
    )?;

    let mut float_img = Mat::default();
    resized.convert_to(&mut float_img, opencv::core::CV_32F, 1.0, 0.0)?;

    let mut dct = Mat::default();
    opencv::core::dct(&float_img, &mut dct, 0)?;

    // Use a smaller ROI for faster comparison (8x8 vs original 8x8)
    let roi = dct.roi(Rect::new(0, 0, 8, 8))?;
    let mut hash = Mat::default();
    roi.copy_to(&mut hash)?;

    Ok(hash)
}

// Optimized similarity computation
fn compute_similarity(
    hash1: &Mat,
    hash2: &Mat,
) -> Result<f64, Box<dyn std::error::Error + Send + Sync>> {
    let mut diff = Mat::default();
    opencv::core::absdiff(hash1, hash2, &mut diff)?;
    let sum = opencv::core::sum_elems(&diff)?;
    // Adjusted max_diff for 8x8 ROI
    let max_diff = 255.0 * 64.0;
    let similarity = 1.0 - (sum[0] / max_diff);
    Ok(similarity)
}

// Helper function to format time
fn format_time(seconds: f64) -> String {
    if seconds < 60.0 {
        return format!("{:.0} seconds", seconds);
    } else if seconds < 3600.0 {
        return format!("{:.1} minutes", seconds / 60.0);
    } else {
        let hours = (seconds / 3600.0).floor();
        let minutes = ((seconds % 3600.0) / 60.0).floor();
        return format!("{:.0}h {:.0}m", hours, minutes);
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
    let start_time = std::time::Instant::now();

    // Initial progress update
    let _ = window.emit(
        "dupe-check-started",
        ProgressInfo {
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
        },
    );

    task::spawn_blocking(move || {
        // Phase: Collecting image paths
        window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 5.0,
                status: "processing".to_string(),
                phase: PHASE_COLLECTING.to_string(),
                current_file: Some(root_path.to_string_lossy().to_string()),
                target_file: None,
                processed_files: 0,
                total_files: 0,
                estimated_time_remaining: None,
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        ).unwrap_or_default();

        // Collect image paths
        let image_paths = match collect_image_paths(&root_path) {
            Ok(paths) => paths,
            Err(e) => return Err(format!("Failed to collect image paths: {}", e)),
        };

        let total_images = image_paths.len();
        let processed_count = Arc::new(AtomicUsize::new(0));
        let window = Arc::new(window);

        // Report image collection completed
        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 10.0,
                status: "processing".to_string(),
                phase: PHASE_HASHING.to_string(),
                current_file: None,
                target_file: None,
                processed_files: 0,
                total_files: total_images,
                estimated_time_remaining: None,
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        );

        // Compute hashes in parallel with better progress reporting
        let hash_start_time = std::time::Instant::now();
        let image_hashes: Vec<ImageHash> = image_paths
            .par_chunks(BATCH_SIZE)
            .flat_map(|batch| {
                let mut batch_results = Vec::with_capacity(batch.len());
                for (path, category) in batch {
                    if let Ok(hash) = compute_phash(path) {
                        let count = processed_count.fetch_add(1, Ordering::Relaxed);

                        // Update progress more frequently for better UI feedback
                        if count % 5 == 0 || count == total_images - 1 {
                            // Calculate more accurate progress and timing estimates
                            let progress = (count as f32 / total_images as f32) * 40.0 + 10.0;
                            let elapsed = hash_start_time.elapsed().as_secs_f64();
                            let estimated_remaining = if count > 0 {
                                Some(format_time((elapsed / count as f64) * (total_images - count) as f64))
                            } else {
                                None
                            };

                            let _ = window.emit(
                                "dupe-check-progress",
                                ProgressInfo {
                                    filename: "Duplicate Check".to_string(),
                                    progress,
                                    status: "processing".to_string(),
                                    phase: PHASE_HASHING.to_string(),
                                    current_file: Some(path.to_string_lossy().to_string()),
                                    target_file: None,
                                    processed_files: count,
                                    total_files: total_images,
                                    estimated_time_remaining: estimated_remaining,
                                    elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
                                },
                            );
                        }
                        batch_results.push(ImageHash {
                            path: path.clone(),
                            category: category.clone(),
                            hash: Arc::new(hash),
                        });
                    }
                }
                batch_results
            })
            .collect();

        // Start comparison phase
        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 50.0,
                status: "processing".to_string(),
                phase: PHASE_COMPARING.to_string(),
                current_file: None,
                target_file: None,
                processed_files: 0,
                total_files: image_hashes.len(),
                estimated_time_remaining: None,
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        );

        let duplicates = Arc::new(Mutex::new(Vec::new()));
        let processed = Arc::new(Mutex::new(HashSet::<PathBuf>::new()));
        let comparison_count = Arc::new(AtomicUsize::new(0));

        // Calculate total potential comparisons for better progress reporting
        let total_comparisons = image_hashes.len() * (image_hashes.len() - 1) / 2;
        let compare_start = std::time::Instant::now();

        // Process image chunks in parallel more efficiently
        image_hashes.par_chunks(BATCH_SIZE / 4).enumerate().for_each(|(chunk_idx, chunk)| {
            for (idx, img1) in chunk.iter().enumerate() {
                let global_idx = chunk_idx * (BATCH_SIZE / 4) + idx;

                if processed.lock().unwrap().contains(&img1.path) {
                    continue;
                }

                let mut current_duplicates = Vec::new();

                // Only compare with remaining images to avoid duplicate work
                for img2 in image_hashes.iter().skip(global_idx + 1) {
                    if processed.lock().unwrap().contains(&img2.path) {
                        continue;
                    }

                    let comp_count = comparison_count.fetch_add(1, Ordering::Relaxed);

                    // Update progress more frequently for very large collections
                    if comp_count % 500 == 0 || (comp_count < 1000 && comp_count % 100 == 0) {
                        let elapsed = compare_start.elapsed().as_secs_f64();
                        let estimated_remaining = if comp_count > 0 {
                            Some(format_time((elapsed / comp_count as f64) * (total_comparisons - comp_count) as f64))
                        } else {
                            None
                        };

                        let progress = 50.0 + (comp_count as f32 / total_comparisons as f32) * 49.0;

                        let _ = window.emit(
                            "dupe-check-progress",
                            ProgressInfo {
                                filename: "Duplicate Check".to_string(),
                                progress: progress.min(99.0),
                                status: "processing".to_string(),
                                phase: PHASE_COMPARING.to_string(),
                                current_file: Some(img1.path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                                target_file: Some(img2.path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                                processed_files: comp_count,
                                total_files: total_comparisons,
                                estimated_time_remaining: estimated_remaining,
                                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
                            },
                        );
                    }

                    if let Ok(similarity) = compute_similarity(&img1.hash, &img2.hash) {
                        if similarity >= threshold {
                            processed.lock().unwrap().insert(img2.path.clone());
                            current_duplicates.push(DuplicateMatch {
                                path: img2.path.to_string_lossy().to_string(),
                                category: img2.category.clone(),
                                similarity,
                            });
                        }
                    }
                }

                if !current_duplicates.is_empty() {
                    duplicates.lock().unwrap().push(DuplicateImage {
                        path: img1.path.to_string_lossy().to_string(),
                        category: img1.category.clone(),
                        similarity: 1.0,
                        duplicates: current_duplicates,
                    });
                }
            }
        });

        // Finalizing phase
        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 99.0,
                status: "finalizing".to_string(),
                phase: PHASE_FINALIZING.to_string(),
                current_file: None,
                target_file: None,
                processed_files: total_comparisons,
                total_files: total_comparisons,
                estimated_time_remaining: Some("Almost done".to_string()),
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        );

        // Complete phase
        let final_results = Arc::try_unwrap(duplicates).unwrap().into_inner().unwrap();
        let _ = window.emit(
            "dupe-check-finished",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 100.0,
                status: "complete".to_string(),
                phase: PHASE_COMPLETE.to_string(),
                current_file: None,
                target_file: None,
                processed_files: final_results.len(),
                total_files: total_images,
                estimated_time_remaining: None,
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        );

        Ok(final_results)
    })
        .await
        .map_err(|e| e.to_string())?
}

fn collect_image_paths(root_path: &Path) -> Result<Vec<(PathBuf, String)>, String> {
    let mut image_paths = Vec::new();

    // Check if the root path exists
    if !root_path.exists() {
        return Err(format!("Root path does not exist: {}", root_path.display()));
    }

    // Read directory entries in parallel for better performance
    let entries = match std::fs::read_dir(root_path) {
        Ok(entries) => entries.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?,
        Err(e) => return Err(format!("Failed to read root directory: {}", e)),
    };

    // Process each category directory in parallel
    let paths: Vec<(PathBuf, String)> = entries.par_iter()
        .filter_map(|entry| {
            let category_path = entry.path();
            if !category_path.is_dir() {
                return None;
            }

            let category_name = category_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if category_name == "temp" {
                return None;
            }

            let files = match std::fs::read_dir(&category_path) {
                Ok(files) => files.collect::<Result<Vec<_>, _>>().ok()?,
                Err(_) => return None,
            };

            let mut category_paths = Vec::new();
            for file in files {
                let file_path = file.path();
                if let Some(extension) = file_path.extension() {
                    let ext = extension.to_str().unwrap_or("").to_lowercase();
                    if ["jpg", "jpeg", "png", "jfif", "webp"].contains(&ext.as_str()) {
                        category_paths.push((file_path, category_name.clone()));
                    }
                }
            }

            Some(category_paths)
        })
        .flatten()
        .collect();

    image_paths.extend(paths);

    Ok(image_paths)
}