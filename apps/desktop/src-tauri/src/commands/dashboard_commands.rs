// Dashboard: read-only KPIs and recent activity. No pending_changes.

use crate::db;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct DashboardSummary {
    pub total_balance_minor: i64,
    pub monthly_income_minor: i64,
    pub monthly_expense_minor: i64,
    pub recent_transactions_count: i32,
    pub active_habits_count: i32,
    pub active_goals_count: i32,
}

#[tauri::command]
pub fn dashboard_get_summary(user_id: String, state: State<'_, db::DbState>) -> Result<DashboardSummary, String> {
    let conn = db::open(&state)?;
    let total_balance_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(balance_minor), 0) FROM finance_accounts WHERE user_id = ?1 AND deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let month_start = now.format("%Y-%m-01").to_string();
    let monthly_income_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM finance_transactions WHERE user_id = ?1 AND type = 'income' AND txn_date >= ?2 AND deleted_at IS NULL",
        params![user_id, month_start],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let monthly_expense_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM finance_transactions WHERE user_id = ?1 AND type = 'expense' AND txn_date >= ?2 AND deleted_at IS NULL",
        params![user_id, month_start],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let recent_transactions_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM finance_transactions WHERE user_id = ?1 AND deleted_at IS NULL AND txn_date >= date('now', '-30 days')",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let active_habits_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM habits WHERE user_id = ?1 AND deleted_at IS NULL AND is_active = 1",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let active_goals_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM goals WHERE user_id = ?1 AND deleted_at IS NULL AND is_active = 1",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(DashboardSummary {
        total_balance_minor,
        monthly_income_minor,
        monthly_expense_minor,
        recent_transactions_count,
        active_habits_count,
        active_goals_count,
    })
}
