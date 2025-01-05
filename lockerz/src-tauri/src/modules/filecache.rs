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
    pub created_at: String,
}

pub struct FileCache;

impl FileCache {
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

    pub fn create_file_info(
        file_name: String,
        category_name: String,
        file_path: &Path,
        metadata: &fs::Metadata,
    ) -> io::Result<FileInfo> {
        let modified_time = metadata.modified()?;
        let creation_time = metadata.created()?;

        let created_at = DateTime::<Local>::from(creation_time)
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        let last_modified = DateTime::<Local>::from(modified_time)
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();

        Ok(FileInfo {
            name: file_name,
            category: category_name,
            filepath: file_path.to_string_lossy().to_string(),
            size: metadata.len(),
            last_modified,
            created_at,
        })
    }
}