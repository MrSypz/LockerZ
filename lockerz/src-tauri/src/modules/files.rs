use crate::modules::config::get_config;
use bincode::{deserialize, serialize};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileInfo {
    pub name: String,
    pub category: String,
    pub filepath: String,
    pub size: u64,
    pub last_modified: String,
    pub created_at: String,  // Add created_at field
}


#[derive(Serialize, Deserialize, Debug)]
pub struct FileResponse {
    pub files: Vec<FileInfo>,
    pub current_page: u32,
    pub total_pages: u32,
    pub total_files: usize,
}

#[tauri::command]
pub async fn get_files(page: u32, limit: Option<i32>, category: Option<String>) -> Result<FileResponse, String> {
    let root_folder_path = get_config().folderPath;

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    let category = category.unwrap_or_else(|| "all".to_string());

    let cache_folder = Path::new("cache");
    let cache_file_name = format!("{}_files.bin", hash_directory_path(&root_folder_path, &category));
    let cache_file_path = cache_folder.join(cache_file_name);

    let mut cached_files = read_cache(&cache_file_path).map_err(|e| format!("Error reading cache: {}", e))?;

    if cached_files.is_empty() {
        let categories = fs::read_dir(root_folder_path.clone())
            .map_err(|e| format!("Error reading root folder: {}", e))?;

        for entry in categories {
            let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
            let category_name = entry.file_name().to_string_lossy().to_string();

            // Only load the selected category or "all"
            if category == "all" || category == category_name {
                if entry.path().is_dir() {
                    let category_path = root_folder_path.join(&category_name);
                    let category_files = fs::read_dir(category_path.clone())
                        .map_err(|e| format!("Error reading category folder: {}", e))?;

                    let mut category_file_infos = Vec::new();

                    for file_entry in category_files {
                        let file_entry = file_entry.map_err(|e| format!("Error reading file entry: {}", e))?;
                        let file_name = file_entry.file_name().to_string_lossy().to_string();
                        let file_path = category_path.join(&file_name);
                        let metadata = fs::metadata(&file_path)
                            .map_err(|e| format!("Error reading file metadata: {}", e))?;

                        let modified_time = metadata.modified()
                            .map_err(|e| format!("Error reading file modified time: {}", e))?;
                        let creation_time = metadata.created()
                            .map_err(|e| format!("Error reading file creation time: {}", e))?;

                        let created_at: String = DateTime::<Local>::from(creation_time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string();
                        let last_modified: String = DateTime::<Local>::from(modified_time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string();

                        let file_info = FileInfo {
                            name: file_name,
                            category: category_name.clone(),
                            filepath: file_path.to_string_lossy().to_string(),
                            size: metadata.len(),
                            last_modified,
                            created_at, // Include creation date
                        };
                        category_file_infos.push(file_info);
                    }
                    cached_files.extend(category_file_infos);
                }
            }
        }

        // Write the new cache data after loading it
        write_cache(&cache_file_path, &cached_files).map_err(|e| format!("Error writing cache: {}", e))?;
    }

    // Apply pagination if the limit is not -1
    let total_files = cached_files.len();
    let total_pages = if let Some(lim) = limit {
        if lim == -1 {
            1 // No pagination required
        } else {
            (total_files as f32 / lim as f32).ceil() as u32
        }
    } else {
        1 // If there's no limit, treat it as 1 page
    };

    let (start_index, end_index) = if let Some(lim) = limit {
        if lim == -1 {
            (0, total_files as u32) // Convert total_files to u32
        } else {
            let start_index = (page - 1) * lim as u32;
            let end_index = std::cmp::min(page * lim as u32, total_files.try_into().unwrap());
            (start_index, end_index)
        }
    } else {
        (0, total_files as u32) // Convert total_files to u32
    };

    let paginated_files = if start_index >= total_files.try_into().unwrap() {
        Vec::new() // Return empty vector if the start index is out of bounds
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


pub fn synchronize_cache_with_filesystem(
    root_folder_path: &Path,
) -> Result<(), String> {
    // Iterate through all categories (subdirectories) in the root folder
    let categories = fs::read_dir(root_folder_path)
        .map_err(|e| format!("Error reading root folder: {}", e))?;

    // Initialize "All" category cache
    let all_cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, "all")));
    let mut all_cache = read_cache(&all_cache_path).unwrap_or_else(|_| Vec::new());

    // Iterate over each category
    for entry in categories {
        let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
        let category_name = entry.file_name().to_string_lossy().to_string();
        let category_path = root_folder_path.join(&category_name);

        // Ensure it's a valid directory (not a file or "temp")
        if category_path.is_dir() {
            println!("Synchronizing category: {}", category_name);

            // Dynamically generate the cache path for the current category
            let new_cache_path = Path::new("cache").join(format!("{}_files.bin", hash_directory_path(&root_folder_path, &category_name)));

            // Read the existing cache for this category
            let mut cached_files = read_cache(&new_cache_path).unwrap_or_else(|_| Vec::new());

            // Print the cache before modification
            println!("Cache before modification for category '{}':", category_name);
            for file in &cached_files {
                println!("{:?}", file);
            }

            // Read files in the current category directory
            let category_files = fs::read_dir(&category_path)
                .map_err(|e| format!("Error reading category folder: {}", e))?;

            let actual_files: Vec<String> = category_files
                .filter_map(|entry| {
                    entry
                        .ok()
                        .map(|e| e.file_name().to_string_lossy().to_string())
                })
                .collect();

            // Remove files from cache if they don't exist in the actual directory
            let mut to_remove = Vec::new();
            for cached_file in &cached_files {
                if cached_file.category == category_name && !actual_files.contains(&cached_file.name) {
                    to_remove.push(cached_file.name.clone());
                }
            }

            // Remove files from category cache and "All" category cache
            for file_name in to_remove {
                remove_file_from_cache(&mut cached_files, &file_name);
                println!("Removed file from category cache: {}", file_name);

                // Also remove from "All" category cache
                remove_file_from_cache(&mut all_cache, &file_name);
                println!("Removed file from 'All' category cache: {}", file_name);
            }

            // If no actual files exist in the category, ensure the cache is empty for that category
            if actual_files.is_empty() {
                cached_files.retain(|file| file.category != category_name);
                println!("No files in category, cleared cache for category: {}", category_name);
            }

            // Add new files from the directory into the category cache and the "All" cache
            for file_entry in actual_files {
                if !cached_files.iter().any(|f| f.name == file_entry && f.category == category_name) {
                    let file_path = category_path.join(&file_entry);
                    let metadata = fs::metadata(&file_path)
                        .map_err(|e| format!("Error reading file metadata: {}", e))?;

                    let modified_time = metadata.modified()
                        .map_err(|e| format!("Error reading file modified time: {}", e))?;
                    let creation_time = metadata.created()
                        .map_err(|e| format!("Error reading file creation time: {}", e))?;

                    let created_at = DateTime::<Local>::from(creation_time)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string();
                    let last_modified = DateTime::<Local>::from(modified_time)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string();

                    let file_info = FileInfo {
                        name: file_entry.clone(),
                        category: category_name.clone(),
                        filepath: file_path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        last_modified: last_modified.clone(),
                        created_at: created_at.clone(),
                    };

                    // Add the file to the category cache
                    cached_files.push(file_info);
                    println!("Added new file to category cache: {}", file_entry);

                    // Add the file to the "All" category cache as well
                    let all_file_info = FileInfo {
                        name: file_entry.clone(),
                        category: "all".to_string(),
                        filepath: file_path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        last_modified: last_modified.clone(),
                        created_at: created_at.clone(),
                    };
                    all_cache.push(all_file_info);
                    println!("Added new file to 'All' category cache: {}", file_entry);
                }
            }

            // Print the cache after modification
            println!("Cache after modification for category '{}':", category_name);
            for file in &cached_files {
                println!("{:?}", file);
            }

            // Write the updated cache data back for this category
            write_cache(&new_cache_path, &cached_files)
                .map_err(|e| format!("Error writing cache for category {}: {}", category_name, e))?;
        }
    }

    // Write the updated "All" category cache after modifying all categories
    write_cache(&all_cache_path, &all_cache)
        .map_err(|e| format!("Error writing 'All' category cache: {}", e))?;

    Ok(())
}


pub fn hash_directory_path(path: &Path, category: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    hasher.update(category.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn write_cache(cache_path: &Path, content: &Vec<FileInfo>) -> io::Result<()> {
    let cache_dir = cache_path.parent().unwrap();
    if !cache_dir.exists() {
        fs::create_dir_all(cache_dir)?;
    }

    let serialized_data = serialize(content)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let mut file = File::create(cache_path)?;
    file.write_all(&serialized_data)?;
    Ok(())
}

pub fn read_cache(cache_path: &Path) -> io::Result<Vec<FileInfo>> {
    if cache_path.exists() {
        let mut file = File::open(cache_path)?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)?;

        let deserialized_data: Vec<FileInfo> = deserialize(&data)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        Ok(deserialized_data)
    } else {
        Ok(Vec::new())
    }
}

pub fn remove_file_from_cache(cache: &mut Vec<FileInfo>, file_name: &str) {
    if let Some(pos) = cache.iter().position(|f| f.name == file_name) {
        cache.remove(pos);
    }
}


