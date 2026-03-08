// Time tracker: time_entries. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub category: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub is_running: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn time_list_entries(
    user_id: String,
    from_date: Option<String>,
    to_date: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Vec<TimeEntry>, String> {
    let conn = db::open(&state)?;
    let sql = "SELECT id, user_id, title, category, start_time, end_time, duration_minutes, is_running, created_at, updated_at FROM time_entries WHERE user_id = ?1 AND deleted_at IS NULL AND (?2 IS NULL OR date(start_time) >= ?2) AND (?3 IS NULL OR date(start_time) <= ?3) ORDER BY start_time DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id, from_date, to_date], |r| {
        Ok(TimeEntry {
            id: r.get(0)?,
            user_id: r.get(1)?,
            title: r.get(2)?,
            category: r.get(3)?,
            start_time: r.get(4)?,
            end_time: r.get(5)?,
            duration_minutes: r.get(6)?,
            is_running: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn time_create_entry(
    user_id: String,
    title: String,
    category: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<TimeEntry, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("tim");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO time_entries (id, user_id, title, category, start_time, end_time, duration_minutes, is_running, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, 1, ?5, ?5, NULL)",
        params![id, user_id, title, category, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"title":title,"start_time":now,"is_running":1,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "time_entries", "INSERT", &id, &row_json.to_string())?;
    Ok(TimeEntry {
        id: id.clone(),
        user_id,
        title,
        category,
        start_time: now.clone(),
        end_time: None,
        duration_minutes: None,
        is_running: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn time_stop_entry(
    id: String,
    state: State<'_, db::DbState>,
) -> Result<TimeEntry, String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    let start: String = conn.query_row("SELECT start_time FROM time_entries WHERE id = ?1 AND deleted_at IS NULL", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    let start_dt = chrono::DateTime::parse_from_rfc3339(&start).map_err(|e| e.to_string())?;
    let end_dt = chrono::DateTime::parse_from_rfc3339(&now).map_err(|e| e.to_string())?;
    let duration_minutes = (end_dt - start_dt).num_minutes() as i32;
    conn.execute(
        "UPDATE time_entries SET end_time = ?1, duration_minutes = ?2, is_running = 0, updated_at = ?3 WHERE id = ?4 AND deleted_at IS NULL",
        params![now, duration_minutes, now, id],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"end_time":now,"duration_minutes":duration_minutes,"is_running":0,"updated_at":now});
    pending(&conn, "time_entries", "UPDATE", &id, &row_json.to_string())?;
    let row = conn.query_row(
        "SELECT id, user_id, title, category, start_time, end_time, duration_minutes, is_running, created_at, updated_at FROM time_entries WHERE id = ?1",
        params![id],
        |r| Ok(TimeEntry {
            id: r.get(0)?,
            user_id: r.get(1)?,
            title: r.get(2)?,
            category: r.get(3)?,
            start_time: r.get(4)?,
            end_time: r.get(5)?,
            duration_minutes: r.get(6)?,
            is_running: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        }),
    ).map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub fn time_soft_delete_entry(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE time_entries SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "time_entries", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}
