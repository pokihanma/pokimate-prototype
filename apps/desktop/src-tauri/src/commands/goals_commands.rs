// Goals: goals, goal_deposits. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Goal {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub target_amount_minor: i64,
    pub current_amount_minor: i64,
    pub target_date: Option<String>,
    pub color: String,
    pub icon: String,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn goals_list(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Goal>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, title, description, target_amount_minor, current_amount_minor, target_date, color, icon, is_active, created_at, updated_at FROM goals WHERE user_id = ?1 AND deleted_at IS NULL ORDER BY target_date, title"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Goal {
            id: r.get(0)?,
            user_id: r.get(1)?,
            title: r.get(2)?,
            description: r.get(3)?,
            target_amount_minor: r.get(4)?,
            current_amount_minor: r.get(5)?,
            target_date: r.get(6)?,
            color: r.get(7)?,
            icon: r.get(8)?,
            is_active: r.get(9)?,
            created_at: r.get(10)?,
            updated_at: r.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn goals_create(
    user_id: String,
    title: String,
    description: Option<String>,
    target_amount_minor: i64,
    target_date: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Goal, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("goal");
    let now = db::now_iso();
    let color = color.unwrap_or_else(|| "#10B981".to_string());
    let icon = icon.unwrap_or_else(|| "target".to_string());
    conn.execute(
        "INSERT INTO goals (id, user_id, title, description, target_amount_minor, current_amount_minor, target_date, color, icon, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, 1, ?9, ?9, NULL)",
        params![id, user_id, title, description, target_amount_minor, target_date, color, icon, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"title":title,"target_amount_minor":target_amount_minor,"current_amount_minor":0i64,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "goals", "INSERT", &id, &row_json.to_string())?;
    Ok(Goal {
        id: id.clone(),
        user_id,
        title,
        description,
        target_amount_minor,
        current_amount_minor: 0,
        target_date,
        color,
        icon,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn goals_soft_delete(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE goals SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "goals", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GoalDeposit {
    pub id: String,
    pub goal_id: String,
    pub user_id: String,
    pub amount_minor: i64,
    pub note: Option<String>,
    pub deposit_date: String,
    pub created_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn goals_add_deposit(
    goal_id: String,
    user_id: String,
    amount_minor: i64,
    note: Option<String>,
    deposit_date: String,
    state: State<'_, db::DbState>,
) -> Result<GoalDeposit, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("gdp");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO goal_deposits (id, goal_id, user_id, amount_minor, note, deposit_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, goal_id, user_id, amount_minor, note, deposit_date, now],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE goals SET current_amount_minor = current_amount_minor + ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![amount_minor, now, goal_id],
    ).map_err(|e| e.to_string())?;
    let row_json_dep = serde_json::json!({"id":id,"goal_id":goal_id,"user_id":user_id,"amount_minor":amount_minor,"deposit_date":deposit_date,"created_at":now});
    pending(&conn, "goal_deposits", "INSERT", &id, &row_json_dep.to_string())?;
    let row_json_goal = serde_json::json!({"id":goal_id,"current_amount_minor_inc":amount_minor,"updated_at":now});
    pending(&conn, "goals", "UPDATE", &goal_id, &row_json_goal.to_string())?;
    Ok(GoalDeposit {
        id,
        goal_id,
        user_id,
        amount_minor,
        note,
        deposit_date,
        created_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn goals_list_deposits(goal_id: String, state: State<'_, db::DbState>) -> Result<Vec<GoalDeposit>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, goal_id, user_id, amount_minor, note, deposit_date, created_at FROM goal_deposits WHERE goal_id = ?1 ORDER BY deposit_date DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![goal_id], |r| {
        Ok(GoalDeposit {
            id: r.get(0)?,
            goal_id: r.get(1)?,
            user_id: r.get(2)?,
            amount_minor: r.get(3)?,
            note: r.get(4)?,
            deposit_date: r.get(5)?,
            created_at: r.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
