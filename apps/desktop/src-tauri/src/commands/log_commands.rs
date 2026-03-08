// App logs: insert (for commands to log errors), list (for in-app viewer). app_logs is NOT synced — no pending_changes.

use crate::db;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct AppLogEntry {
    pub id: String,
    pub level: String,
    pub module: String,
    pub message: String,
    pub data: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub fn log_insert(
    level: String,
    module: String,
    message: String,
    data: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let id = db::new_id("log");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO app_logs (id, level, module, message, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, level, module, message, data, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn log_list(
    level: Option<String>,
    module: Option<String>,
    limit: Option<i32>,
    state: State<'_, db::DbState>,
) -> Result<Vec<AppLogEntry>, String> {
    let conn = db::open(&state)?;
    let limit = limit.unwrap_or(100);
    let sql = "SELECT id, level, module, message, data, created_at FROM app_logs WHERE (?1 IS NULL OR level = ?1) AND (?2 IS NULL OR module = ?2) ORDER BY created_at DESC LIMIT ?3";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![level, module, limit], |r| {
        Ok(AppLogEntry {
            id: r.get(0)?,
            level: r.get(1)?,
            module: r.get(2)?,
            message: r.get(3)?,
            data: r.get(4)?,
            created_at: r.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
