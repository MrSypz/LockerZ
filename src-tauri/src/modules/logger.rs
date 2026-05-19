use crate::modules::pathutils::get_main_path;
use chrono::{Local, TimeZone, Utc};
use once_cell::sync::Lazy;
use std::fmt::Arguments;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Logger {
    log_dir: PathBuf,
    latest_log_file: PathBuf,
    max_log_files: usize,
}

impl Logger {
    pub fn new() -> io::Result<Self> {
        let main_path = get_main_path()?;
        let log_dir = Path::new(&main_path.join("log")).join("logs");
        let latest_log_file = log_dir.join("latest.log");

        if !log_dir.exists() {
            fs::create_dir_all(&log_dir)?;
        }

        File::create(&latest_log_file)?;

        Ok(Logger { log_dir, latest_log_file, max_log_files: 69 })
    }

    fn log(&self, message: &str, log_type: &str) -> io::Result<()> {
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
        let local_time = Utc.timestamp_opt(timestamp.as_secs() as i64, 0)
            .unwrap()
            .with_timezone(&Local);

        let log_message = format!(
            "[{}] {}: {}\n",
            log_type.to_uppercase(),
            local_time,
            message
        );

        let mut file = fs::OpenOptions::new().append(true).open(&self.latest_log_file)?;
        file.write_all(log_message.as_bytes())
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
        let new_file_name = format!("log_{}.log", Local::now().format("%Y-%m-%d_%H-%M-%S"));
        let new_file_path = self.log_dir.join(&new_file_name);

        fs::rename(&self.latest_log_file, &new_file_path)?;
        File::create(&self.latest_log_file)?;
        self.cleanup_old_logs()
    }

    fn cleanup_old_logs(&self) -> io::Result<()> {
        let mut files: Vec<(String, SystemTime)> = fs::read_dir(&self.log_dir)?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let file_name = entry.file_name().into_string().ok()?;
                if file_name.starts_with("log_") && file_name.ends_with(".log") {
                    Some((file_name, entry.metadata().ok()?.modified().ok()?))
                } else {
                    None
                }
            })
            .collect();

        files.sort_by(|a, b| b.1.cmp(&a.1));

        for file in files.into_iter().skip(self.max_log_files) {
            fs::remove_file(self.log_dir.join(&file.0))?;
        }

        Ok(())
    }
}

#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => {{ crate::LOGGER.info(format_args!($($arg)*)).unwrap() }};
}
#[macro_export]
macro_rules! log_warn {
    ($($arg:tt)*) => {{ crate::LOGGER.warn(format_args!($($arg)*)).unwrap() }};
}
#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {{ crate::LOGGER.error(format_args!($($arg)*)).unwrap() }};
}
#[macro_export]
macro_rules! log_debug {
    ($($arg:tt)*) => {{ crate::LOGGER.debug(format_args!($($arg)*)).unwrap() }};
}
#[macro_export]
macro_rules! log_pre {
    ($($arg:tt)*) => {{ crate::LOGGER.pre(format_args!($($arg)*)).unwrap() }};
}

pub static LOGGER: Lazy<Logger> = Lazy::new(|| Logger::new().expect("Failed to initialize logger"));
