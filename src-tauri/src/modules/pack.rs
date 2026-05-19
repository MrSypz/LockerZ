use crate::modules::config::get_config;
use tauri::Emitter;
use crate::modules::db::connect_db;
use crate::log_info;
use chrono::Utc;
use dashmap::DashMap;
use once_cell::sync::Lazy;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

// ---------- cancellation registry ----------

static EXPORT_CANCELS: Lazy<DashMap<String, Arc<AtomicBool>>> = Lazy::new(DashMap::new);

// ---------- event payloads ----------

#[derive(Serialize, Clone)]
struct ExportProgressEvent {
    export_id: String,
    current: usize,
    total: usize,
    filename: String,
}

#[derive(Serialize, Clone)]
struct ExportDoneEvent {
    export_id: String,
}

#[derive(Serialize, Clone)]
struct ImportProgressEvent {
    import_id: String,
    current: usize,
    total: usize,
    filename: String,
}

#[derive(Serialize, Clone)]
struct ImportDoneEvent {
    import_id: String,
}

// ---------- public types ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackManifest {
    pub pack_id: String,
    pub owner: String,
    pub created_at: String,
    pub category_name: String,
    pub image_count: usize,
    pub version: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub category_name: String,
    pub image_count: usize,
    pub owner: String,
    pub original_name: String,
    pub was_renamed: bool,
}

// ---------- helpers ----------

fn generate_pack_id(owner: &str, category: &str, ts: i64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}{}", owner, category, ts).as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}

fn fetch_image_tags(category: &str, filename: &str) -> Vec<String> {
    let conn = match connect_db() {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    conn.prepare(
        "SELECT t.name FROM tags t
         JOIN image_tags it ON t.id = it.tag_id
         JOIN images i ON i.id = it.image_id
         WHERE i.category = ?1 AND i.filename = ?2 AND t.is_category = 0",
    )
    .and_then(|mut s| {
        s.query_map(params![category, filename], |row| row.get(0))
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
    })
    .unwrap_or_default()
}

fn category_dir_exists(name: &str) -> bool {
    get_config().folderPath.join(name).exists()
}

// ---------- commands ----------

#[tauri::command]
pub async fn export_category_pack(
    app: tauri::AppHandle,
    category_name: String,
    output_path: String,
    export_id: String,
) -> Result<(), String> {
    let config = get_config();
    let category_dir = config.folderPath.join(&category_name);

    if !category_dir.exists() {
        return Err(format!("Category '{}' not found", category_name));
    }

    // Register cancellation flag
    let cancelled = Arc::new(AtomicBool::new(false));
    EXPORT_CANCELS.insert(export_id.clone(), cancelled.clone());

    let entries: Vec<_> = fs::read_dir(&category_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .collect();

    let total = entries.len();

    // Emit initial progress so the dialog can show the total immediately
    let _ = app.emit(
        "pack://export/progress",
        ExportProgressEvent {
            export_id: export_id.clone(),
            current: 0,
            total,
            filename: String::new(),
        },
    );

    let ts = Utc::now().timestamp();
    let pack_id = generate_pack_id(&config.owner_name, &category_name, ts);

    let mut tags_map: HashMap<String, Vec<String>> = HashMap::new();
    for entry in &entries {
        let filename = entry.file_name().to_string_lossy().to_string();
        let tags = fetch_image_tags(&category_name, &filename);
        if !tags.is_empty() {
            tags_map.insert(filename, tags);
        }
    }

    let manifest = PackManifest {
        pack_id,
        owner: config.owner_name.clone(),
        created_at: Utc::now().to_rfc3339(),
        category_name: category_name.clone(),
        image_count: total,
        version: 1,
    };

    let out_file = File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(out_file);
    let opts = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Zstd)
        .compression_level(Some(9));

    zip.start_file("manifest.json", opts).map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_string_pretty(&manifest)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
    .map_err(|e| e.to_string())?;

    zip.start_file("tags.json", opts).map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_string_pretty(&tags_map)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
    .map_err(|e| e.to_string())?;

    for (i, entry) in entries.iter().enumerate() {
        // Check cancellation before each file
        if cancelled.load(Ordering::Relaxed) {
            EXPORT_CANCELS.remove(&export_id);
            drop(zip);
            let _ = fs::remove_file(&output_path);
            return Err("cancelled".to_string());
        }

        let filename = entry.file_name().to_string_lossy().to_string();

        let _ = app.emit(
            "pack://export/progress",
            ExportProgressEvent {
                export_id: export_id.clone(),
                current: i + 1,
                total,
                filename: filename.clone(),
            },
        );

        let mut buf = Vec::new();
        File::open(entry.path())
            .map_err(|e| e.to_string())?
            .read_to_end(&mut buf)
            .map_err(|e| e.to_string())?;

        zip.start_file(format!("images/{}", filename), opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(&buf).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    EXPORT_CANCELS.remove(&export_id);

    let _ = app.emit("pack://export/done", ExportDoneEvent { export_id: export_id.clone() });

    log_info!(
        "Exported pack for '{}' ({} images) to '{}'",
        category_name, total, output_path
    );
    Ok(())
}

#[tauri::command]
pub async fn cancel_export_pack(export_id: String) -> Result<(), String> {
    if let Some(flag) = EXPORT_CANCELS.get(&export_id) {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub async fn import_category_pack(
    app: tauri::AppHandle,
    pack_path: String,
    import_id: String,
) -> Result<ImportResult, String> {
    let config = get_config();

    let file = File::open(&pack_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut manifest_json: Option<String> = None;
    let mut tags_json: Option<String> = None;
    let mut image_files: Vec<(String, Vec<u8>)> = Vec::new();

    // First pass: read all entries
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if name == "manifest.json" {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            manifest_json = Some(s);
        } else if name == "tags.json" {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            tags_json = Some(s);
        } else if name.starts_with("images/") && !name.ends_with('/') {
            let filename = name.strip_prefix("images/").unwrap_or(&name).to_string();
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            image_files.push((filename, buf));
        }
    }

    let total = image_files.len();
    let _ = app.emit(
        "pack://import/progress",
        ImportProgressEvent {
            import_id: import_id.clone(),
            current: 0,
            total,
            filename: String::new(),
        },
    );

    let manifest: PackManifest = serde_json::from_str(
        manifest_json.as_deref().ok_or("Invalid pack: missing manifest.json")?,
    )
    .map_err(|e| format!("Invalid manifest: {}", e))?;

    let tags_map: HashMap<String, Vec<String>> = tags_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let original_name = manifest.category_name.clone();
    let owner_tag = if manifest.owner.is_empty() {
        "imported".to_string()
    } else {
        manifest.owner.clone()
    };

    let mut final_name = original_name.clone();
    let was_renamed = if category_dir_exists(&final_name) {
        final_name = format!("{} [from {}]", original_name, owner_tag);
        if category_dir_exists(&final_name) {
            final_name = format!("{} [from {} {}]", original_name, owner_tag, &manifest.pack_id[..6]);
        }
        true
    } else {
        false
    };

    let dest_dir = config.folderPath.join(&final_name);
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let conn = connect_db().map_err(|e| e.to_string())?;
    let relative_path = dest_dir.to_str().ok_or("Invalid destination path")?.to_string();

    let mut imported = 0usize;
    for (filename, data) in &image_files {
        let _ = app.emit(
            "pack://import/progress",
            ImportProgressEvent {
                import_id: import_id.clone(),
                current: imported + 1,
                total,
                filename: filename.clone(),
            },
        );

        File::create(dest_dir.join(filename))
            .and_then(|mut f| f.write_all(data))
            .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR IGNORE INTO images (relative_path, category, filename) VALUES (?1, ?2, ?3)",
            params![relative_path, final_name, filename],
        )
        .ok();

        let image_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM images WHERE category = ?1 AND filename = ?2",
                params![final_name, filename],
                |row| row.get(0),
            )
            .ok();

        if let (Some(img_id), Some(tags)) = (image_id, tags_map.get(filename)) {
            for tag in tags {
                conn.execute(
                    "INSERT OR IGNORE INTO tags (name, is_category) VALUES (?1, 0)",
                    params![tag],
                )
                .ok();
                let tag_id: Option<i64> = conn
                    .query_row("SELECT id FROM tags WHERE name = ?1", params![tag], |row| row.get(0))
                    .ok();
                if let Some(tid) = tag_id {
                    conn.execute(
                        "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?1, ?2)",
                        params![img_id, tid],
                    )
                    .ok();
                }
            }
        }

        imported += 1;
    }

    let _ = app.emit("pack://import/done", ImportDoneEvent { import_id });

    log_info!(
        "Imported pack '{}' as '{}' ({} images, owner: {})",
        original_name, final_name, imported, manifest.owner
    );

    Ok(ImportResult {
        category_name: final_name,
        image_count: imported,
        owner: manifest.owner,
        original_name,
        was_renamed,
    })
}
