// Habits: habits, habit_checkins. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Habit {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub frequency: String,
    pub target_days: String,
    pub color: String,
    pub icon: String,
    pub reminder_time: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn habits_list(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Habit>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, name, description, frequency, target_days, color, icon, reminder_time, is_active, created_at, updated_at FROM habits WHERE user_id = ?1 AND deleted_at IS NULL ORDER BY name"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Habit {
            id: r.get(0)?,
            user_id: r.get(1)?,
            name: r.get(2)?,
            description: r.get(3)?,
            frequency: r.get(4)?,
            target_days: r.get(5)?,
            color: r.get(6)?,
            icon: r.get(7)?,
            reminder_time: r.get(8)?,
            is_active: r.get(9)?,
            created_at: r.get(10)?,
            updated_at: r.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn habits_create(
    user_id: String,
    name: String,
    description: Option<String>,
    frequency: Option<String>,
    target_days: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    reminder_time: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Habit, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("hab");
    let now = db::now_iso();
    let frequency = frequency.unwrap_or_else(|| "daily".to_string());
    let target_days = target_days.unwrap_or_else(|| "[0,1,2,3,4,5,6]".to_string());
    let color = color.unwrap_or_else(|| "#5B6CF9".to_string());
    let icon = icon.unwrap_or_else(|| "check-circle".to_string());
    conn.execute(
        "INSERT INTO habits (id, user_id, name, description, frequency, target_days, color, icon, reminder_time, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10, NULL)",
        params![id, user_id, name, description, frequency, target_days, color, icon, reminder_time, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"name":name,"frequency":frequency,"target_days":target_days,"color":color,"icon":icon,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "habits", "INSERT", &id, &row_json.to_string())?;
    Ok(Habit {
        id: id.clone(),
        user_id,
        name,
        description,
        frequency,
        target_days,
        color,
        icon,
        reminder_time,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn habits_soft_delete(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE habits SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "habits", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HabitCheckin {
    pub id: String,
    pub habit_id: String,
    pub user_id: String,
    pub checkin_date: String,
    pub status: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn habits_list_checkins(
    habit_id: String,
    user_id: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Vec<HabitCheckin>, String> {
    let conn = db::open(&state)?;
    // Empty habit_id means "all habits for this user" — used by the habits page overview
    let rows: Vec<HabitCheckin> = if habit_id.is_empty() {
        let sql = "SELECT id, habit_id, user_id, checkin_date, status, note, created_at FROM habit_checkins WHERE (?1 IS NULL OR user_id = ?1) AND (?2 IS NULL OR checkin_date >= ?2) AND (?3 IS NULL OR checkin_date <= ?3) ORDER BY checkin_date DESC";
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, from_date, to_date], |r| {
            Ok(HabitCheckin { id: r.get(0)?, habit_id: r.get(1)?, user_id: r.get(2)?, checkin_date: r.get(3)?, status: r.get(4)?, note: r.get(5)?, created_at: r.get(6)? })
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        let sql = "SELECT id, habit_id, user_id, checkin_date, status, note, created_at FROM habit_checkins WHERE habit_id = ?1 AND (?2 IS NULL OR checkin_date >= ?2) AND (?3 IS NULL OR checkin_date <= ?3) ORDER BY checkin_date DESC";
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![habit_id, from_date, to_date], |r| {
            Ok(HabitCheckin { id: r.get(0)?, habit_id: r.get(1)?, user_id: r.get(2)?, checkin_date: r.get(3)?, status: r.get(4)?, note: r.get(5)?, created_at: r.get(6)? })
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn habits_upsert_checkin(
    habit_id: String,
    user_id: String,
    checkin_date: String,
    status: String,
    note: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<HabitCheckin, String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM habit_checkins WHERE habit_id = ?1 AND checkin_date = ?2",
        params![habit_id, checkin_date],
        |r| r.get(0),
    ).optional().map_err(|e| e.to_string())?;
    let id = match existing {
        Some(id) => {
            conn.execute("UPDATE habit_checkins SET status = ?1, note = ?2 WHERE id = ?3", params![status, note, id]).map_err(|e| e.to_string())?;
            let row_json = serde_json::json!({"id":id,"status":status,"note":note});
            pending(&conn, "habit_checkins", "UPDATE", &id, &row_json.to_string())?;
            id
        }
        None => {
            let new_id = db::new_id("chk");
            conn.execute(
                "INSERT INTO habit_checkins (id, habit_id, user_id, checkin_date, status, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![new_id, habit_id, user_id, checkin_date, status, note, now],
            ).map_err(|e| e.to_string())?;
            let row_json = serde_json::json!({"id":new_id,"habit_id":habit_id,"user_id":user_id,"checkin_date":checkin_date,"status":status,"created_at":now});
            pending(&conn, "habit_checkins", "INSERT", &new_id, &row_json.to_string())?;
            new_id
        }
    };
    Ok(HabitCheckin {
        id: id.clone(),
        habit_id,
        user_id,
        checkin_date,
        status,
        note,
        created_at: now,
    })
}
