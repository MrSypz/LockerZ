use crate::modules::files::synchronize_cache_with_filesystem;
use crate::modules::pathutils::get_main_path;
use crate::{log_info, log_pre};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::{self};
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    pub folderPath: PathBuf,
    pub rememberCategory: bool,
    pub lang: String,
    pub imageQuality: u8,
    pub imageWidth: u32,
    pub imageHeight: u32,
}

pub static CONFIG: Lazy<RwLock<Config>> = Lazy::new(|| {
    let initial_config = Config::new().unwrap_or_else(|_| Config::default());
    RwLock::new(initial_config)
});

impl Config {
    fn get_config_path() -> io::Result<PathBuf> {
        Ok(get_main_path()?.join("config").join("config.json"))
    }

    fn ensure_config_dir(config_path: &Path) -> io::Result<()> {
        if let Some(config_dir) = config_path.parent() {
            if !config_dir.exists() {
                fs::create_dir_all(config_dir)?;
                println!("Created config directory: {:?}", config_dir);
            }
        }
        Ok(())
    }

    pub fn new() -> io::Result<Self> {
        let config_path = Self::get_config_path()?;
        Self::ensure_config_dir(&config_path)?;

        if !config_path.exists() {
            let default_config = Config::default();
            let config_json = serde_json::to_string_pretty(&default_config)?;
            fs::write(&config_path, config_json)?;
            println!("Created config file: {:?}", config_path);
        }

        Self::read_config(&config_path)
    }

    pub fn read_config(config_path: &Path) -> io::Result<Self> {
        if config_path.exists() {
            let config_content = fs::read_to_string(config_path)?;
            let config: Config = serde_json::from_str(&config_content)?;
            Ok(config)
        } else {
            Ok(Self::default())
        }
    }

    pub fn write_config(&self, config_path: &Path) -> io::Result<()> {
        let config_json = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_json)
    }

    fn ensure_uncategorized_dir(&self) -> io::Result<()> {
        let uncategorized_dir = self.folderPath.join("uncategorized");
        if !uncategorized_dir.exists() {
            log_pre!("Creating necessary folders...");
            fs::create_dir_all(&uncategorized_dir)?;
            log_pre!("uncategorized has been created successfully!");
        }
        Ok(())
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            folderPath: Path::new(
                &std::env::var("USERPROFILE").unwrap_or_else(|_| std::env::var("HOME").unwrap()),
            )
                .join("Documents")
                .join("LockerZ"),
            rememberCategory: true,
            lang: "en".to_string(),
            imageQuality: 75,
            imageWidth: 960,
            imageHeight: 540,
        }
    }
}

pub fn setup_folders() -> io::Result<()> {
    let config = get_config();
    let root_folder_path = &config.folderPath;

    if !root_folder_path.exists() {
        log_pre!("Creating root folder...");
        fs::create_dir_all(root_folder_path)?;
        log_pre!("Created root folder: {:?}", root_folder_path);
    }
    log_pre!("Initial root folder path: {:?}", root_folder_path);

    config.ensure_uncategorized_dir()?;
    synchronize_cache_with_filesystem(root_folder_path);
    Ok(())
}

pub fn refresh_config() -> io::Result<()> {
    let config_path = Config::get_config_path()?;
    let new_config = Config::read_config(&config_path)?;
    let mut global_config = CONFIG.write().unwrap();
    *global_config = new_config;
    Ok(())
}

pub fn get_config() -> Config {
    CONFIG.read().unwrap().clone()
}

#[tauri::command]
pub async fn get_settings() -> Result<Config, String> {
    let config_path = Config::get_config_path().map_err(|e| e.to_string())?;
    Config::read_config(&config_path).map_err(|e| format!("Failed to read settings: {}", e))
}

#[tauri::command]
pub async fn update_settings(new_settings: Value) -> Result<Config, String> {
    let config_path = Config::get_config_path().map_err(|e| e.to_string())?;
    log_info!("Modifying config file at: {:?}", config_path);

    let mut current_config =
        Config::read_config(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;

    // Update configuration fields
    if let Some(folder_path) = new_settings.get("folderPath").and_then(|v| v.as_str()) {
        current_config.folderPath = PathBuf::from(folder_path);
        log_info!("Updated folder path: {:?}", current_config.folderPath);
        current_config.ensure_uncategorized_dir()
            .map_err(|e| format!("Failed to create uncategorized directory: {}", e))?;
    }
    if let Some(remember_category) = new_settings.get("rememberCategory").and_then(|v| v.as_bool()) {
        current_config.rememberCategory = remember_category;
        log_info!("Updated remember category: {}", current_config.rememberCategory);
    }
    if let Some(lang) = new_settings.get("lang").and_then(|v| v.as_str()) {
        current_config.lang = lang.to_string();
        log_info!("Updated lang: {}", current_config.lang);
    }
    if let Some(image_quality) = new_settings.get("imageQuality").and_then(|v| v.as_u64()) {
        current_config.imageQuality = image_quality as u8;
        log_info!("Updated image quality: {}", current_config.imageQuality);
    }
    if let Some(image_width) = new_settings.get("imageWidth").and_then(|v| v.as_u64()) {
        current_config.imageWidth = image_width as u32;
        log_info!("Updated image width: {}", current_config.imageWidth);
    }
    if let Some(image_height) = new_settings.get("imageHeight").and_then(|v| v.as_u64()) {
        current_config.imageHeight = image_height as u32;
        log_info!("Updated image height: {}", current_config.imageHeight);
    }

    current_config
        .write_config(&config_path)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    refresh_config().map_err(|e| format!("Failed to refresh global config: {}", e))?;
    Ok(current_config)
}