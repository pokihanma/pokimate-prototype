// Auth: login, logout, get_session. ARCHITECTURE Section 4.
// All commands use rename_all = "snake_case" so JS always passes snake_case keys.

use crate::db;
use rusqlite::params;
use sha2::Digest;
use rusqlite::OptionalExtension;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub role: String,
    pub expires_at: String,
}

// Flat params — no struct wrapper needed; JS passes { username, password, device_name }
#[tauri::command(rename_all = "snake_case")]
pub fn auth_login(
    username: String,
    password: String,
    device_name: String,
    state: State<'_, db::DbState>,
) -> Result<SessionInfo, String> {
    let conn = db::open(&state)?;
    let row = conn
        .query_row(
            "SELECT id, password_hash, display_name, role FROM users WHERE username = ?1 AND deleted_at IS NULL AND is_active = 1",
            params![username],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                ))
            },
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    let (user_id, password_hash, display_name, role) = row;
    let valid = bcrypt::verify(&password, &password_hash)
        .map_err(|e| format!("Auth error: {}", e))?;
    if !valid {
        return Err("Invalid username or password".to_string());
    }

    let session_id = db::new_id("ses");
    let token_input = format!("{}{}", session_id, db::now_iso());
    let token_hash = hex::encode(sha2::Sha256::digest(token_input.as_bytes()));
    let now = db::now_iso();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);
    let expires_at_str = expires_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    conn.execute(
        "INSERT INTO auth_sessions (id, user_id, token_hash, device_name, created_at, expires_at, revoked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)",
        params![session_id, user_id, token_hash, device_name, now, expires_at_str],
    )
    .map_err(|e| format!("Create session: {}", e))?;
    // auth_sessions is NOT synced per ARCHITECTURE — no pending_changes write.

    Ok(SessionInfo {
        session_id,
        user_id,
        username,
        display_name,
        role,
        expires_at: expires_at_str,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn auth_logout(session_id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute(
        "UPDATE auth_sessions SET revoked_at = ?1 WHERE id = ?2",
        params![now, session_id],
    )
    .map_err(|e| format!("Logout: {}", e))?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn auth_get_session(
    session_id: String,
    state: State<'_, db::DbState>,
) -> Result<Option<SessionInfo>, String> {
    let conn = db::open(&state)?;
    let opt = conn
        .query_row(
            "SELECT s.id, s.user_id, u.username, u.display_name, u.role, s.expires_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?1 AND s.revoked_at IS NULL AND u.deleted_at IS NULL",
            params![session_id],
            |r| {
                Ok(SessionInfo {
                    session_id: r.get(0)?,
                    user_id: r.get(1)?,
                    username: r.get(2)?,
                    display_name: r.get(3)?,
                    role: r.get(4)?,
                    expires_at: r.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("Get session: {}", e))?;
    Ok(opt)
}
