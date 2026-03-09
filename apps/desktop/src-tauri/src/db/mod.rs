// PokiMate v4 — SQLite DB layer. WAL mode, migrations via pre-built base.db.

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;

const DB_FILENAME: &str = "pokimate.db";
const RESOURCE_DB: &str = "resources/base.db";
const WAL_PRAGMAS: &[&str] = &[
    "PRAGMA journal_mode=WAL;",
    "PRAGMA synchronous=NORMAL;",
    "PRAGMA foreign_keys=ON;",
    "PRAGMA cache_size=-32000;",
    "PRAGMA temp_store=MEMORY;",
];

/// Application DB path and lock. Commands open a new connection per call using this path.
pub struct DbState {
    pub db_path: PathBuf,
}

/// Copy base.db from resources to app data dir if local DB does not exist.
/// Then open connection, set WAL pragmas, return path for future connections.
pub fn init<M: Manager<R>, R: tauri::Runtime>(app: &M) -> Result<DbState, String> {
    let path_resolver = app.path();
    let app_data_dir = path_resolver
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("create_dir_all: {}", e))?;

    let db_path = app_data_dir.join(DB_FILENAME);

    if !db_path.exists() {
        let src = path_resolver
            .resolve(RESOURCE_DB, BaseDirectory::Resource)
            .map_err(|e| format!("resolve base.db: {}", e))?;
        if !src.exists() {
            return Err("base.db not found in resources".to_string());
        }
        std::fs::copy(&src, &db_path).map_err(|e| format!("copy base.db: {}", e))?;
    }

    // Apply WAL pragmas on a temporary connection to ensure they're set for the file
    let conn = Connection::open(&db_path).map_err(|e| format!("open db: {}", e))?;
    for pragma in WAL_PRAGMAS {
        conn.execute_batch(pragma)
            .map_err(|e| format!("pragma {}: {}", pragma, e))?;
    }
    drop(conn);

    Ok(DbState { db_path })
}

/// Open a new connection with WAL pragmas. Use in every command.
pub fn open(state: &DbState) -> Result<Connection, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| format!("open: {}", e))?;
    for pragma in WAL_PRAGMAS {
        conn.execute_batch(pragma)
            .map_err(|e| format!("pragma: {}", e))?;
    }
    Ok(conn)
}

/// Write a row to pending_changes for sync. Call on EVERY INSERT/UPDATE/DELETE to synced tables.
/// Tables NOT synced: app_logs, pending_changes, conflicts_pending, sync_cursors.
pub fn write_pending_change(
    conn: &Connection,
    table_name: &str,
    op: &str,
    row_id: &str,
    row_data: &str,
    device_id: &str,
) -> Result<(), String> {
    let id = new_id("chg");
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "INSERT INTO pending_changes (id, table_name, op, row_id, row_data, device_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, table_name, op, row_id, row_data, device_id, now],
    )
    .map_err(|e| format!("write_pending_change: {}", e))?;
    Ok(())
}

/// Generate ID: prefix_ + 12-char hex (ARCHITECTURE rule).
pub fn new_id(prefix: &str) -> String {
    let hex = format!("{}", uuid::Uuid::new_v4().as_simple());
    format!("{}_{}", prefix, &hex[..12])
}

/// ISO now for created_at/updated_at.
pub fn now_iso() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}
