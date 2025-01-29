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
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tokio::task;

const BATCH_SIZE: usize = 50;

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

fn compute_phash(image_path: &Path) -> Result<Mat, Box<dyn std::error::Error + Send + Sync>> {
    let img = imgcodecs::imread(
        image_path.to_str().ok_or("Invalid path")?,
        imgcodecs::IMREAD_GRAYSCALE,
    )?;

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

    let roi = dct.roi(Rect::new(0, 0, 8, 8))?;
    let mut hash = Mat::default();
    roi.copy_to(&mut hash)?;

    Ok(hash)
}

fn compute_similarity(hash1: &Mat, hash2: &Mat) -> Result<f64, Box<dyn std::error::Error + Send + Sync>> {
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

    let start_payload = ProgressInfo {
        filename: "Duplicate Check".to_string(),
        progress: 0.0,
        status: "starting".to_string(),
        phase: "Initializing".to_string(),
        current_file: None,
        target_file: None,
    };
    window.emit("dupe-check-started", start_payload)
        .map_err(|e| format!("Failed to emit start event: {}", e))?;

    task::spawn_blocking(move || {
        let mut image_paths: Vec<(PathBuf, String)> = Vec::new();

        window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 0.0,
            status: "scanning".parse().unwrap(),
            phase: "Scanning Files".to_string(),
            current_file: None,
            target_file: None,
        }).unwrap_or_else(|e| eprintln!("Error emitting progress: {}", e));

        for entry in std::fs::read_dir(&root_path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let category_path = entry.path();

            if !category_path.is_dir() { continue; }

            let category_name = category_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if category_name == "temp" { continue; }

            for file in std::fs::read_dir(&category_path).map_err(|e| e.to_string())? {
                let file = file.map_err(|e| e.to_string())?;
                let file_path = file.path();
                if let Some(extension) = file_path.extension() {
                    if ["jpg", "jpeg", "png", "jfif", "webp"].contains(&extension.to_str().unwrap_or("")) {
                        image_paths.push((file_path, category_name.clone()));
                    }
                }
            }
        }

        let total_images = image_paths.len();
        let processed_count = Arc::new(Mutex::new(0usize));
        let window = Arc::new(window);

        window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 0.0,
            status: "processing".parse().unwrap(),
            phase: "Computing Hashes".to_string(),
            current_file: None,
            target_file: None,
        }).unwrap_or_else(|e| eprintln!("Error emitting progress: {}", e));

        let image_hashes: Vec<(PathBuf, String, Arc<Mat>)> = image_paths
            .par_chunks(BATCH_SIZE)
            .flat_map(|batch| {
                let mut batch_results = Vec::new();
                for (path, category) in batch {
                    match compute_phash(path) {
                        Ok(hash) => {
                            let count = {
                                let mut counter = processed_count.lock().unwrap();
                                *counter += 1;
                                *counter
                            };

                            if count % 2 == 0 {
                                let progress = (count as f32 / total_images as f32) * 40.0;
                                window.emit("dupe-check-progress", ProgressInfo {
                                    filename: "Duplicate Check".to_string(),
                                    progress,
                                    status: "processing".to_string(),
                                    phase: "Computing Hashes".to_string(),
                                    current_file: Some(path.to_string_lossy().to_string()),
                                    target_file: None,
                                }).unwrap_or_else(|e| eprintln!("Error emitting progress: {}", e));
                            }
                            batch_results.push((path.clone(), category.clone(), Arc::new(hash)));
                        }
                        Err(e) => eprintln!("Error computing hash for {:?}: {}", path, e),
                    }
                }
                batch_results
            })
            .collect();

        window.emit("dupe-check-progress", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 40.0,
            status: "processing".parse().unwrap(),
            phase: "Comparing Images".to_string(),
            current_file: None,
            target_file: None,
        }).unwrap_or_else(|e| eprintln!("Error emitting progress: {}", e));

        let duplicates = Arc::new(Mutex::new(Vec::new()));
        let processed = Arc::new(Mutex::new(HashSet::new()));
        let comparison_count = Arc::new(Mutex::new(0usize));
        let total_comparisons = (image_hashes.len() * (image_hashes.len() - 1)) / 2;

        image_hashes.par_chunks(BATCH_SIZE).for_each(|batch| {
            for (path1, category1, hash1) in batch {
                if processed.lock().unwrap().contains(path1) {
                    continue;
                }

                let mut current_duplicates = Vec::new();

                for (path2, category2, hash2) in &image_hashes {
                    if path1 == path2 { continue; }

                    let comp_count = {
                        let mut counter = comparison_count.lock().unwrap();
                        *counter += 1;
                        *counter
                    };

                    if comp_count % 50 == 0 {
                        let progress = 40.0 + (comp_count as f32 / total_comparisons as f32) * 60.0;
                        window.emit("dupe-check-progress", ProgressInfo {
                            filename: "Duplicate Check".to_string(),
                            progress: progress.min(99.0),
                            status: "processing".to_string(),
                            phase: "Comparing Images".to_string(),
                            current_file: Some(path1.to_string_lossy().to_string()),
                            target_file: Some(path2.to_string_lossy().to_string()),
                        }).unwrap_or_else(|e| eprintln!("Error emitting progress: {}", e));
                    }

                    match compute_similarity(&hash1, &hash2) {
                        Ok(similarity) if similarity >= threshold => {
                            processed.lock().unwrap().insert(path2.clone());
                            current_duplicates.push(DuplicateMatch {
                                path: path2.to_string_lossy().to_string(),
                                category: category2.clone(),
                                similarity,
                            });
                        }
                        Ok(_) => {}
                        Err(e) => eprintln!("Error comparing images: {}", e),
                    }
                }

                if !current_duplicates.is_empty() {
                    duplicates.lock().unwrap().push(DuplicateImage {
                        path: path1.to_string_lossy().to_string(),
                        category: category1.clone(),
                        similarity: 1.0,
                        duplicates: current_duplicates,
                    });
                }
            }
        });

        window.emit("dupe-check-finished", ProgressInfo {
            filename: "Duplicate Check".to_string(),
            progress: 100.0,
            status: "complete".to_string(),
            phase: "Complete".to_string(),
            current_file: None,
            target_file: None,
        }).unwrap_or_else(|e| eprintln!("Error emitting completion: {}", e));

        Ok(Arc::try_unwrap(duplicates)
            .unwrap()
            .into_inner()
            .unwrap())
    })
        .await
        .map_err(|e| e.to_string())?
}