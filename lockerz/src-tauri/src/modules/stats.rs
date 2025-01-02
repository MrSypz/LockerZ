use crate::modules::config::CONFIG;
use serde::Serialize;
use std::fs::{self};
use std::path::Path;

#[derive(Serialize)]
pub struct StatsResponse {
    pub total_images: u64,
    pub categories: u32,
    pub storage_used: u64,
}

fn get_dir_stats(path: &Path) -> Result<(u64, u64), String> {
    let mut total_size = 0;
    let mut count = 0;

    // Read the directory entries recursively
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Error reading directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Error reading entry: {}", e))?;
        let entry_path = entry.path();

        if entry_path.is_dir() {
            // Recursively get the stats for subdirectories
            let (subdir_size, subdir_count) = get_dir_stats(&entry_path)?;
            total_size += subdir_size;
            count += subdir_count;
        } else if entry_path.is_file() {
            // For files, accumulate the size and count
            let metadata = fs::metadata(&entry_path)
                .map_err(|e| format!("Error reading metadata: {}", e))?;
            total_size += metadata.len();
            count += 1;
        }
    }

    Ok((total_size, count))
}

#[tauri::command]
pub async fn get_stats() -> Result<StatsResponse, String> {
    let root_folder_path = &CONFIG.folderPath;

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    // Get directory stats (size and file count)
    let (size, count) = get_dir_stats(root_folder_path)?;

    // Get categories count (directories excluding "temp" directory)
    let entries = fs::read_dir(root_folder_path)
        .map_err(|e| format!("Error reading root folder: {}", e))?;
    let categories_count = entries.filter(|entry| {
        match entry {
            Ok(entry) => entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) && entry.file_name() != "temp",
            Err(_) => false,
        }
    }).count();

    Ok(StatsResponse {
        total_images: count,
        categories: categories_count as u32,
        storage_used: size,
    })
}
