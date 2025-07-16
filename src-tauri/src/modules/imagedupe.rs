use crate::modules::config::get_config;
use opencv::{
    core::{Mat, Size},
    imgcodecs, imgproc,
    prelude::*,
};
use rayon::prelude::*;
use serde::Serialize;
use sha2::{Sha256, Digest};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tokio::task;
use tauri::Emitter;

const BATCH_SIZE: usize = 200;

// Enhanced similarity levels
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SimilarityLevel {
    Identical,      // 1.0 - Exact visual match
    NearIdentical,  // 0.98-0.99 - Almost identical
    VerySimilar,    // 0.95-0.97 - Very similar
    Similar,        // 0.90-0.94 - Clearly related
}

#[derive(Debug, Serialize, Clone)]
pub struct EnhancedDuplicateImage {
    pub path: String,
    pub category: String,
    pub file_size: u64,
    pub file_hash: Option<String>, // SHA256 for exact file matches
    pub similarity: f64,
    pub similarity_level: String,
    pub duplicates: Vec<EnhancedDuplicateMatch>,
}

#[derive(Debug, Serialize, Clone)]
pub struct EnhancedDuplicateMatch {
    pub path: String,
    pub category: String,
    pub file_size: u64,
    pub file_hash: Option<String>,
    pub similarity: f64,
    pub similarity_level: String,
    pub match_type: String, // "identical_file", "identical_visual", "similar"
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
struct EnhancedImageHash {
    path: PathBuf,
    category: String,
    visual_hash: Arc<Mat>,      // dHash for visual similarity
    file_size: u64,
    file_hash: Option<String>,  // SHA256 for exact file matching
}

// Fast file hash computation (only for potentially identical files)
fn compute_file_hash(path: &Path) -> Option<String> {
    if let Ok(contents) = fs::read(path) {
        let mut hasher = Sha256::new();
        hasher.update(&contents);
        Some(format!("{:x}", hasher.finalize()))
    } else {
        None
    }
}

// Enhanced visual hash (your existing dHash)
fn compute_visual_hash(image_path: &Path) -> Result<Mat, Box<dyn std::error::Error + Send + Sync>> {
    let img = imgcodecs::imread(
        image_path.to_str().ok_or("Invalid path")?,
        imgcodecs::IMREAD_GRAYSCALE,
    )?;

    let mut resized = Mat::default();
    imgproc::resize(&img, &mut resized, Size::new(9, 8), 0.0, 0.0, imgproc::INTER_LINEAR)?;

    let mut hash = Mat::zeros(8, 8, opencv::core::CV_8U)?.to_mat()?;

    for y in 0..8 {
        for x in 0..8 {
            let left_pixel: u8 = *resized.at_2d::<u8>(y, x)?;
            let right_pixel: u8 = *resized.at_2d::<u8>(y, x + 1)?;
            let hash_value: u8 = if left_pixel > right_pixel { 1 } else { 0 };
            *hash.at_2d_mut::<u8>(y, x)? = hash_value;
        }
    }

    Ok(hash)
}

// Enhanced similarity computation with detailed levels
fn compute_enhanced_similarity(
    hash1: &Mat,
    hash2: &Mat,
) -> Result<f64, Box<dyn std::error::Error + Send + Sync>> {
    let mut xor_result = Mat::default();
    opencv::core::bitwise_xor(hash1, hash2, &mut xor_result, &opencv::core::no_array())?;

    let different_bits = opencv::core::count_non_zero(&xor_result)?;
    let total_bits = hash1.rows() * hash1.cols();

    let similarity = 1.0 - (different_bits as f64 / total_bits as f64);
    Ok(similarity)
}

// Determine similarity level and match type
fn analyze_similarity(
    similarity: f64,
    file1_size: u64,
    file2_size: u64,
    file1_hash: &Option<String>,
    file2_hash: &Option<String>,
) -> (SimilarityLevel, String) {
    // Check for exact file match first
    if let (Some(hash1), Some(hash2)) = (file1_hash, file2_hash) {
        if hash1 == hash2 {
            return (SimilarityLevel::Identical, "identical_file".to_string());
        }
    }

    // Check file sizes for quick identical detection
    if file1_size == file2_size && similarity >= 1.0 {
        return (SimilarityLevel::Identical, "identical_visual".to_string());
    }

    // Classify based on similarity score
    let level = if similarity >= 1.0 {
        SimilarityLevel::Identical
    } else if similarity >= 0.98 {
        SimilarityLevel::NearIdentical
    } else if similarity >= 0.95 {
        SimilarityLevel::VerySimilar
    } else {
        SimilarityLevel::Similar
    };

    let match_type = if similarity >= 0.98 {
        "identical_visual"
    } else {
        "similar"
    }.to_string();

    (level, match_type)
}

fn similarity_level_to_string(level: SimilarityLevel) -> String {
    match level {
        SimilarityLevel::Identical => "Identical".to_string(),
        SimilarityLevel::NearIdentical => "Near Identical".to_string(),
        SimilarityLevel::VerySimilar => "Very Similar".to_string(),
        SimilarityLevel::Similar => "Similar".to_string(),
    }
}

fn format_time(seconds: f64) -> String {
    if seconds < 60.0 {
        format!("{:.0} seconds", seconds)
    } else if seconds < 3600.0 {
        format!("{:.1} minutes", seconds / 60.0)
    } else {
        let hours = (seconds / 3600.0).floor();
        let minutes = ((seconds % 3600.0) / 60.0).floor();
        format!("{:.0}h {:.0}m", hours, minutes)
    }
}

#[tauri::command]
pub async fn find_duplicates_enhanced(
    similarity_threshold: Option<f64>,
    include_file_hash: Option<bool>, // Whether to compute file hashes for exact matching
    window: tauri::Window,
) -> Result<Vec<EnhancedDuplicateImage>, String> {
    let threshold = similarity_threshold.unwrap_or(0.95);
    let compute_file_hashes = include_file_hash.unwrap_or(true);
    let config = get_config();
    let root_path = config.folderPath;
    let start_time = std::time::Instant::now();

    // Initial progress update
    let _ = window.emit(
        "dupe-check-started",
        ProgressInfo {
            filename: "Enhanced Duplicate Check".to_string(),
            progress: 0.0,
            status: "starting".to_string(),
            phase: "Initializing".to_string(),
            current_file: None,
            target_file: None,
            processed_files: 0,
            total_files: 0,
            estimated_time_remaining: None,
            elapsed_time: Some("0 seconds".to_string()),
        },
    );

    task::spawn_blocking(move || {
        // Collect image paths
        let image_paths = match collect_image_paths(&root_path) {
            Ok(paths) => paths,
            Err(e) => return Err(format!("Failed to collect image paths: {}", e)),
        };

        let total_images = image_paths.len();
        let processed_count = Arc::new(AtomicUsize::new(0));
        let window = Arc::new(window);

        // Phase 1: Group by file size for quick identical file detection
        let mut size_groups: HashMap<u64, Vec<(PathBuf, String)>> = HashMap::new();

        for (path, category) in &image_paths {
            if let Ok(metadata) = fs::metadata(path) {
                let size = metadata.len();
                size_groups.entry(size).or_insert_with(Vec::new).push((path.clone(), category.clone()));
            }
        }

        // Phase 2: Compute hashes with enhanced progress reporting
        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Enhanced Duplicate Check".to_string(),
                progress: 10.0,
                status: "processing".to_string(),
                phase: "Computing Hashes".to_string(),
                current_file: None,
                target_file: None,
                processed_files: 0,
                total_files: total_images,
                estimated_time_remaining: None,
                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
            },
        );

        let image_hashes: Vec<EnhancedImageHash> = image_paths
            .par_chunks(BATCH_SIZE)
            .flat_map(|batch| {
                let mut batch_results = Vec::with_capacity(batch.len());
                for (path, category) in batch {
                    let count = processed_count.fetch_add(1, Ordering::Relaxed);

                    // Update progress
                    if count % 10 == 0 {
                        let progress = (count as f32 / total_images as f32) * 40.0 + 10.0;
                        let _ = window.emit(
                            "dupe-check-progress",
                            ProgressInfo {
                                filename: "Enhanced Duplicate Check".to_string(),
                                progress,
                                status: "processing".to_string(),
                                phase: "Computing Hashes".to_string(),
                                current_file: Some(path.to_string_lossy().to_string()),
                                target_file: None,
                                processed_files: count,
                                total_files: total_images,
                                estimated_time_remaining: None,
                                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
                            },
                        );
                    }

                    if let Ok(visual_hash) = compute_visual_hash(path) {
                        let file_size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);

                        // Only compute file hash if requested and file size matches other files
                        let file_hash = if compute_file_hashes && size_groups.get(&file_size).map_or(false, |v| v.len() > 1) {
                            compute_file_hash(path)
                        } else {
                            None
                        };

                        batch_results.push(EnhancedImageHash {
                            path: path.clone(),
                            category: category.clone(),
                            visual_hash: Arc::new(visual_hash),
                            file_size,
                            file_hash,
                        });
                    }
                }
                batch_results
            })
            .collect();

        // Phase 3: Enhanced comparison with multiple similarity levels
        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Enhanced Duplicate Check".to_string(),
                progress: 50.0,
                status: "processing".to_string(),
                phase: "Comparing Images".to_string(),
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
        let total_comparisons = image_hashes.len() * (image_hashes.len() - 1) / 2;

        image_hashes.par_chunks(50).enumerate().for_each(|(chunk_idx, chunk)| {
            for (idx, img1) in chunk.iter().enumerate() {
                let global_idx = chunk_idx * 50 + idx;

                if processed.lock().unwrap().contains(&img1.path) {
                    continue;
                }

                let mut current_duplicates = Vec::new();

                for img2 in image_hashes.iter().skip(global_idx + 1) {
                    if processed.lock().unwrap().contains(&img2.path) {
                        continue;
                    }

                    let comp_count = comparison_count.fetch_add(1, Ordering::Relaxed);

                    // Progress reporting
                    if comp_count % 1000 == 0 {
                        let progress = 50.0 + (comp_count as f32 / total_comparisons as f32) * 45.0;
                        let _ = window.emit(
                            "dupe-check-progress",
                            ProgressInfo {
                                filename: "Enhanced Duplicate Check".to_string(),
                                progress: progress.min(95.0),
                                status: "processing".to_string(),
                                phase: "Comparing Images".to_string(),
                                current_file: Some(img1.path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                                target_file: Some(img2.path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                                processed_files: comp_count,
                                total_files: total_comparisons,
                                estimated_time_remaining: None,
                                elapsed_time: Some(format_time(start_time.elapsed().as_secs_f64())),
                            },
                        );
                    }

                    if let Ok(similarity) = compute_enhanced_similarity(&img1.visual_hash, &img2.visual_hash) {
                        if similarity >= threshold {
                            let (similarity_level, match_type) = analyze_similarity(
                                similarity,
                                img1.file_size,
                                img2.file_size,
                                &img1.file_hash,
                                &img2.file_hash,
                            );

                            processed.lock().unwrap().insert(img2.path.clone());
                            current_duplicates.push(EnhancedDuplicateMatch {
                                path: img2.path.to_string_lossy().to_string(),
                                category: img2.category.clone(),
                                file_size: img2.file_size,
                                file_hash: img2.file_hash.clone(),
                                similarity,
                                similarity_level: similarity_level_to_string(similarity_level),
                                match_type,
                            });
                        }
                    }
                }

                if !current_duplicates.is_empty() {
                    let (similarity_level, _) = analyze_similarity(
                        1.0,
                        img1.file_size,
                        img1.file_size,
                        &img1.file_hash,
                        &img1.file_hash,
                    );

                    duplicates.lock().unwrap().push(EnhancedDuplicateImage {
                        path: img1.path.to_string_lossy().to_string(),
                        category: img1.category.clone(),
                        file_size: img1.file_size,
                        file_hash: img1.file_hash.clone(),
                        similarity: 1.0,
                        similarity_level: similarity_level_to_string(similarity_level),
                        duplicates: current_duplicates,
                    });
                }
            }
        });

        // Complete
        let final_results = Arc::try_unwrap(duplicates).unwrap().into_inner().unwrap();
        let _ = window.emit(
            "dupe-check-finished",
            ProgressInfo {
                filename: "Enhanced Duplicate Check".to_string(),
                progress: 100.0,
                status: "complete".to_string(),
                phase: "Complete".to_string(),
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

    if !root_path.exists() {
        return Err(format!("Root path does not exist: {}", root_path.display()));
    }

    let entries = match std::fs::read_dir(root_path) {
        Ok(entries) => entries.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?,
        Err(e) => return Err(format!("Failed to read root directory: {}", e)),
    };

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

            let files = match fs::read_dir(&category_path) {
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