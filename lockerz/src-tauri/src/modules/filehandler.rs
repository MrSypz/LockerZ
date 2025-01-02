use crate::modules::config::CONFIG;
use crate::modules::files::FileInfo;
use crate::modules::logger;
use chrono::{DateTime, Local};
use logger::LOGGER;
use serde::{Deserialize, Serialize};
use std::fs::{self};
use std::io;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileMoveResponse {
    pub success: bool,
    pub file: FileInfo,
}

#[tauri::command]
pub async fn move_file(original_path: String, category: Option<String>) -> Result<FileMoveResponse, String> {
    let root_folder_path = &CONFIG.folderPath;
    let category = category.unwrap_or_else(|| "uncategorized".to_string());
    let category_path = root_folder_path.join(&category);

    fs::create_dir_all(&category_path)
        .map_err(|e| format!("Error creating directory: {}", e))?;

    let file_name = Path::new(&original_path).file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let target_path = category_path.join(&file_name);

    let stats = match move_file_with_fallback(&original_path, &target_path) {
        Ok(s) => s,
        Err(e) => return Err(format!("File operation failed: {}", e)),
    };

    match clear_relevant_caches(&[category.clone()]).await {
        Ok(_) => LOGGER.info(&format!("Cache cleared for category: {}", category))
            .expect("Failed to log cache clearing"),
        Err(e) => return Err(format!("Cache clear failed: {}", e)),
    }

    let file_info = FileInfo {
        name: file_name,
        category: category.clone(),
        filepath: target_path.to_string_lossy().to_string(),
        size: stats.len(),
        last_modified: DateTime::<Local>::from(stats.modified().unwrap())
            .format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    Ok(FileMoveResponse {
        success: true,
        file: file_info,
    })
}

fn move_file_with_fallback(src: &str, dst: &PathBuf) -> io::Result<fs::Metadata> {
    match fs::rename(src, dst) {
        Ok(_) => fs::metadata(dst),
        Err(e) => {
            // Handle cross-disk moves
            fs::copy(src, dst)?;
            fs::remove_file(src)?;
            fs::metadata(dst)
        }
    }
}
#[tauri::command]
pub async fn delete_file(category: String, name: String) -> Result<FileDeleteResponse, String> {
    let file_path = CONFIG.folderPath.join(&category).join(&name);

    fs::remove_file(&file_path)
        .map_err(|e| format!("Delete failed: {}", e))?;

    match clear_relevant_caches(&[category.clone()]).await {
        Ok(_) => LOGGER.info(&format!("Cache cleared for: {}", category))
            .expect("Failed to log cache clearing"),
        Err(e) => return Err(format!("Cache clear failed: {}", e)),
    }

    Ok(FileDeleteResponse { success: true })
}

async fn clear_relevant_caches(categories: &[String]) -> Result<(), String> {
    let cache_dir = Path::new("cache");

    for category in categories {
        let cache_file = if category == "uncategorized" {
            cache_dir.join("all_files.bin")
        } else {
            cache_dir.join(format!("{}_files.bin", category))
        };

        if cache_file.exists() {
            fs::remove_file(&cache_file)
                .map_err(|e| format!("Failed to remove cache file for {}: {}", category, e))?;
        }
    }

    // Also clear "all" category cache since it contains everything
    let all_cache = cache_dir.join("all_files.bin");
    if all_cache.exists() {
        fs::remove_file(all_cache)
            .map_err(|e| format!("Failed to remove all_files cache: {}", e))?;
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileDeleteResponse {
    pub success: bool,
}

