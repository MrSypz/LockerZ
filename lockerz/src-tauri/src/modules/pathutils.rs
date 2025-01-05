use std::io;
use std::path::PathBuf;

/// Gets the main directory of the executable.
pub fn get_main_path() -> io::Result<PathBuf> {
    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::NotFound, "Could not determine executable directory")
    })?;
    Ok(exe_dir.to_path_buf())
}