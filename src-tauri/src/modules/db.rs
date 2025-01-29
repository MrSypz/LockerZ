use std::collections::HashMap;
use std::fs;
use crate::modules::pathutils::get_main_path;
use rusqlite::{Connection, Result, ToSql};
use serde::{Deserialize, Serialize};
use std::fs::create_dir_all;
use std::path::{Path, PathBuf};
use crate::{log_error, log_info};
use crate::modules::config::get_config;

#[derive(Debug, Serialize, Deserialize)]
pub struct Image {
    id: i64,
    relative_path: String,
    category: String,
    filename: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    name: String,
    is_category: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryIcon {
    relative_path: Option<String>,
    filename: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageTag {
    image_id: i64,
    tag_id: i64,
}
pub fn connect_db() -> Result<Connection, String> {
    let main_path = get_main_path().map_err(|e| format!("Failed to get main path: {}", e))?;
    let db_dir = main_path.join("database");
    create_dir_all(&db_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let conn = Connection::open(db_dir.join("lockerz.db")).map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn init_db() -> Result<Connection, String> {
    let conn = connect_db()?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY,
        relative_path TEXT NOT NULL,
        category TEXT NOT NULL,
        filename TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(relative_path, filename)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            is_category BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS image_tags (
        image_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
       )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS category_icons (
            category TEXT PRIMARY KEY,
            relative_path TEXT,
            filename TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category) REFERENCES tags(name) ON DELETE CASCADE
        )",
        [],
    )
        .map_err(|e| e.to_string())?;

    Ok(conn)
}

#[tauri::command]
pub fn add_image(path: PathBuf, category: String) -> Result<i64, String> {
    let conn = connect_db()?;

    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?;

    let relative_path = path
        .parent()
        .and_then(|p| p.to_str())
        .ok_or("Invalid path")?;

    let mut stmt = conn
        .prepare(
            "SELECT id FROM images
             WHERE relative_path = ?1
             AND category = ?2
             AND filename = ?3"
        )
        .map_err(|e| e.to_string())?;

    match stmt.query_row([relative_path, &category, filename], |row| row.get::<_, i64>(0)) {
        Ok(id) => {
            Ok(id)
        }
        Err(_) => {
            conn.execute(
                "INSERT INTO images (relative_path, category, filename) VALUES (?1, ?2, ?3)",
                [relative_path, &category, filename],
            )
                .map_err(|e| e.to_string())?;

            Ok(conn.last_insert_rowid())
        }
    }
}

#[tauri::command]
pub fn add_tag(name: String) -> Result<i64, String> {
    let conn = connect_db()?;
    println!("add_tag pass {:?}",conn);
    conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [&name])
        .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
}

#[tauri::command]
pub fn tag_image(image_id: i64, tag_name: String) -> Result<(), String> {
    let conn = connect_db()?;
    println!("tag_image pass {:?}",conn);
    conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [&tag_name])
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO image_tags (image_id, tag_id)
         SELECT ?1, id FROM tags WHERE name = ?2",
        [&image_id.to_string(), &tag_name],
    )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_image_tags(image_id: i64) -> Result<Vec<TagInfo>, String> {
    let conn = connect_db()?;
    let mut stmt = conn
        .prepare(
            "SELECT t.name, t.is_category FROM tags t
             JOIN image_tags it ON t.id = it.tag_id
             WHERE it.image_id = ?1"
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([image_id], |row| {
            Ok(TagInfo {
                name: row.get(0)?,
                is_category: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tags)
}

#[tauri::command]
pub fn search_images_by_tags(tags: Vec<String>) -> Result<Vec<Image>, String> {
    let conn = connect_db()?;
    println!("search_images_by_tags pass {:?}",conn);
    let placeholders = vec!["?"; tags.len()].join(",");
    let query = format!(
        "SELECT DISTINCT i.* FROM images i
         JOIN image_tags it ON i.id = it.image_id
         JOIN tags t ON it.tag_id = t.id
         WHERE t.name IN ({})
         GROUP BY i.id
         HAVING COUNT(DISTINCT t.name) = ?",
        placeholders
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let mut params: Vec<Box<dyn ToSql>> = tags.iter().map(|s| Box::new(s.clone()) as Box<dyn ToSql>).collect();
    params.push(Box::new(tags.len() as i64));

    let images = stmt
        .query_map(rusqlite::params_from_iter(params.iter().map(|p| &**p)), |row| {
            Ok(Image {
                id: row.get(0)?,
                relative_path: row.get(1)?,
                category: row.get(2)?,
                filename: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(images)
}

#[tauri::command]
pub fn get_all_tags() -> Result<Vec<TagInfo>, String> {
    let conn = connect_db()?;
    let mut stmt = conn
        .prepare("SELECT name, is_category FROM tags")
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([], |row| {
            Ok(TagInfo {
                name: row.get(0)?,
                is_category: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tags)
}

#[tauri::command]
pub fn remove_image_tag(image_id: i64, tag_name: String) -> Result<(), String> {
    let conn = connect_db()?;
    println!("remove_image_tag pass {:?}",conn);
    conn.execute(
        "DELETE FROM image_tags WHERE image_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)",
        [&image_id.to_string(), &tag_name],
    )
        .map_err(|e| e.to_string())?;

    Ok(())
}
#[tauri::command]
pub fn get_image_id(path: PathBuf, category: String) -> Result<i64, String> {
    let conn = connect_db()?;
    println!("get_image_id pass {:?}", conn);

    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?;

    let relative_path = path
        .parent()
        .and_then(|p| p.to_str())
        .ok_or("Invalid path")?;

    let mut stmt = conn
        .prepare(
            "SELECT id FROM images
             WHERE relative_path = ?1
             AND category = ?2
             AND filename = ?3"
        )
        .map_err(|e| e.to_string())?;

    let image_id = stmt
        .query_row([relative_path, &category, filename], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(image_id)
}

#[tauri::command]
pub fn remove_tag(name: String) -> Result<(), String> {
    let mut conn = connect_db()?;
    println!("remove_tag called for tag: {}", name);

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM image_tags WHERE tag_id = (SELECT id FROM tags WHERE name = ?1)",
        [&name],
    )
        .map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM tags WHERE name = ?1",
        [&name],
    )
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn edit_tag(old_name: String, new_name: String) -> Result<(), String> {
    let conn = connect_db()?;
    println!("edit_tag called: {} -> {}", old_name, new_name);

    // Check if the new name already exists
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM tags WHERE name = ?1")
        .map_err(|e| e.to_string())?;

    let exists: i64 = stmt
        .query_row([&new_name], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if exists > 0 {
        return Err(format!("Tag '{}' already exists", new_name));
    }

    // Update the tag name
    conn.execute(
        "UPDATE tags SET name = ?1 WHERE name = ?2",
        [&new_name, &old_name],
    )
        .map_err(|e| e.to_string())?;

    Ok(())
}
#[tauri::command]
pub fn create_category_tags() -> Result<(), String> {
    let conn = connect_db()?;
    let config = get_config();
    let root_folder_path = config.folderPath;

    // Get all directories in the root folder
    let categories: Vec<String> = fs::read_dir(&root_folder_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();

            // Only include if it's a directory and not "uncategorized"
            if path.is_dir() &&
                path.file_name()?.to_string_lossy() != "uncategorized" {
                Some(path.file_name()?.to_string_lossy().into_owned())
            } else {
                None
            }
        })
        .collect();

    log_info!("Found {} categories from folders", categories.len());

    // Create tags for each category
    for category in &categories {
        match conn.execute(
            "INSERT OR IGNORE INTO tags (name, is_category) VALUES (?1, 1)",
            [category],
        ) {
            Ok(_) => log_info!("Created category tag: {}", category),
            Err(e) => log_error!("Failed to create tag for category {}: {}", category, e)
        }
    }

    // Verify tags were created
    let created_tags = conn.prepare(
        "SELECT name FROM tags WHERE is_category = 1"
    ).map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    log_info!("Created category tags: {:?}", created_tags);

    Ok(())
}

// Add these new functions for managing category icons
#[tauri::command]
pub fn set_category_icon(category: String, path: Option<PathBuf>) -> Result<(), String> {
    let conn = connect_db()?;

    match path {
        Some(icon_path) => {
            let filename = icon_path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or("Invalid filename")?;

            let relative_path = icon_path
                .parent()
                .and_then(|p| p.to_str())
                .ok_or("Invalid path")?;

            conn.execute(
                "INSERT OR REPLACE INTO category_icons (category, relative_path, filename)
                 VALUES (?1, ?2, ?3)",
                [&category, relative_path, filename],
            )
                .map_err(|e| e.to_string())?;
        }
        None => {
            // Remove icon if path is None
            conn.execute(
                "DELETE FROM category_icons WHERE category = ?1",
                [&category],
            )
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_category_icon(category: String) -> Result<Option<CategoryIcon>, String> {
    let conn = connect_db()?;

    let mut stmt = conn.prepare(
        "SELECT relative_path, filename FROM category_icons WHERE category = ?1"
    ).map_err(|e| e.to_string())?;

    let result = stmt.query_row([&category], |row| {
        Ok(CategoryIcon {
            relative_path: row.get(0)?,
            filename: row.get(1)?,
        })
    });

    match result {
        Ok(icon) => Ok(Some(icon)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn get_batch_image_ids(file_paths: &[(PathBuf, String)]) -> Result<HashMap<PathBuf, i64>, String> {
    let conn = connect_db()?;
    let mut result = HashMap::new();

    let mut stmt = conn.prepare("
        SELECT id FROM images
        WHERE relative_path = ?1
        AND category = ?2
        AND filename = ?3
    ").map_err(|e| e.to_string())?;

    for (path, category) in file_paths {
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid filename")?;

        let relative_path = path
            .parent()
            .and_then(|p| p.to_str())
            .ok_or("Invalid path")?;

        if let Ok(id) = stmt.query_row([relative_path, category, filename], |row| row.get::<_, i64>(0)) {
            result.insert(path.clone(), id);
        }
    }

    Ok(result)
}

pub fn get_batch_image_tags(image_ids: &HashMap<PathBuf, i64>) -> Result<HashMap<i64, Vec<TagInfo>>, String> {
    let conn = connect_db()?;
    let mut result = HashMap::new();

    let mut stmt = conn.prepare(
        "SELECT t.name, t.is_category FROM tags t
         JOIN image_tags it ON t.id = it.tag_id
         WHERE it.image_id = ?1"
    ).map_err(|e| e.to_string())?;

    for id in image_ids.values() {
        let tags = stmt
            .query_map([id], |row| {
                Ok(TagInfo {
                    name: row.get(0)?,
                    is_category: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<TagInfo>, _>>()
            .map_err(|e| e.to_string())?;

        result.insert(*id, tags);
    }

    Ok(result)
}

pub fn migrate_database() -> Result<(), String> {
    let conn = connect_db()?;

    // Check if the column already exists first
    let columns = conn.prepare(
        "PRAGMA table_info(tags)"
    ).map_err(|e| e.to_string())?
        .query_map([], |row| {
            Ok(row.get::<_, String>(1)?)  // 1 is the index of the column name
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| e.to_string())?;

    if !columns.contains(&"is_category".to_string()) {
        // Column doesn't exist, so add it
        conn.execute(
            "ALTER TABLE tags ADD COLUMN is_category BOOLEAN NOT NULL DEFAULT 0",
            [],
        ).map_err(|e| e.to_string())?;

        log_info!("Added is_category column to tags table");
    } else {
        log_info!("is_category column already exists");
    }

    Ok(())
}
