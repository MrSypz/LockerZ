use chrono::{Local, TimeZone, Utc};
use once_cell::sync::Lazy;
use std::fmt::Arguments;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::modules::pathutils::get_main_path;

pub struct Logger {
    log_dir: PathBuf,
    latest_log_file: PathBuf,
    session_start_time: String,
    max_log_files: usize,
}

impl Logger {
    pub fn new() -> io::Result<Self> {
        let main_path = get_main_path()?;

        let home_dir = main_path.join("log"); // Config directory
        let log_dir = Path::new(&home_dir).join("logs");
        let latest_log_file = log_dir.join("latest.log");

        // Session start time as a formatted string
        let session_start_time = Utc::now()
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
            .replace(":", "-");

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
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
        let datetime = Utc.timestamp_opt(timestamp.as_secs() as i64, 0);

        let local_time = datetime.unwrap().with_timezone(&Local);

        // Format the local time
        let formatted_timestamp = local_time.to_string();

        let log_message = format!(
            "[{}] {}: {}\n",
            log_type.to_uppercase(),
            formatted_timestamp,
            message
        );
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&self.latest_log_file)?;
        file.write_all(log_message.as_bytes())?;
        Ok(())
    }

    pub fn info(&self, args: Arguments) -> io::Result<()> {
        self.log(&format!("{}", args), "info")
    }

    pub fn warn(&self, args: Arguments) -> io::Result<()> {
        self.log(&format!("{}", args), "warn")
    }

    pub fn error(&self, args: Arguments) -> io::Result<()> {
        self.log(&format!("{}", args), "error")
    }

    pub fn debug(&self, args: Arguments) -> io::Result<()> {
        self.log(&format!("{}", args), "debug")
    }

    pub fn pre(&self, args: Arguments) -> io::Result<()> {
        self.log(&format!("{}", args), "pre")
    }

    pub fn archive_log(&self) -> io::Result<()> {
        let session_start_time = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();

        let new_file_name = format!("log_{}.log", session_start_time);
        let new_file_path = self.log_dir.join(&new_file_name);

        fs::rename(&self.latest_log_file, &new_file_path)?;

        File::create(&self.latest_log_file)?;

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
#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => {
        crate::LOGGER.info(format_args!($($arg)*)).unwrap();
    };
}
#[macro_export]
macro_rules! log_warn {
    ($($arg:tt)*) => {
        crate::LOGGER.warn(format_args!($($arg)*)).unwrap();
    };
}
#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {
        crate::LOGGER.error(format_args!($($arg)*)).unwrap();
    };
}
#[macro_export]
macro_rules! log_debug {
    ($($arg:tt)*) => {
        crate::LOGGER.debug(format_args!($($arg)*)).unwrap();
    };
}
#[macro_export]
macro_rules! log_pre {
    ($($arg:tt)*) => {
        crate::LOGGER.pre(format_args!($($arg)*)).unwrap();
    };
}
// Declare a global static instance of Logger using Lazy
pub static LOGGER: Lazy<Logger> = Lazy::new(|| Logger::new().expect("Failed to initialize logger"));
