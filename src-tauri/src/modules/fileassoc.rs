#[cfg(windows)]
pub fn register_lkrz_association(_app: &tauri::AppHandle) {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
    use winreg::RegKey;

    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return,
    };
    // "path\to\lockerz.exe,0" — index 0 = the app's embedded icon
    let icon_str = format!("{},0", exe_path.to_string_lossy());
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let set = |path: &str, name: &str, value: &str| {
        hkcu.create_subkey_with_flags(path, KEY_SET_VALUE)
            .ok()
            .and_then(|(k, _)| k.set_value(name, &value.to_string()).ok());
    };

    set("Software\\Classes\\.lkrz", "", "LockerZ.Pack");
    set("Software\\Classes\\.lkrz", "Content Type", "application/x-lockerz-pack");
    set("Software\\Classes\\LockerZ.Pack", "", "LockerZ Pack");
    set("Software\\Classes\\LockerZ.Pack\\DefaultIcon", "", &icon_str);

    // Tell Explorer to refresh file type icons
    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(wEventId: i32, uFlags: u32, dwItem1: *const std::ffi::c_void, dwItem2: *const std::ffi::c_void);
    }
    unsafe {
        SHChangeNotify(0x08000000 /* SHCNE_ASSOCCHANGED */, 0x0000 /* SHCNF_IDLIST */, std::ptr::null(), std::ptr::null());
    }
}

#[cfg(not(windows))]
pub fn register_lkrz_association(_app: &tauri::AppHandle) {}
