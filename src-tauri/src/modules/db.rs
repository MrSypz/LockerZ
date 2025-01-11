use crate::modules::pathutils::get_main_path;
use rusqlite::{Connection, Result, ToSql};
use serde::{Deserialize, Serialize};
use std::fs::create_dir_all;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Image {
    id: i64,
    relative_path: String,
    category: String,
    filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Tag {
    id: i64,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageTag {
    image_id: i64,
    tag_id: i64,
}
fn connect_db() -> Result<Connection, String> {
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

    Ok(conn)
}

#[tauri::command]
pub fn add_image(path: PathBuf, category: String) -> Result<i64, String> {
    let conn = connect_db()?;
    println!("add_image pass {:?}",conn);
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?;

    let relative_path = path
        .parent()
        .and_then(|p| p.to_str())
        .ok_or("Invalid path")?;

    conn.execute(
        "INSERT OR IGNORE INTO images (relative_path, category, filename) VALUES (?1, ?2, ?3)",
        [relative_path, &category, filename],
    )
        .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
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
pub fn get_image_tags(image_id: i64) -> Result<Vec<String>, String> {
    let conn = connect_db()?;
    println!("get_image_tags pass {:?}",conn);
    let mut stmt = conn
        .prepare(
            "SELECT t.name FROM tags t
         JOIN image_tags it ON t.id = it.tag_id
         WHERE it.image_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([image_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
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
pub fn get_all_tags() -> Result<Vec<String>, String> {
    let conn = connect_db()?;
    println!("get_all_tags pass {:?}",conn);
    let mut stmt = conn
        .prepare("SELECT name FROM tags")
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
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