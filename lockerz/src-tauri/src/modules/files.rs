use std::fs;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Local};
use crate::modules::config::CONFIG;

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
    let root_folder_path = &CONFIG.folderPath; // Replace with actual path

    if !root_folder_path.exists() {
        return Err("Root folder path does not exist.".to_string());
    }

    let category = category.unwrap_or_else(|| "all".to_string()); // Default to "all" if no category is specified

    let categories = fs::read_dir(root_folder_path)
        .map_err(|e| format!("Error reading root folder: {}", e))?;

    let mut files = Vec::new();

    for entry in categories {
        let entry = entry.map_err(|e| format!("Error reading directory: {}", e))?;
        let category_name = entry.file_name().to_string_lossy().to_string();

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
                        last_modified,  // Use the formatted last modified date
                    };
                    category_file_infos.push(file_info);
                }
                files.extend(category_file_infos);
            }
        }
    }

    // If no limit or limit is -1, return all files without pagination
    let total_files = files.len();
    let total_pages = if let Some(lim) = limit {
        if lim == -1 {
            1 // No pagination required
        } else {
            (total_files as f32 / lim as f32).ceil() as u32
        }
    } else {
        1 // If there's no limit, treat it as 1 page
    };

    // Apply pagination if the limit is not -1
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
        files[start_index as usize..end_index as usize].to_vec()
    };

    Ok(FileResponse {
        files: paginated_files,
        current_page: page,
        total_pages,
        total_files,
    })
}
