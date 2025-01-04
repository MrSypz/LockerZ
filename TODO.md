# Porting JavaScript Code to Rust - Checklist

## Configuration Management
- [x] **Create a configuration directory**
   - Port:
     ```js
     const configDir = path.join(process.env.APPDATA || process.env.HOME, 'lockerz', 'config');
     ```
   - Rust equivalent: Use `std::env` and `std::path::PathBuf`.

- [x] **Define the default configuration**
   - Port the `defaultConfig` structure:
     ```js
     const defaultConfig = {
         folderPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'LockerZ'),
         rememberCategory: true,
         lang: "en",
         imageQuality: 75,
         imageWidth: 1920,
         imageHeight: 1080
     };
     ```
   - Rust equivalent: Use a struct and `serde` for serialization/deserialization.

- [x] **Read and write the configuration**
   - Port:
     ```js
     async function readConfig()
     async function writeConfig(config)
     ```
   - Rust equivalent: Use `tokio::fs` for async file operations and `serde_json` for JSON handling.

## Logger Implementation
- [x] **Implement a Logger class**
   - Port the `Logger` class and its methods (`log`, `info`, `warn`, `error`, `debug`, `pre`, etc.) into Rust.
   - Use `std::fs` for file handling and `chrono` for timestamps.

- [x] **Add log rotation and cleanup**
   - Implement logic for archiving logs and deleting old logs:
     ```js
     async archiveLog()
     cleanupOldLogs()
     ```
   - Rust equivalent: Use iterators and file metadata handling.

## File and Directory Operations
- [x] **Get directory statistics**
   - Port:
     ```js
     async function getDirStats(dirPath)
     ```
   - Rust equivalent: Use `tokio::fs` and recursion to calculate total size and file count.

## Server Routes (app.post)
- [x] **/categories**
- [x] **/update-settings**: Port to Rust to update settings and manage folder paths.
- [x] **/delete-category**: Port to Rust for deleting categories.
- [x] **/create-category**: Port to Rust for creating categories.
- [x] **/rename-category**
- [x] **/move-file**: Port to Rust for moving files between categories.
- [x] **/delete-file**: Port to Rust for deleting files.
- [x] **/move-file-category**: Port to Rust for moving files between categories.
