// Settings: app_config (key-value). app_config is NOT in pending_changes (sync_cursors / app_config per ARCHITECTURE are sync infra; actually app_config IS synced per Section 3 — it's in the schema. So we write pending_changes for app_config.
// User profile: read from users (no write in Phase 1 for profile update).

use crate::db;
use rusqlite::params;
use rusqlite::OptionalExtension;
use serde::Serialize;
use tauri::State;

const DEVICE_ID: &str = "desktop";

#[derive(Debug, Serialize)]
pub struct AppConfigValue {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn settings_get_config(key: String, state: State<'_, db::DbState>) -> Result<Option<AppConfigValue>, String> {
    let conn = db::open(&state)?;
    let opt = conn.query_row(
        "SELECT key, value, updated_at FROM app_config WHERE key = ?1",
        params![key],
        |r| Ok(AppConfigValue {
            key: r.get(0)?,
            value: r.get(1)?,
            updated_at: r.get(2)?,
        }),
    ).optional().map_err(|e| e.to_string())?;
    Ok(opt)
}

#[tauri::command]
pub fn settings_set_config(key: String, value: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    let exists: Option<String> = conn.query_row("SELECT key FROM app_config WHERE key = ?1", params![key], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
    if exists.is_some() {
        conn.execute("UPDATE app_config SET value = ?1, updated_at = ?2 WHERE key = ?3", params![value, now, key]).map_err(|e| e.to_string())?;
        let row_json = serde_json::json!({"key":key,"value":value,"updated_at":now});
        db::write_pending_change(&conn, "app_config", "UPDATE", &key, &row_json.to_string(), DEVICE_ID)?;
    } else {
        conn.execute("INSERT INTO app_config (key, value, updated_at) VALUES (?1, ?2, ?3)", params![key, value, now]).map_err(|e| e.to_string())?;
        let row_json = serde_json::json!({"key":key,"value":value,"updated_at":now});
        db::write_pending_change(&conn, "app_config", "INSERT", &key, &row_json.to_string(), DEVICE_ID)?;
    }
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub email: Option<String>,
    pub role: String,
}

#[tauri::command]
pub fn settings_get_user_profile(user_id: String, state: State<'_, db::DbState>) -> Result<Option<UserProfile>, String> {
    let conn = db::open(&state)?;
    let opt = conn.query_row(
        "SELECT id, username, display_name, email, role FROM users WHERE id = ?1 AND deleted_at IS NULL",
        params![user_id],
        |r| Ok(UserProfile {
            id: r.get(0)?,
            username: r.get(1)?,
            display_name: r.get(2)?,
            email: r.get(3)?,
            role: r.get(4)?,
        }),
    ).optional().map_err(|e| e.to_string())?;
    Ok(opt)
}
