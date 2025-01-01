use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self};
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
        let home_dir = std::env::var("APPDATA")
            .or_else(|_| std::env::var("HOME"))
            .map_err(|e| io::Error::new(io::ErrorKind::NotFound, e))?;

        let config_dir = Path::new(&home_dir).join("lockerz").join("config");
        let config_path = config_dir.join("config.json");

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
            folderPath: std::path::Path::new(&std::env::var("USERPROFILE")
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

/// Setup folders based on the global CONFIG.
pub fn setup_folders() -> io::Result<()> {
    let root_folder_path = &CONFIG.folderPath;

    println!("Initial root folder path: {:?}", root_folder_path);

    fs::create_dir_all(root_folder_path)?;

    let temp_dir = root_folder_path.join("temp");
    fs::create_dir_all(&temp_dir)?;

    println!("Directories initialized successfully.");
    Ok(())
}
