use crate::modules::config::get_config;
use crate::modules::filecache::{FileCache, FileInfo};
use crate::modules::pathutils::get_main_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
    let root_folder_path = get_config().folderPath;

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    let category = category.unwrap_or_else(|| "all".to_string());
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;

    let cache_folder = main_path.join("cache");
    let cache_file_name = format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, &category)
    );
    let cache_file_path = cache_folder.join(cache_file_name);

    let mut cached_files = FileCache::read_cache(&cache_file_path)
        .map_err(|e| format!("Error reading cache: {}", e))?;

    if cached_files.is_empty() {
        let categories = fs::read_dir(root_folder_path.clone())
            .map_err(|e| format!("Error reading root folder: {}", e))?;

        for entry in categories {
            let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
            let category_name = entry.file_name().to_string_lossy().to_string();

            if category == "all" || category == category_name {
                if entry.path().is_dir() {
                    let category_path = root_folder_path.join(&category_name);
                    let category_files = fs::read_dir(category_path.clone())
                        .map_err(|e| format!("Error reading category folder: {}", e))?;

                    for file_entry in category_files {
                        let file_entry =
                            file_entry.map_err(|e| format!("Error reading file entry: {}", e))?;
                        let file_name = file_entry.file_name().to_string_lossy().to_string();
                        let file_path = category_path.join(&file_name);
                        let metadata = fs::metadata(&file_path)
                            .map_err(|e| format!("Error reading file metadata: {}", e))?;

                        let file_info = FileCache::create_file_info(
                            file_name,
                            category_name.clone(),
                            &file_path,
                            &metadata,
                        )
                        .map_err(|e| format!("Error creating file info: {}", e))?;

                        cached_files.push(file_info);
                    }
                }
            }
        }

        FileCache::write_cache(&cache_file_path, &cached_files)
            .map_err(|e| format!("Error writing cache: {}", e))?;
    }

    // Pagination logic remains the same
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

    let (start_index, end_index) = if let Some(lim) = limit {
        if lim == -1 {
            (0, total_files as u32)
        } else {
            let start_index = (page - 1) * lim as u32;
            let end_index = std::cmp::min(page * lim as u32, total_files.try_into().unwrap());
            (start_index, end_index)
        }
    } else {
        (0, total_files as u32)
    };

    let paginated_files = if start_index >= total_files.try_into().unwrap() {
        Vec::new()
    } else {
        cached_files[start_index as usize..end_index as usize].to_vec()
    };

    Ok(FileResponse {
        files: paginated_files,
        current_page: page,
        total_pages,
        total_files,
    })
}

pub fn synchronize_cache_with_filesystem(root_folder_path: &Path) -> Result<(), String> {
    let categories =
        fs::read_dir(root_folder_path).map_err(|e| format!("Error reading root folder: {}", e))?;
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;

    let all_cache_path = main_path.join("cache").join(format!(
        "{}_files.bin",
        FileCache::hash_directory_path(&root_folder_path, "all")
    ));
    let mut all_cache = FileCache::read_cache(&all_cache_path).unwrap_or_default();

    for entry in categories {
        let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
        let category_name = entry.file_name().to_string_lossy().to_string();
        let category_path = root_folder_path.join(&category_name);

        if category_path.is_dir() {
            println!("Synchronizing category: {}", category_name);

            let new_cache_path = main_path.join("cache").join(format!(
                "{}_files.bin",
                FileCache::hash_directory_path(&root_folder_path, &category_name)
            ));
            let mut cached_files = FileCache::read_cache(&new_cache_path).unwrap_or_default();

            let category_files = fs::read_dir(&category_path)
                .map_err(|e| format!("Error reading category folder: {}", e))?;

            let actual_files: Vec<String> = category_files
                .filter_map(|entry| {
                    entry
                        .ok()
                        .map(|e| e.file_name().to_string_lossy().to_string())
                })
                .collect();

            // Remove non-existent files from caches
            let files_to_remove: Vec<String> = cached_files
                .iter()
                .filter(|f| f.category == category_name && !actual_files.contains(&f.name))
                .map(|f| f.name.clone())
                .collect();

            for file_name in files_to_remove {
                FileCache::remove_file_from_cache(&mut cached_files, &file_name);
                FileCache::remove_file_from_cache(&mut all_cache, &file_name);
            }

            // Add new files
            for file_entry in actual_files {
                if !cached_files
                    .iter()
                    .any(|f| f.name == file_entry && f.category == category_name)
                {
                    let file_path = category_path.join(&file_entry);
                    let metadata = fs::metadata(&file_path)
                        .map_err(|e| format!("Error reading file metadata: {}", e))?;

                    let file_info = FileCache::create_file_info(
                        file_entry.clone(),
                        category_name.clone(),
                        &file_path,
                        &metadata,
                    )
                    .map_err(|e| format!("Error creating file info: {}", e))?;

                    cached_files.push(file_info);

                    // Only add to 'all_cache' if not already present
                    if !all_cache
                        .iter()
                        .any(|f| f.name == file_entry && f.category == category_name)
                    {
                        let all_file_info = FileCache::create_file_info(
                            file_entry,
                            category_name.clone(), // Keep the original category
                            &file_path,
                            &metadata,
                        )
                        .map_err(|e| format!("Error creating all category file info: {}", e))?;

                        all_cache.push(all_file_info);
                    }
                }
            }

            FileCache::write_cache(&new_cache_path, &cached_files).map_err(|e| {
                format!("Error writing cache for category {}: {}", category_name, e)
            })?;
        }
    }

    FileCache::write_cache(&all_cache_path, &all_cache)
        .map_err(|e| format!("Error writing 'All' category cache: {}", e))?;

    Ok(())
}
