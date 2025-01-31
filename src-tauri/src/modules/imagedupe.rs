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
use tauri::Emitter;
use tokio::task;

const BATCH_SIZE: usize = 100;

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
}

#[derive(Clone)]
struct ImageHash {
    path: PathBuf,
    category: String,
    hash: Arc<Mat>,
}

fn compute_phash(image_path: &Path) -> Result<Mat, Box<dyn std::error::Error + Send + Sync>> {
    let img = imgcodecs::imread(
        image_path.to_str().ok_or("Invalid path")?,
        imgcodecs::IMREAD_GRAYSCALE,
    )?;

    let mut resized = Mat::default();
    imgproc::resize(
        &img,
        &mut resized,
        Size::new(64, 64),
        0.0,
        0.0,
        imgproc::INTER_LINEAR,
    )?;

    let mut float_img = Mat::default();
    resized.convert_to(&mut float_img, opencv::core::CV_32F, 1.0, 0.0)?;
    let mut dct = Mat::default();
    opencv::core::dct(&float_img, &mut dct, 0)?;

    let roi = dct.roi(Rect::new(0, 0, 8, 8))?;
    let mut hash = Mat::default();
    roi.copy_to(&mut hash)?;

    Ok(hash)
}

fn compute_similarity(
    hash1: &Mat,
    hash2: &Mat,
) -> Result<f64, Box<dyn std::error::Error + Send + Sync>> {
    let mut diff = Mat::default();
    opencv::core::absdiff(hash1, hash2, &mut diff)?;
    let sum = opencv::core::sum_elems(&diff)?;
    let max_diff = 255.0 * 64.0;
    let similarity = 1.0 - (sum[0] / max_diff);
    Ok(similarity)
}

#[tauri::command]
pub async fn find_duplicates(
    similarity_threshold: Option<f64>,
    window: tauri::Window,
) -> Result<Vec<DuplicateImage>, String> {
    let threshold = similarity_threshold.unwrap_or(0.95);
    let config = get_config();
    let root_path = config.folderPath;

    let _ = window.emit(
        "dupe-check-started",
        ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 0.0,
            status: "starting".to_string(),
            phase: "Initializing".to_string(),
            current_file: None,
            target_file: None,
        },
    );

    task::spawn_blocking(move || {
        // Collect image paths
        let image_paths = collect_image_paths(&root_path)?;
        let total_images = image_paths.len();
        let processed_count = Arc::new(AtomicUsize::new(0));
        let window = Arc::new(window);

        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 0.0,
                status: "processing".to_string(),
                phase: "Computing Hashes".to_string(),
                current_file: None,
                target_file: None,
            },
        );

        // Compute hashes in parallel
        let image_hashes: Vec<ImageHash> = image_paths
            .par_chunks(BATCH_SIZE)
            .flat_map(|batch| {
                let mut batch_results = Vec::with_capacity(batch.len());
                for (path, category) in batch {
                    if let Ok(hash) = compute_phash(path) {
                        let count = processed_count.fetch_add(1, Ordering::Relaxed);
                        if count % 10 == 0 {
                            let progress = (count as f32 / total_images as f32) * 40.0;
                            let _ = window.emit(
                                "dupe-check-progress",
                                ProgressInfo {
                                    filename: "Duplicate Check".to_string(),
                                    progress,
                                    status: "processing".to_string(),
                                    phase: "Computing Hashes".to_string(),
                                    current_file: Some(path.to_string_lossy().to_string()),
                                    target_file: None,
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

        let _ = window.emit(
            "dupe-check-progress",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 40.0,
                status: "processing".to_string(),
                phase: "Comparing Images".to_string(),
                current_file: None,
                target_file: None,
            },
        );

        let duplicates = Arc::new(Mutex::new(Vec::new()));
        let processed = Arc::new(Mutex::new(HashSet::<PathBuf>::new()));
        let comparison_count = Arc::new(AtomicUsize::new(0));

        // Process comparisons in parallel with optimized chunks
        let chunks: Vec<_> = image_hashes.par_chunks(BATCH_SIZE).collect();
        chunks.par_iter().for_each(|chunk| {
            for img1 in *chunk {
                if processed.lock().unwrap().contains(&img1.path) {
                    continue;
                }

                let mut current_duplicates = Vec::new();

                // Only compare with images that come after this one
                let start_idx = image_hashes
                    .iter()
                    .position(|x| x.path == img1.path)
                    .unwrap_or(0)
                    + 1;

                for img2 in image_hashes[start_idx..].iter() {
                    let comp_count = comparison_count.fetch_add(1, Ordering::Relaxed);

                    if comp_count % 1000 == 0 {
                        let _ = window.emit(
                            "dupe-check-progress",
                            ProgressInfo {
                                filename: "Duplicate Check".to_string(),
                                progress: ((40.0 + comp_count as f32 / total_images as f32 * 60.0)
                                    as f32)
                                    .min(99.0),
                                status: "processing".to_string(),
                                phase: "Comparing Images".to_string(),
                                current_file: Some(img1.path.to_string_lossy().to_string()),
                                target_file: Some(img2.path.to_string_lossy().to_string()),
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

        let _ = window.emit(
            "dupe-check-finished",
            ProgressInfo {
                filename: "Duplicate Check".to_string(),
                progress: 100.0,
                status: "complete".to_string(),
                phase: "Complete".to_string(),
                current_file: None,
                target_file: None,
            },
        );

        Ok(Arc::try_unwrap(duplicates).unwrap().into_inner().unwrap())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn collect_image_paths(root_path: &Path) -> Result<Vec<(PathBuf, String)>, String> {
    let mut image_paths = Vec::new();

    for entry in std::fs::read_dir(root_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let category_path = entry.path();

        if !category_path.is_dir() {
            continue;
        }

        let category_name = category_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if category_name == "temp" {
            continue;
        }

        for file in std::fs::read_dir(&category_path).map_err(|e| e.to_string())? {
            let file = file.map_err(|e| e.to_string())?;
            let file_path = file.path();
            if let Some(extension) = file_path.extension() {
                if ["jpg", "jpeg", "png", "jfif", "webp"]
                    .contains(&extension.to_str().unwrap_or(""))
                {
                    image_paths.push((file_path, category_name.clone()));
                }
            }
        }
    }

    Ok(image_paths)
}
