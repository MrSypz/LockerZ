use rayon::prelude::*;
use serde::Serialize;
use tokio::fs;
use tokio::task;
use std::path::{Path, PathBuf};
use crate::modules::config;

#[derive(Serialize)]
pub struct Category {
    pub name: String,
    pub file_count: usize,
    pub size: u64,
}

/// Recursively calculate directory size and file count with optimized parallelism.
async fn get_dir_stats_async(dir_path: &Path) -> Result<(u64, usize), Box<dyn std::error::Error + Send + Sync>> {
    let mut size: u64 = 0;
    let mut count: usize = 0;

    let mut read_dir = fs::read_dir(dir_path).await.map_err(|e| e.to_string())?;

    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        let entry_path = entry.path();

        if entry_path.is_dir() {
            let (sub_size, sub_count) = Box::pin(get_dir_stats_async(&entry_path)).await?;
            size += sub_size;
            count += sub_count;
        } else if entry_path.is_file() {
            let metadata = entry.metadata().await.map_err(|e| e.to_string())?;
            size += metadata.len();
            count += 1;
        }
    }

    Ok((size, count))
}

pub async fn fetch_categories_async(root_folder_path: PathBuf) -> Result<Vec<Category>, String> {
    let entries = match fs::read_dir(&root_folder_path).await {
        Ok(entries) => entries,
        Err(err) => return Err(format!("Failed to read directory: {}", err)),
    };

    // Collect entries into a vector for parallel processing
    let mut entry_vec = Vec::new();
    let mut read_dir = entries;

    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        if entry
            .file_type()
            .await
            .map(|file_type| file_type.is_dir() && entry.file_name() != "temp")
            .unwrap_or(false)
        {
            entry_vec.push(entry);
        }
    }

    // Use Tokio tasks for parallelism
    let categories = futures::future::join_all(
        entry_vec.into_iter().map(|entry| {
            let dir_name = entry.file_name().to_string_lossy().to_string();
            let dir_path = root_folder_path.join(&dir_name);

            task::spawn(async move {
                match get_dir_stats_async(&dir_path).await {
                    Ok((size, count)) => Some(Category {
                        name: dir_name,
                        file_count: count,
                        size,
                    }),
                    Err(err) => {
                        eprintln!("Error calculating stats for {:?}: {}", dir_path, err);
                        None
                    }
                }
            })
        })
    )
        .await
        .into_iter()
        .filter_map(|result| result.ok().flatten())
        .collect();

    Ok(categories)
}

#[tauri::command]
pub async fn get_categories() -> Result<Vec<Category>, String> {
    let root_folder_path = config::CONFIG.folderPath.clone();
    fetch_categories_async(root_folder_path).await
}

#[tauri::command]
pub async fn rename_category(old_name: &str, new_name: &str) -> Result<(), String> {
    let root_folder_path = config::CONFIG.folderPath.clone();

    let old_path = Path::new(&root_folder_path).join(&old_name);
    let new_path = Path::new(&root_folder_path).join(&new_name);

    if !old_path.exists() {
        return Err(format!("Old directory '{}' does not exist", old_name));
    }

    match fs::rename(&old_path, &new_path).await {
        Ok(_) => {
            println!("Successfully renamed {} to {}", old_name, new_name);
            Ok(())
        }
        Err(e) => {
            eprintln!("Error renaming category: {}", e);
            Err("Failed to rename category".to_string())
        }
    }
}
#[tauri::command]
pub async fn create_category(name: &str) -> Result<(), String> {
    let root_folder_path = config::CONFIG.folderPath.clone();

    let new_path = Path::new(&root_folder_path).join(name);

    if new_path.exists() {
        return Err(format!("Category '{}' already exists", name));
    }

    match tokio::fs::create_dir(&new_path).await {
        Ok(_) => {
            println!("Successfully created category {}", name);
            Ok(())
        }
        Err(e) => {
            eprintln!("Error creating category {}: {}", name, e);
            Err(format!("Failed to create category {}: {}", name, e))
        }
    }
}
#[tauri::command]
pub async fn delete_category(name: &str) -> Result<(), String> {
    let root_folder_path = config::CONFIG.folderPath.clone();
    let new_path = Path::new(&root_folder_path).join(name);

    if !new_path.exists() {
        return Err(format!("Category '{}' does not exist", name));
    }
    match tokio::fs::remove_dir(&new_path).await {
        Ok(_) => {
            println!("Successfully deleted category {}", name);
            Ok(())
        }
        Err(e) => {
            eprintln!("Error deleting category {}: {}", name, e);
            Err(format!("Failed to delete category {}: {}", name, e))
        }
    }
}