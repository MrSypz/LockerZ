use chrono::{Utc, TimeZone};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use once_cell::sync::Lazy;

pub struct Logger {
    log_dir: PathBuf,
    latest_log_file: PathBuf,
    session_start_time: String,
    max_log_files: usize,
}

impl Logger {
    pub fn new() -> io::Result<Self> {
        let home_dir = std::env::var("APPDATA")
            .or_else(|_| std::env::var("HOME"))
            .map_err(|e| io::Error::new(io::ErrorKind::NotFound, e))?;

        let log_dir = Path::new(&home_dir).join("lockerz").join("logs");
        let latest_log_file = log_dir.join("latest.log");
        
        // Session start time as a formatted string
        let session_start_time = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true).replace(":", "-");
        
        let max_log_files = 69;
        
        // Ensure the log directory exists
        if !log_dir.exists() {
            fs::create_dir_all(&log_dir)?;
        }

        // Create or overwrite the latest.log file
        File::create(&latest_log_file)?;

        let logger = Logger {
            log_dir,
            latest_log_file,
            session_start_time,
            max_log_files,
        };

        // Log the start of the session
        // logger.log("Logging session started", "info")?;

        Ok(logger)
    }

    fn log(&self, message: &str, log_type: &str) -> io::Result<()> {
        // Get the current timestamp from SystemTime and convert to DateTime<Utc>
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap();
        let datetime = Utc.timestamp(timestamp.as_secs() as i64, 0);

        // Format the timestamp using chrono
        let formatted_timestamp = datetime.to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        
        let log_message = format!("[{}] {}: {}\n", log_type.to_uppercase(), formatted_timestamp, message);
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&self.latest_log_file)?;
        file.write_all(log_message.as_bytes())?;
        Ok(())
    }

    pub fn info(&self, message: &str) -> io::Result<()> {
        self.log(message, "info")
    }

    pub fn warn(&self, message: &str) -> io::Result<()> {
        self.log(message, "warn")
    }

    pub fn error(&self, message: &str) -> io::Result<()> {
        self.log(message, "error")
    }

    pub fn debug(&self, message: &str) -> io::Result<()> {
        self.log(message, "debug")
    }

    pub fn pre(&self, message: &str) -> io::Result<()> {
        self.log(message, "pre")
    }

    pub fn archive_log(&self) -> io::Result<()> {
        let new_file_name = format!("log_{}.log", self.session_start_time);
        let new_file_path = self.log_dir.join(&new_file_name);

        // Rename latest.log to log_{session_start_time}.log
        fs::rename(&self.latest_log_file, &new_file_path)?;
        // self.log("Log renamed", "info")?;

        // Create a new latest.log file
        File::create(&self.latest_log_file)?;

        // Clean up old logs
        self.cleanup_old_logs()?;

        Ok(())
    }

    fn cleanup_old_logs(&self) -> io::Result<()> {
        let mut files: Vec<(String, SystemTime)> = fs::read_dir(&self.log_dir)?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let file_name = entry.file_name().into_string().ok()?;
                if file_name.starts_with("log_") && file_name.ends_with(".log") {
                    let metadata = entry.metadata().ok()?;
                    Some((file_name, metadata.modified().ok()?))
                } else {
                    None
                }
            })
            .collect();

        files.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by modification time, descending

        if files.len() > self.max_log_files {
            for file in files.split_off(self.max_log_files) {
                let file_path = self.log_dir.join(&file.0); // Borrow file.0 instead of moving it
                fs::remove_file(&file_path)?; // Borrow the file_path if necessary
                println!("Deleted old log: {}", file.0); // Borrow file.0 here
            }
        }

        Ok(())
    }
}

// Declare a global static instance of Logger using Lazy
pub static LOGGER: Lazy<Logger> = Lazy::new(|| {
    Logger::new().expect("Failed to initialize logger")
});
