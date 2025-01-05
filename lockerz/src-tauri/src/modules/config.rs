use crate::modules::files::synchronize_cache_with_filesystem;
use crate::modules::pathutils::get_main_path;
use crate::{log_error, log_info, log_pre};
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
                log_pre!("Created config directory: {}", config_dir.display());
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
            log_pre!("Config file created: {}", config_path.display());
            println!("Created config file: {:?}", config_path);
        }

        Self::read_config(&config_path)
    }

    pub fn read_config(config_path: &Path) -> io::Result<Self> {
        if config_path.exists() {
            let config_content = fs::read_to_string(config_path)?;
            match serde_json::from_str(&config_content) {
                Ok(config) => Ok(config),
                Err(e) => {
                    log_error!("Failed to parse config file: {}", e);
                    Ok(Self::default())
                }
            }
        } else {
            log_error!("Config file not found at: {:?}", config_path);
            Ok(Self::default())
        }
    }

    pub fn write_config(&self, config_path: &Path) -> io::Result<()> {
        match serde_json::to_string_pretty(self) {
            Ok(config_json) => fs::write(config_path, config_json),
            Err(e) => {
                log_error!("Failed to serialize config: {}", e);
                Err(io::Error::new(io::ErrorKind::Other, e))
            }
        }
    }
    fn ensure_uncategorized_dir(&self) -> io::Result<()> {
        let uncategorized_dir = self.folderPath.join("uncategorized");
        if !uncategorized_dir.exists() {
            log_pre!("Creating necessary folders...");
            match fs::create_dir_all(&uncategorized_dir) {
                Ok(_) => {
                    log_pre!("uncategorized has been created successfully!")
                },
                Err(e) => {
                    log_error!("Failed to create uncategorized directory: {}", e);
                    return Err(e);
                }
            }
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
        match fs::create_dir_all(root_folder_path) {
            Ok(_) => {
                log_pre!("Created root folder: {:?}", root_folder_path);
            }
            Err(e) => {
                log_error!("Failed to create root folder: {}", e);
                return Err(e);
            }
        }
    }
    log_pre!("Initial root folder path: {:?}", root_folder_path);

    if let Err(e) = config.ensure_uncategorized_dir() {
        log_error!("Failed to ensure uncategorized directory: {}", e);
        return Err(e);
    }

    synchronize_cache_with_filesystem(root_folder_path).expect("Error");
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
    let config_path = match Config::get_config_path() {
        Ok(path) => path,
        Err(e) => {
            log_error!("Failed to get config path: {}", e);
            return Err(e.to_string());
        }
    };

    Config::read_config(&config_path).map_err(|e| {
        log_error!("Failed to read settings: {}", e);
        format!("Failed to read settings: {}", e)
    })
}

#[tauri::command]
pub async fn update_settings(new_settings: Value) -> Result<Config, String> {
    let config_path = match Config::get_config_path() {
        Ok(path) => path,
        Err(e) => {
            log_error!("Failed to get config path: {}", e);
            return Err(e.to_string());
        }
    };
    log_info!("Modifying config file at: {:?}", config_path);

    let mut current_config = match Config::read_config(&config_path) {
        Ok(config) => config,
        Err(e) => {
            log_error!("Failed to read config: {}", e);
            return Err(format!("Failed to read config: {}", e));
        }
    };

    // Update configuration fields
    if let Some(folder_path) = new_settings.get("folderPath").and_then(|v| v.as_str()) {
        current_config.folderPath = PathBuf::from(folder_path);
        log_info!("Updated folder path: {:?}", current_config.folderPath);
        if let Err(e) = current_config.ensure_uncategorized_dir() {
            log_error!("Failed to create uncategorized directory: {}", e);
            return Err(format!("Failed to create uncategorized directory: {}", e));
        }
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

    if let Err(e) = current_config.write_config(&config_path) {
        log_error!("Failed to write config: {}", e);
        return Err(format!("Failed to write config: {}", e));
    }

    if let Err(e) = refresh_config() {
        log_error!("Failed to refresh global config: {}", e);
        return Err(format!("Failed to refresh global config: {}", e));
    }

    Ok(current_config)
}