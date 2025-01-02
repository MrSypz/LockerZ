use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self};
use serde_json::Value;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    pub folderPath: PathBuf,
    pub rememberCategory: bool,
    pub lang: String,
    pub imageQuality: u8,
    pub imageWidth: u32,
    pub imageHeight: u32,
}

impl Config {
    /// Initializes the configuration directory and file.
    pub fn new() -> io::Result<Self> {
        let home_dir = "config";  // Config directory
        let config_dir = Path::new(&home_dir);  // Path for the config folder
        let config_path = config_dir.join("config.json");  // Path for the config file

        // Create the directory if it doesn't exist
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir)?;
            println!("Created config directory: {:?}", config_dir);
        }

        // Create the config file if it doesn't exist
        if !config_path.exists() {
            let default_config = Config::default(); // Now we can use default
            let config_json = serde_json::to_string_pretty(&default_config)?;
            fs::write(&config_path, config_json)?;
            println!("Created config file: {:?}", config_path);
        }

        Self::read_config(&config_path).or_else(|_| Ok(Config::default()))
    }

    /// Reads the configuration from the config file.
    pub fn read_config(config_path: &Path) -> io::Result<Self> {
        if config_path.exists() {
            let config_content = fs::read_to_string(config_path)?;
            let config: Config = serde_json::from_str(&config_content)?;
            Ok(config)
        } else {
            Ok(Self::default())
        }
    }

    /// Writes the current config to the specified file path.
    pub fn write_config(&self, config_path: &Path) -> io::Result<()> {
        let config_json = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_json)?;
        Ok(())
    }
}

// Implement Default for Config struct
impl Default for Config {
    fn default() -> Self {
        Config {
            folderPath: Path::new(&std::env::var("USERPROFILE")
                .unwrap_or_else(|_| std::env::var("HOME").unwrap()))
                .join("Documents")
                .join("LockerZ"),
            rememberCategory: true,
            lang: "en".to_string(),
            imageQuality: 75,
            imageWidth: 1920,
            imageHeight: 1080,
        }
    }
}

pub static CONFIG: Lazy<Config> = Lazy::new(|| Config::new().expect("Failed to initialize config"));

pub fn setup_folders() -> io::Result<()> {
    let root_folder_path = &CONFIG.folderPath;

    println!("Initial root folder path: {:?}", root_folder_path);

    fs::create_dir_all(root_folder_path)?;

    let temp_dir = root_folder_path.join("temp");
    fs::create_dir_all(&temp_dir)?;

    println!("Directories initialized successfully.");
    Ok(())
}

#[tauri::command]
pub async fn get_settings() -> Result<Config, String> {
    let config_dir = Path::new("config");
    let config_path = config_dir.join("config.json");

    match Config::read_config(&config_path) {
        Ok(config) => Ok(config),
        Err(e) => Err(format!("Failed to read settings: {}", e)),
    }
}

#[tauri::command]
pub async fn update_settings(new_settings: Value) -> Result<Config, String> {
    let config_dir = Path::new("config");
    let config_path = config_dir.join("config.json");

    println!("Modifying config file at: {:?}", config_path);

    let mut current_config = Config::read_config(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    if let Some(folder_path) = new_settings.get("folderPath").and_then(|v| v.as_str()) {
        current_config.folderPath = PathBuf::from(folder_path);
    }
    if let Some(remember_category) = new_settings.get("rememberCategory").and_then(|v| v.as_bool()) {
        current_config.rememberCategory = remember_category;
    }
    if let Some(lang) = new_settings.get("lang").and_then(|v| v.as_str()) {
        current_config.lang = lang.to_string();
    }
    if let Some(image_quality) = new_settings.get("imageQuality").and_then(|v| v.as_u64()) {
        current_config.imageQuality = image_quality as u8;
    }
    if let Some(image_width) = new_settings.get("imageWidth").and_then(|v| v.as_u64()) {
        current_config.imageWidth = image_width as u32;
    }
    if let Some(image_height) = new_settings.get("imageHeight").and_then(|v| v.as_u64()) {
        current_config.imageHeight = image_height as u32;
    }

    current_config
        .write_config(&config_path)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(current_config)
}
