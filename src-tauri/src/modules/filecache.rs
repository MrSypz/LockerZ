use bincode::{deserialize, serialize};
use chrono::{DateTime, Local};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use crate::modules::db::TagInfo;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileInfo {
    pub name: String,
    pub category: String,
    pub filepath: String,
    pub size: u64,
    pub last_modified: String,
    pub created_at: String,
    pub root_path: String,
    pub tags: Option<Vec<TagInfo>>,
}

#[derive(Debug, Clone)]
struct CacheEntry {
    files: Vec<FileInfo>,
    last_modified: DateTime<Local>,
}

pub struct FileCache {
    cache_dir: PathBuf,
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
}

lazy_static! {
    static ref GLOBAL_CACHE: Arc<Mutex<Option<Arc<FileCache>>>> = Arc::new(Mutex::new(None));
}

impl FileCache {
    pub fn initialize(cache_dir: PathBuf) -> io::Result<Arc<FileCache>> {
        let mut global = GLOBAL_CACHE.lock().unwrap();

        if let Some(cache) = global.as_ref() {
            return Ok(cache.clone());
        }

        // Create cache directory if it doesn't exist
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)?;
        }

        let cache = Arc::new(FileCache {
            cache_dir,
            cache: Arc::new(Mutex::new(HashMap::new())),
        });

        *global = Some(cache.clone());
        Ok(cache)
    }

    pub fn get_instance() -> Option<Arc<FileCache>> {
        GLOBAL_CACHE.lock().unwrap().clone()
    }

    fn generate_cache_key(&self, root_path: &Path, category: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(root_path.to_string_lossy().as_bytes());
        hasher.update(category.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn get_cache_path(&self, root_path: &Path, category: &str) -> PathBuf {
        let cache_key = self.generate_cache_key(root_path, category);
        self.cache_dir.join(format!("{}_files.bin", cache_key))
    }

    pub async fn refresh_category(&self, root_path: &Path, category: &str) -> io::Result<Vec<FileInfo>> {
        let mut files = Vec::new();
        let category_path = if category == "all" {
            root_path.to_path_buf()
        } else {
            root_path.join(category)
        };

        if category_path.is_dir() {
            for entry in fs::read_dir(category_path)? {
                let entry = entry?;
                let metadata = entry.metadata()?;

                if metadata.is_file() {
                    let file_info = self.create_file_info(
                        entry.file_name().to_string_lossy().to_string(),
                        category.to_string(),
                        &entry.path(),
                        &metadata,
                        root_path,
                    )?;
                    files.push(file_info);
                }
            }
        }

        // Update both memory and disk cache
        let cache_key = self.generate_cache_key(root_path, category);
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(cache_key.clone(), CacheEntry {
                files: files.clone(),
                last_modified: Local::now(),
            });
        }

        self.write_cache(root_path, category, &files)?;

        Ok(files)
    }

    pub fn get_files(&self, root_path: &Path, category: &str) -> io::Result<Vec<FileInfo>> {
        let cache_key = self.generate_cache_key(root_path, category);

        // Try memory cache first
        {
            let cache = self.cache.lock().unwrap();
            if let Some(entry) = cache.get(&cache_key) {
                if category == "all" {
                    // For "all" category, collect files from all categories
                    return Ok(entry.files.clone());
                }
                return Ok(entry.files.clone());
            }
        }

        // If not in memory, rebuild the cache for the category
        if category == "all" {
            let mut all_files = Vec::new();

            // Read all subdirectories
            for entry in fs::read_dir(root_path)? {
                let entry = entry?;
                if entry.path().is_dir() {
                    let category_name = entry.file_name().to_string_lossy().to_string();
                    let category_path = root_path.join(&category_name);

                    // Process files in each category
                    for file_entry in fs::read_dir(&category_path)? {
                        let file_entry = file_entry?;
                        if file_entry.path().is_file() {
                            let metadata = file_entry.metadata()?;
                            let file_info = self.create_file_info(
                                file_entry.file_name().to_string_lossy().to_string(),
                                category_name.clone(), // Keep original category name
                                &file_entry.path(),
                                &metadata,
                                root_path,
                            )?;
                            all_files.push(file_info);
                        }
                    }
                }
            }

            // Update memory cache
            {
                let mut cache = self.cache.lock().unwrap();
                cache.insert(cache_key.clone(), CacheEntry {
                    files: all_files.clone(),
                    last_modified: Local::now(),
                });
            }

            // Update disk cache
            self.write_cache(root_path, category, &all_files)?;

            Ok(all_files)
        } else {
            // For specific category
            let category_path = root_path.join(category);
            let mut category_files = Vec::new();

            if category_path.is_dir() {
                for entry in fs::read_dir(&category_path)? {
                    let entry = entry?;
                    if entry.path().is_file() {
                        let metadata = entry.metadata()?;
                        let file_info = self.create_file_info(
                            entry.file_name().to_string_lossy().to_string(),
                            category.to_string(),
                            &entry.path(),
                            &metadata,
                            root_path,
                        )?;
                        category_files.push(file_info);
                    }
                }
            }

            // Update memory cache
            {
                let mut cache = self.cache.lock().unwrap();
                cache.insert(cache_key.clone(), CacheEntry {
                    files: category_files.clone(),
                    last_modified: Local::now(),
                });
            }

            // Update disk cache
            self.write_cache(root_path, category, &category_files)?;

            return Ok(category_files);
        }
    }
    pub(crate) fn create_file_info(
        &self,
        file_name: String,
        category: String,
        file_path: &Path,
        metadata: &fs::Metadata,
        root_path: &Path,
    ) -> io::Result<FileInfo> {
        let modified_time = metadata.modified()?;
        let creation_time = metadata.created()?;

        Ok(FileInfo {
            name: file_name,
            category,
            filepath: file_path.to_string_lossy().to_string(),
            size: metadata.len(),
            last_modified: DateTime::<Local>::from(modified_time)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string(),
            created_at: DateTime::<Local>::from(creation_time)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string(),
            root_path: root_path.to_string_lossy().to_string(),
            tags: None,  // Initialize with None
        })
    }

    fn write_cache(&self, root_path: &Path, category: &str, content: &[FileInfo]) -> io::Result<()> {
        let cache_path = self.get_cache_path(root_path, category);

        if let Some(cache_dir) = cache_path.parent() {
            if !cache_dir.exists() {
                fs::create_dir_all(cache_dir)?;
            }
        }

        let serialized = serialize(content)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let mut file = File::create(cache_path)?;
        file.write_all(&serialized)?;

        Ok(())
    }

    fn read_cache(&self, cache_path: &Path) -> io::Result<Vec<FileInfo>> {
        if !cache_path.exists() {
            return Ok(Vec::new());
        }

        let mut file = File::open(cache_path)?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)?;

        deserialize(&data)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))
    }

    pub fn remove_file(&self, root_path: &Path, category: &str, file_name: &str) -> io::Result<()> {
        let cache_key = self.generate_cache_key(root_path, category);

        // Update memory cache
        {
            let mut cache = self.cache.lock().unwrap();
            if let Some(entry) = cache.get_mut(&cache_key) {
                entry.files.retain(|f| f.name != file_name);

                // Update disk cache
                self.write_cache(root_path, category, &entry.files)?;
            }
        }

        // If this was in the "all" category, we need to update that cache too
        if category != "all" {
            self.remove_file(root_path, "all", file_name)?;
        }

        Ok(())
    }

    pub async fn move_file(
        &self,
        root_path: &Path,
        old_category: &str,
        new_category: &str,
        file_name: &str,
    ) -> io::Result<()> {
        // Remove from old category
        self.remove_file(root_path, old_category, file_name)?;

        // Refresh new category to include the moved file
        self.refresh_category(root_path, new_category).await?;

        // Update the 'all' category cache
        let mut all_files = Vec::new();

        // Read all subdirectories to rebuild 'all' cache
        for entry in fs::read_dir(root_path)? {
            let entry = entry?;
            if entry.path().is_dir() {
                let category_name = entry.file_name().to_string_lossy().to_string();
                let category_path = root_path.join(&category_name);

                for file_entry in fs::read_dir(&category_path)? {
                    let file_entry = file_entry?;
                    if file_entry.path().is_file() {
                        let metadata = file_entry.metadata()?;
                        let file_info = self.create_file_info(
                            file_entry.file_name().to_string_lossy().to_string(),
                            category_name.clone(),
                            &file_entry.path(),
                            &metadata,
                            root_path,
                        )?;
                        all_files.push(file_info);
                    }
                }
            }
        }

        // Update 'all' category in memory cache
        let all_cache_key = self.generate_cache_key(root_path, "all");
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(all_cache_key, CacheEntry {
                files: all_files.clone(),
                last_modified: Local::now(),
            });
        }

        // Write updated 'all' category to disk
        self.write_cache(root_path, "all", &all_files)?;

        Ok(())
    }
    pub async fn update_all_category(&self, root_path: &Path) -> io::Result<()> {
        let mut all_files = Vec::new();

        for entry in fs::read_dir(root_path)? {
            let entry = entry?;
            if entry.path().is_dir() {
                let category_name = entry.file_name().to_string_lossy().to_string();
                let category_path = root_path.join(&category_name);

                for file_entry in fs::read_dir(&category_path)? {
                    let file_entry = file_entry?;
                    if file_entry.path().is_file() {
                        let metadata = file_entry.metadata()?;
                        let file_info = self.create_file_info(
                            file_entry.file_name().to_string_lossy().to_string(),
                            category_name.clone(),
                            &file_entry.path(),
                            &metadata,
                            root_path,
                        )?;
                        all_files.push(file_info);
                    }
                }
            }
        }

        // Update memory cache for 'all' category
        let cache_key = self.generate_cache_key(root_path, "all");
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(cache_key, CacheEntry {
                files: all_files.clone(),
                last_modified: Local::now(),
            });
        }

        // Update disk cache
        self.write_cache(root_path, "all", &all_files)?;

        Ok(())
    }

    pub async fn synchronize_cache(&self, root_path: &Path) -> io::Result<()> {
        println!("Starting cache synchronization...");

        // First synchronize all individual categories
        let categories = fs::read_dir(root_path)?;
        let mut all_files = Vec::new();

        for entry in categories {
            let entry = entry?;
            if entry.path().is_dir() {
                let category_name = entry.file_name().to_string_lossy().to_string();
                println!("Synchronizing category: {}", category_name);

                let mut category_files = Vec::new();
                let category_path = root_path.join(&category_name);

                for file_entry in fs::read_dir(&category_path)? {
                    let file_entry = file_entry?;
                    if file_entry.path().is_file() {
                        let metadata = file_entry.metadata()?;
                        let file_info = self.create_file_info(
                            file_entry.file_name().to_string_lossy().to_string(),
                            category_name.clone(),
                            &file_entry.path(),
                            &metadata,
                            root_path,
                        )?;

                        category_files.push(file_info.clone());
                        all_files.push(file_info);
                    }
                }

                // Update category cache
                let cache_key = self.generate_cache_key(root_path, &category_name);
                {
                    let mut cache = self.cache.lock().unwrap();
                    cache.insert(cache_key, CacheEntry {
                        files: category_files.clone(),
                        last_modified: Local::now(),
                    });
                }
                self.write_cache(root_path, &category_name, &category_files)?;
            }
        }

        // Update "all" category cache
        let all_cache_key = self.generate_cache_key(root_path, "all");
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(all_cache_key, CacheEntry {
                files: all_files.clone(),
                last_modified: Local::now(),
            });
        }
        self.write_cache(root_path, "all", &all_files)?;

        println!("Cache synchronization completed");
        Ok(())
    }
}

// Helper function to get or initialize cache
pub fn get_or_init_cache(cache_dir: PathBuf) -> io::Result<Arc<FileCache>> {
    if let Some(cache) = FileCache::get_instance() {
        Ok(cache)
    } else {
        FileCache::initialize(cache_dir)
    }
}