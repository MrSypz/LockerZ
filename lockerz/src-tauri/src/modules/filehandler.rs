use crate::modules::config::get_config;
use crate::modules::filecache::{FileCache, FileInfo};
use crate::{log_error, log_info};
use serde::{Deserialize, Serialize};
use std::fs::{self};
use std::io;
use std::path::{Path, PathBuf};
use crate::modules::pathutils::get_main_path;

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
pub async fn move_file(
    original_path: String,
    category: Option<String>,
) -> Result<FileMoveResponse, String> {
    let root_folder_path = get_config().folderPath;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;

    log_info!("Category Moving to: {:?}", category);

    let category = category.unwrap_or_else(|| "uncategorized".to_string());
    let category_path = root_folder_path.join(&category);

    fs::create_dir_all(&category_path).map_err(|e| {
        let error_msg = format!("Error creating directory: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    let file_name = Path::new(&original_path)
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let target_path = category_path.join(&file_name);

    let stats = match move_file_with_fallback(&original_path, &target_path) {
        Ok(s) => s,
        Err(e) => {
            let error_msg = format!("File operation failed: {}", e);
            log_error!("{}", error_msg);
            return Err(error_msg);
        }
    };

    log_info!("File {} has been uploaded to category: {}", file_name, category);
    let category_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, &category)
    ));
    let mut category_cache = FileCache::read_cache(&category_cache_path).unwrap_or_else(|_| vec![]);

    // Add file info to category cache if not already present
    if !category_cache.iter().any(|f| f.name == file_name) {
        let file_info = FileCache::create_file_info(
            file_name.clone(),
            category.clone(),
            &target_path,
            &stats,
        )
            .map_err(|e| {
                let error_msg = format!("Error creating file info: {}", e);
                log_error!("{}", error_msg);
                error_msg
            })?;

        category_cache.push(file_info);

        // Write updated category cache
        FileCache::write_cache(&category_cache_path, &category_cache).map_err(|e| {
            let error_msg = format!("Error writing category cache: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;
    }

    // --- Update Global 'All' Cache ---
    let all_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, "all")
    ));
    let mut all_cache = FileCache::read_cache(&all_cache_path).unwrap_or_else(|_| vec![]);

    // Ensure no duplicates in the global cache
    if !all_cache.iter().any(|f| f.name == file_name) {
        let all_file_info = FileCache::create_file_info(
            file_name.clone(),
            category.clone(), // Use the correct category here!
            &target_path,
            &stats,
        )
            .map_err(|e| {
                let error_msg = format!("Error creating all category file info: {}", e);
                log_error!("{}", error_msg);
                error_msg
            })?;

        all_cache.push(all_file_info);

        // Write updated 'all' cache
        FileCache::write_cache(&all_cache_path, &all_cache).map_err(|e| {
            let error_msg = format!("Error writing all cache: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;
    }

    // Return successful response
    Ok(FileMoveResponse {
        success: true,
        file: FileCache::create_file_info(
            file_name,
            category,
            &target_path,
            &stats,
        )
            .map_err(|e| format!("Error creating response file info: {}", e))?,
    })
}

#[tauri::command]
pub async fn delete_file(category: String, name: String) -> Result<FileDeleteResponse, String> {
    let root_folder_path = get_config().folderPath;
    let file_path = root_folder_path.join(&category).join(&name);
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;

    // Remove the file from the filesystem
    fs::remove_file(&file_path).map_err(|e| {
        let error_msg = format!("Delete failed: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    log_info!("File {} has been deleted from Category: {}", name, category);

    // Update category cache
    let cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, &category)
    ));
    let mut cache = FileCache::read_cache(&cache_path)
        .map_err(|e| format!("Error reading cache: {}", e))?;

    FileCache::remove_file_from_cache(&mut cache, &name);

    // Update "All" category cache
    let all_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, "all")
    ));
    let mut all_cache = FileCache::read_cache(&all_cache_path)
        .map_err(|e| format!("Error reading 'all' category cache: {}", e))?;

    FileCache::remove_file_from_cache(&mut all_cache, &name);

    // Write updated caches
    FileCache::write_cache(&cache_path, &cache).map_err(|e| {
        let error_msg = format!("Error writing updated cache: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;
    FileCache::write_cache(&all_cache_path, &all_cache).map_err(|e| {
        let error_msg = format!("Error writing updated 'all' category cache: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    Ok(FileDeleteResponse {
        success: true,
        file: name,
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
            log_error!(
                "Failed to create directory for new category '{}': {}",
                new_category,
                e
            );
            return Err(format!(
                "Failed to create directory for new category '{}': {}",
                new_category, e
            ));
        }
    }

    if let Err(e) = fs::rename(&old_path, &new_path) {
        log_error!(
            "Failed to move file from '{}' to '{}': {}",
            old_path.display(),
            new_path.display(),
            e
        );
        return Err(format!(
            "Failed to move file from '{}' to '{}': {}",
            old_path.display(),
            new_path.display(),
            e
        ));
    }
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;

    let old_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, &old_category)
    ));
    let new_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, &new_category)
    ));

    let mut old_cache = FileCache::read_cache(&old_cache_path).map_err(|e| {
        let error_msg = format!("Error reading old cache: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    if let Some(pos) = old_cache.iter().position(|f| f.name == file_name) {
       old_cache.remove(pos);

        // Get updated metadata for the file
        let metadata = fs::metadata(&new_path).map_err(|e| {
            let error_msg = format!("Error reading file metadata: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;

        let updated_file_info = FileCache::create_file_info(
            file_name.clone(),
            new_category.clone(),
            &new_path,
            &metadata,
        )
            .map_err(|e| {
                let error_msg = format!("Error creating updated file info: {}", e);
                log_error!("{}", error_msg);
                error_msg
            })?;

        let mut new_cache = FileCache::read_cache(&new_cache_path).map_err(|e| {
            let error_msg = format!("Error reading new cache: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;

        new_cache.push(updated_file_info);
        FileCache::write_cache(&new_cache_path, &new_cache).map_err(|e| {
            let error_msg = format!("Error writing new cache: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;
    }

    FileCache::write_cache(&old_cache_path, &old_cache).map_err(|e| {
        let error_msg = format!("Error writing old cache: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    Ok(MoveFileCategoryResponse { success: true })
}

fn move_file_with_fallback(src: &str, dst: &PathBuf) -> io::Result<fs::Metadata> {
    match fs::rename(src, dst) {
        Ok(_) => fs::metadata(dst),
        Err(_) => {
            fs::copy(src, dst)?;
            fs::remove_file(src)?;
            fs::metadata(dst)
        }
    }
}