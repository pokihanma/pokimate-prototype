// Bank import: import_jobs, merchant_rules. Every write to synced tables → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportJob {
    pub id: String,
    pub user_id: String,
    pub import_source: String,
    pub bank_name: Option<String>,
    pub file_name: String,
    pub row_count: i32,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn bank_import_list_jobs(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<ImportJob>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, import_source, bank_name, file_name, row_count, status, created_at, updated_at FROM import_jobs WHERE user_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(ImportJob {
            id: r.get(0)?,
            user_id: r.get(1)?,
            import_source: r.get(2)?,
            bank_name: r.get(3)?,
            file_name: r.get(4)?,
            row_count: r.get(5)?,
            status: r.get(6)?,
            created_at: r.get(7)?,
            updated_at: r.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn bank_import_create_job(
    user_id: String,
    import_source: String,
    bank_name: Option<String>,
    file_name: String,
    state: State<'_, db::DbState>,
) -> Result<ImportJob, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("imp");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO import_jobs (id, user_id, import_source, bank_name, file_name, row_count, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, 'preview', ?6, ?6)",
        params![id, user_id, import_source, bank_name, file_name, now],
    ).map_err(|e| e.to_string())?;
    // import_jobs is synced per ARCHITECTURE Section 3
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"import_source":import_source,"file_name":file_name,"status":"preview","created_at":now,"updated_at":now});
    pending(&conn, "import_jobs", "INSERT", &id, &row_json.to_string())?;
    Ok(ImportJob {
        id: id.clone(),
        user_id,
        import_source,
        bank_name,
        file_name,
        row_count: 0,
        status: "preview".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn bank_import_update_job_status(
    id: String,
    status: String,
    row_count: Option<i32>,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    if let Some(rc) = row_count {
        conn.execute("UPDATE import_jobs SET status = ?1, row_count = ?2, updated_at = ?3 WHERE id = ?4", params![status, rc, now, id]).map_err(|e| e.to_string())?;
    } else {
        conn.execute("UPDATE import_jobs SET status = ?1, updated_at = ?2 WHERE id = ?3", params![status, now, id]).map_err(|e| e.to_string())?;
    }
    let row_json = serde_json::json!({"id":id,"status":status,"updated_at":now});
    pending(&conn, "import_jobs", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MerchantRule {
    pub id: String,
    pub user_id: String,
    pub pattern: String,
    pub category_id: String,
    pub is_regex: i32,
    pub priority: i32,
    pub created_at: String,
}

#[tauri::command]
pub fn bank_import_list_merchant_rules(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<MerchantRule>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, pattern, category_id, is_regex, priority, created_at FROM merchant_rules WHERE user_id = ?1 ORDER BY priority DESC, pattern"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(MerchantRule {
            id: r.get(0)?,
            user_id: r.get(1)?,
            pattern: r.get(2)?,
            category_id: r.get(3)?,
            is_regex: r.get(4)?,
            priority: r.get(5)?,
            created_at: r.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn bank_import_create_merchant_rule(
    user_id: String,
    pattern: String,
    category_id: String,
    is_regex: Option<i32>,
    priority: Option<i32>,
    state: State<'_, db::DbState>,
) -> Result<MerchantRule, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("mru");
    let now = db::now_iso();
    let is_regex = is_regex.unwrap_or(0);
    let priority = priority.unwrap_or(0);
    conn.execute(
        "INSERT INTO merchant_rules (id, user_id, pattern, category_id, is_regex, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, user_id, pattern, category_id, is_regex, priority, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"pattern":pattern,"category_id":category_id,"is_regex":is_regex,"priority":priority,"created_at":now});
    pending(&conn, "merchant_rules", "INSERT", &id, &row_json.to_string())?;
    Ok(MerchantRule {
        id,
        user_id,
        pattern,
        category_id,
        is_regex,
        priority,
        created_at: now,
    })
}

#[tauri::command]
pub fn bank_import_delete_merchant_rule(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    conn.execute("DELETE FROM merchant_rules WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    // merchant_rules has no deleted_at in schema — hard delete. Still record for sync if we treat as DELETE.
    let row_json = serde_json::json!({"id":id});
    pending(&conn, "merchant_rules", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}
