use crate::modules::config::CONFIG;
use bincode::{deserialize, serialize};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileInfo {
    pub name: String,
    pub category: String,
    pub filepath: String,
    pub size: u64,
    pub last_modified: String,  // We'll store the formatted date as a string
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
    let root_folder_path = &CONFIG.folderPath;

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    let category = category.unwrap_or_else(|| "all".to_string());

    let cache_file_path = Path::new("cache").join(format!("{}_files.bin", category));
    let mut cached_files = read_cache(&cache_file_path).map_err(|e| format!("Error reading cache: {}", e))?;

    if cached_files.is_empty() {
        let categories = fs::read_dir(root_folder_path)
            .map_err(|e| format!("Error reading root folder: {}", e))?;

        for entry in categories {
            let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
            let category_name = entry.file_name().to_string_lossy().to_string();

            // Only load the selected category or "all"
            if category == "all" || category == category_name {
                if entry.path().is_dir() && category_name != "temp" {
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

                        let last_modified: String = DateTime::<Local>::from(modified_time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string();

                        let file_info = FileInfo {
                            name: file_name,
                            category: category_name.clone(),
                            filepath: file_path.to_string_lossy().to_string(),
                            size: metadata.len(),
                            last_modified,
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

    // Apply pagination logic
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

/// Writes the cache content to the file in binary format
fn write_cache(cache_path: &Path, content: &Vec<FileInfo>) -> io::Result<()> {
    // Ensure the cache directory exists
    let cache_dir = cache_path.parent().unwrap();
    if !cache_dir.exists() {
        fs::create_dir_all(cache_dir)?;
    }

    // Serialize the data to binary format using bincode
    let serialized_data = serialize(content)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    // Write the binary data to the cache file
    let mut file = File::create(cache_path)?;
    file.write_all(&serialized_data)?;
    Ok(())
}

/// Reads the cached content from the file in binary format
fn read_cache(cache_path: &Path) -> io::Result<Vec<FileInfo>> {
    if cache_path.exists() {
        let mut file = File::open(cache_path)?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)?;

        // Deserialize the data from binary format using bincode
        let deserialized_data: Vec<FileInfo> = deserialize(&data)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        Ok(deserialized_data)
    } else {
        Ok(Vec::new())  // Return empty vector if cache file doesn't exist
    }
}
