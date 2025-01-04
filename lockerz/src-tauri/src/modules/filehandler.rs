use crate::modules::config::get_config;
use crate::modules::files::{hash_directory_path, read_cache, write_cache, FileInfo};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs::{self};
use std::io;
use std::path::{Path, PathBuf};
use crate::{log_error, log_info};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileMoveResponse {
    pub success: bool,
    pub file: FileInfo,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileDeleteResponse {
    pub success: bool,
    pub file: String,

}
#[derive(Serialize, Deserialize, Debug)]
pub struct MoveFileCategoryResponse {
    success: bool,
}

#[tauri::command]
pub async fn move_file(original_path: String, category: Option<String>) -> Result<FileMoveResponse, String> {
    let root_folder_path = get_config().folderPath;
    let category = category.unwrap_or_else(|| "uncategorized".to_string());
    let category_path = root_folder_path.join(&category);

    fs::create_dir_all(&category_path)
        .map_err(|e| {
            let error_msg = format!("Error creating directory: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;

    let file_name = Path::new(&original_path).file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let target_path = category_path.join(&file_name);

    let stats = match move_file_with_fallback(&original_path, &target_path) {
        Ok(s) => s,
        Err(e) => {
            let error_msg = format!("File operation failed: {}", e);
            log_error!("{}",error_msg);
            return Err(error_msg);
        },
    };

    log_info!("File {} has uploaded to Category: {} ",file_name,category);
    let new_cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, &category)));

    // Create or update the new category cache
    let mut new_cache = read_cache(&new_cache_path)
        .map_err(|e| {
            let error_msg = format!("Error reading new cache: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    // Add the updated file info to the new category cache
    let updated_file_info = FileInfo {
        name: file_name.clone(),
        category: category.clone(),
        filepath: target_path.to_string_lossy().to_string(),
        size: stats.len(),
        last_modified: DateTime::<Local>::from(stats.modified().unwrap())
            .format("%Y-%m-%d %H:%M:%S").to_string(),
        created_at: DateTime::<Local>::from(stats.created().unwrap())
            .format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    new_cache.push(updated_file_info);

    // Write the updated caches back to disk
    write_cache(&new_cache_path, &new_cache)
        .map_err(|e| {
            let error_msg = format!("Error writing new cache: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    // Return the response with updated file information
    let file_info = FileInfo {
        name: file_name,
        category: category.clone(),
        filepath: target_path.to_string_lossy().to_string(),
        size: stats.len(),
        last_modified: DateTime::<Local>::from(stats.modified().unwrap())
            .format("%Y-%m-%d %H:%M:%S").to_string(),
        created_at: DateTime::<Local>::from(stats.created().unwrap())
            .format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    Ok(FileMoveResponse {
        success: true,
        file: file_info,
    })
}

#[tauri::command]
pub async fn delete_file(category: String, name: String) -> Result<FileDeleteResponse, String> {
    let root_folder_path = get_config().folderPath;
    let file_path = root_folder_path.join(&category).join(&name);

    // Remove the file from the filesystem
    fs::remove_file(&file_path)
        .map_err(|e| {
            let error_msg = format!("Delete failed: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    log_info!("File {} has been deleted from Category: {}",name, category);
    // Update the cache: Remove the file from the cache for this category
    let cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, &category)));
    let mut cache = read_cache(&cache_path)
        .map_err(|e| format!("Error reading cache: {}", e))?;

    remove_file_from_cache(&mut cache, &name);

    write_cache(&cache_path, &cache)
        .map_err(|e| {
            let error_msg = format!("Error writing updated cache: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    Ok(FileDeleteResponse {
        success: true,
        file: name
    })
}

#[tauri::command]
pub async fn move_file_category(
    old_category: String,
    new_category: String,
    file_name: String,
) -> Result<MoveFileCategoryResponse, String> {
    let root_folder_path = get_config().folderPath;

    let old_path = root_folder_path.join(&old_category).join(&file_name);
    let new_path = root_folder_path.join(&new_category).join(&file_name);

    if !old_path.exists() {
        log_error!("File {} does not exist", file_name);
        return Err(format!("{} does not exist", file_name));
    }

    let new_category_dir = root_folder_path.join(&new_category);
    if !new_category_dir.exists() {
        if let Err(e) = fs::create_dir_all(&new_category_dir) {
            log_error!("Failed to create directory for new category '{}': {}", new_category, e);
            return Err(format!("Failed to create directory for new category '{}': {}", new_category, e));
        }
    }

    if let Err(e) = fs::rename(&old_path, &new_path) {
        log_error!("Failed to move file from '{}' to '{}': {}", old_path.display(), new_path.display(), e);
        return Err(format!("Failed to move file from '{}' to '{}': {}", old_path.display(), new_path.display(), e));
    }

    let old_cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, &old_category)));
    let new_cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, &new_category)));

    let mut old_cache = read_cache(&old_cache_path)
        .map_err(|e| {
            let error_msg = format!("Error reading old cache: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    if let Some(pos) = old_cache.iter().position(|f| f.name == file_name) {
        let file_info = old_cache.remove(pos);

        let updated_file_info = FileInfo {
            category: new_category.clone(),
            filepath: new_path.to_string_lossy().to_string(),
            ..file_info // retain other fields like name, size, etc.
        };

        let mut new_cache = read_cache(&new_cache_path)
            .map_err(|e| {
                let error_msg = format!("Error reading new cache: {}", e);
                log_error!("{}",error_msg);
                error_msg
            })?;
        new_cache.push(updated_file_info);
        write_cache(&new_cache_path, &new_cache)
            .map_err(|e| {
                let error_msg = format!("Error writing new cache: {}", e);
                log_error!("{}",error_msg);
                error_msg
            })?;
    }

    write_cache(&old_cache_path, &old_cache)
        .map_err(|e| {
            let error_msg = format!("Error writing old cache: {}", e);
            log_error!("{}",error_msg);
            error_msg
        })?;

    Ok(MoveFileCategoryResponse { success: true })
}


fn move_file_with_fallback(src: &str, dst: &PathBuf) -> io::Result<fs::Metadata> {
    match fs::rename(src, dst) {
        Ok(_) => fs::metadata(dst),
        Err(e) => {
            fs::copy(src, dst)?;
            fs::remove_file(src)?;
            fs::metadata(dst)
        }
    }
}

fn remove_file_from_cache(cache: &mut Vec<FileInfo>, file_name: &str) {
    if let Some(pos) = cache.iter().position(|f| f.name == file_name) {
        cache.remove(pos);
    }
}
