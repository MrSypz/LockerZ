# TODO: Port JavaScript Code to Rust

## Task Breakdown

### Configuration Management
1. [ ] **Create a configuration directory**
    - Port:
      ```js
      const configDir = path.join(process.env.APPDATA || process.env.HOME, 'lockerz', 'config');
      ```
    - Rust equivalent: Use `std::env` and `std::path::PathBuf`.

2. [ ] **Define the default configuration**
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

3. [ ] **Read and write the configuration**
    - Port:
      ```js
      async function readConfig()
      async function writeConfig(config)
      ```
    - Rust equivalent: Use `tokio::fs` for async file operations and `serde_json` for JSON handling.

---

### Logger Implementation
4. [ ] **Implement a Logger class**
    - Port the `Logger` class and its methods (`log`, `info`, `warn`, `error`, `debug`, `pre`, etc.) into Rust.
    - Use `std::fs` for file handling and `chrono` for timestamps.

5. [ ] **Add log rotation and cleanup**
    - Implement logic for archiving logs and deleting old logs:
      ```js
      async archiveLog()
      cleanupOldLogs()
      ```
    - Rust equivalent: Use iterators and file metadata handling.

---

### File and Directory Operations
6. [ ] **Get directory statistics**
    - Port:
      ```js
      async function getDirStats(dirPath)
      ```
    - Rust equivalent: Use `tokio::fs` and recursion to calculate total size and file count.

---

### Server Initialization
7. [ ] **Initialize server**
    - Port:
      ```js
      async function initializeServer()
      ```
    - Use an equivalent Rust web framework like `actix-web` or `warp`.
    - Serve static files and handle errors.

8. [ ] **Set up middleware and routes**
    - Ensure `/images` endpoint serves files from the specified directory.

---

## Additional Notes
- Use `tokio` for async operations in Rust.
- Leverage `serde` for configuration handling.
- Use proper error handling with `Result` and `Option` types.
- Write unit tests for each ported function/class.

---

## References
- Libraries to consider:
    - [tokio](https://tokio.rs) for async runtime.
    - [serde](https://serde.rs) for JSON handling.
    - [chrono](https://docs.rs/chrono) for date and time manipulation.
    - [actix-web](https://actix.rs) or [warp](https://warp.rs) for web server setup.
