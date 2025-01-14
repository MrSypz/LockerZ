use super::filecache::{get_or_init_cache, FileInfo};
use crate::modules::config::get_config;
use crate::modules::pathutils::get_main_path;
use crate::{log_error, log_info};
use serde::{Deserialize, Serialize};
use std::fs::{self};
use std::io;
use std::path::{Path, PathBuf};
use crate::modules::db;

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
    pub success: bool,
}

// new! Initialize cache at startup
pub fn initialize_cache() -> io::Result<()> {
    let main_path = get_main_path()?;
    let cache_dir = main_path.join("cache");
    let cache = get_or_init_cache(cache_dir)?;

    let root_folder_path = get_config().folderPath;

    if !root_folder_path.exists() {
        fs::create_dir_all(&root_folder_path)?;
    }

    std::thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            if let Err(e) = cache.synchronize_cache(&root_folder_path).await {
                log_error!("Failed to synchronize cache: {}", e);
            }
        });
    });

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileResponse {
    pub files: Vec<FileInfo>,
    pub current_page: u32,
    pub total_pages: u32,
    pub total_files: usize,
}

#[tauri::command]
pub async fn get_files(
    page: u32,
    limit: Option<i32>,
    category: Option<String>,
) -> Result<FileResponse, String> {
    use crate::modules::db;

    let root_folder_path = get_config().folderPath;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let cache = get_or_init_cache(main_path.join("cache"))
        .map_err(|e| format!("Failed to get cache: {}", e))?;

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    let category = category.unwrap_or_else(|| "all".to_string());
    // Try to get files from cache first
    let mut cached_files = cache.get_files(&root_folder_path, &category)
        .map_err(|e| format!("Error getting files: {}", e))?;

    // If cache is empty, rebuild it
    if cached_files.is_empty() {
        cached_files = cache.refresh_category(&root_folder_path, &category)
            .await
            .map_err(|e| format!("Error refreshing cache: {}", e))?;
    }

    // Batch process image IDs and tags
    let file_paths: Vec<(PathBuf, String)> = cached_files
        .iter()
        .map(|file| (PathBuf::from(&file.filepath), file.category.clone()))
        .collect();

    // Get all image IDs in a single query
    let image_ids = db::get_batch_image_ids(&file_paths)
        .map_err(|e| format!("Error getting image IDs: {}", e))?;

    // Get all tags in a single query
    let tags_map = db::get_batch_image_tags(&image_ids)
        .map_err(|e| format!("Error getting tags: {}", e))?;

    // Associate tags with files
    for file in &mut cached_files {
        if let Some(image_id) = image_ids.get(&PathBuf::from(&file.filepath)) {
            file.tags = Some(tags_map.get(image_id).cloned().unwrap_or_default());
        } else {
            file.tags = None;
        }
    }

    let total_files = cached_files.len();
    let total_pages = if let Some(lim) = limit {
        if lim == -1 {
            1
        } else {
            (total_files as f32 / lim as f32).ceil() as u32
        }
    } else {
        1
    };

    // Apply pagination if requested
    let files = if let Some(lim) = limit {
        if lim == -1 {
            cached_files // Return all files when limit is -1
        } else {
            let start_index = ((page - 1) * lim as u32) as usize;
            let end_index = std::cmp::min((page * lim as u32) as usize, total_files);

            if start_index < total_files {
                cached_files[start_index..end_index].to_vec()
            } else {
                Vec::new()
            }
        }
    } else {
        cached_files
    };

    Ok(FileResponse {
        files,
        current_page: page,
        total_pages,
        total_files,
    })
}

#[tauri::command]
pub async fn move_file(
    original_path: String,
    category: Option<String>,
) -> Result<FileMoveResponse, String> {
    let root_folder_path = get_config().folderPath;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let cache = get_or_init_cache(main_path.join("cache"))
        .map_err(|e| format!("Failed to get cache: {}", e))?;

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

    log_info!(
        "File {} has been moved to category: {}",
        file_name,
        category
    );

    // Create file info and update cache
    let file_info = cache.create_file_info(
        file_name.clone(),
        category.clone(),
        &target_path,
        &stats,
        &root_folder_path,
    ).map_err(|e| format!("Error creating file info: {}", e))?;

    // Refresh category cache to include new file
    cache.refresh_category(&root_folder_path, &category)
        .await
        .map_err(|e| format!("Error refreshing category cache: {}", e))?;

    Ok(FileMoveResponse {
        success: true,
        file: file_info,
    })
}

#[tauri::command]
pub async fn delete_file(category: String, name: String) -> Result<FileDeleteResponse, String> {
    let root_folder_path = get_config().folderPath;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let cache = get_or_init_cache(main_path.join("cache"))
        .map_err(|e| format!("Failed to get cache: {}", e))?;

    let file_path = root_folder_path.join(&category).join(&name);

    // Delete from database before moving to trash
    db::delete_image_from_db(file_path.clone(), category.clone())
        .map_err(|e| format!("Failed to delete from database: {}", e))?;

    // Move to recycle bin instead of permanent deletion
    trash::delete(&file_path).map_err(|e| {
        let error_msg = format!("Error deleting file: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    log_info!("File {} has been deleted from category: {}", name, category);

    // Remove from cache
    cache.remove_file(&root_folder_path, &category, &name)
        .map_err(|e| format!("Error updating cache: {}", e))?;

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
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let cache = get_or_init_cache(main_path.join("cache"))
        .map_err(|e| format!("Failed to get cache: {}", e))?;

    let old_path = root_folder_path.join(&old_category).join(&file_name);
    let new_path = root_folder_path.join(&new_category).join(&file_name);

    if !old_path.exists() {
        let error_msg = format!("File {} does not exist", file_name);
        log_error!("{}", error_msg);
        return Err(error_msg);
    }

    // Ensure new category directory exists
    let new_category_dir = root_folder_path.join(&new_category);
    if !new_category_dir.exists() {
        fs::create_dir_all(&new_category_dir).map_err(|e| {
            let error_msg = format!("Failed to create directory: {}", e);
            log_error!("{}", error_msg);
            error_msg
        })?;
    }

    // Move the file
    fs::rename(&old_path, &new_path).map_err(|e| {
        let error_msg = format!("Failed to move file: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    // Update database
    db::update_image_category(old_path, new_path, new_category.clone())
        .map_err(|e| format!("Failed to update database: {}", e))?;

    // Update cache
    cache.move_file(&root_folder_path, &old_category, &new_category, &file_name).await
        .map_err(|e| format!("Error updating cache: {}", e))?;

    Ok(MoveFileCategoryResponse { success: true })
}

// Helper function to move files with fallback to copy+delete
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

#[tauri::command]
pub async fn save_and_move_file(
    file_name: String,
    file_content: Vec<u8>,
    category: String,
) -> Result<FileMoveResponse, String> {
    let root_folder_path = get_config().folderPath;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let cache = get_or_init_cache(main_path.join("cache"))
        .map_err(|e| format!("Failed to get cache: {}", e))?;

    let category_path = root_folder_path.join(&category);

    // Create category directory if it doesn't exist
    fs::create_dir_all(&category_path).map_err(|e| {
        let error_msg = format!("Error creating directory: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    let target_path = category_path.join(&file_name);

    // Write the file
    fs::write(&target_path, file_content).map_err(|e| {
        let error_msg = format!("Error writing file: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    let stats = fs::metadata(&target_path).map_err(|e| {
        let error_msg = format!("Error getting file metadata: {}", e);
        log_error!("{}", error_msg);
        error_msg
    })?;

    // Create file info and update cache
    let file_info = cache.create_file_info(
        file_name.clone(),
        category.clone(),
        &target_path,
        &stats,
        &root_folder_path,
    ).map_err(|e| format!("Error creating file info: {}", e))?;

    // Refresh category cache
    cache.refresh_category(&root_folder_path, &category)
        .await
        .map_err(|e| format!("Error refreshing category cache: {}", e))?;

    Ok(FileMoveResponse {
        success: true,
        file: file_info,
    })
}