// Finance: accounts, categories, transactions, budgets, debts, subscriptions. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

// ---------- Finance Accounts ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceAccount {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub account_type: String,
    pub balance_minor: i64,
    pub currency: String,
    pub is_primary: i32,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_accounts(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<FinanceAccount>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, name, account_type, balance_minor, currency, is_primary, is_active, created_at, updated_at FROM finance_accounts WHERE user_id = ?1 AND deleted_at IS NULL ORDER BY is_primary DESC, name"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(FinanceAccount {
            id: r.get(0)?,
            user_id: r.get(1)?,
            name: r.get(2)?,
            account_type: r.get(3)?,
            balance_minor: r.get(4)?,
            currency: r.get(5)?,
            is_primary: r.get(6)?,
            is_active: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_account(
    user_id: String,
    name: String,
    account_type: String,
    opening_balance_minor: Option<i64>,
    state: State<'_, db::DbState>,
) -> Result<FinanceAccount, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("acc");
    let now = db::now_iso();
    let balance = opening_balance_minor.unwrap_or(0);
    conn.execute(
        "INSERT INTO finance_accounts (id, user_id, name, account_type, balance_minor, currency, is_primary, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, 'INR', 0, 1, ?6, ?6, NULL)",
        params![id, user_id, name, account_type, balance, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"name":name,"account_type":account_type,"balance_minor":balance,"currency":"INR","is_primary":0,"is_active":1,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "finance_accounts", "INSERT", &id, &row_json.to_string())?;
    Ok(FinanceAccount {
        id: id.clone(),
        user_id,
        name,
        account_type,
        balance_minor: balance,
        currency: "INR".to_string(),
        is_primary: 0,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_update_account(
    id: String,
    name: Option<String>,
    is_primary: Option<i32>,
    is_active: Option<i32>,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    if let Some(n) = name {
        conn.execute("UPDATE finance_accounts SET name = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL", params![n, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(p) = is_primary {
        conn.execute("UPDATE finance_accounts SET is_primary = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL", params![p, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(a) = is_active {
        conn.execute("UPDATE finance_accounts SET is_active = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL", params![a, now, id]).map_err(|e| e.to_string())?;
    }
    let _ = conn.query_row("SELECT id FROM finance_accounts WHERE id = ?1", params![id], |r| r.get::<_, String>(0)).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"updated_at":now});
    pending(&conn, "finance_accounts", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_account(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE finance_accounts SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "finance_accounts", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

// ---------- Categories ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub type_: String,
    pub color: String,
    pub icon: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_categories(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Category>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, name, type, color, icon, parent_id, sort_order, is_active, created_at, updated_at FROM categories WHERE (user_id = ?1 OR user_id IS NULL) AND deleted_at IS NULL ORDER BY type, sort_order, name"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Category {
            id: r.get(0)?,
            user_id: r.get(1)?,
            name: r.get(2)?,
            type_: r.get(3)?,
            color: r.get(4)?,
            icon: r.get(5)?,
            parent_id: r.get(6)?,
            sort_order: r.get(7)?,
            is_active: r.get(8)?,
            created_at: r.get(9)?,
            updated_at: r.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_category(
    user_id: String,
    name: String,
    type_: String,
    color: Option<String>,
    icon: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Category, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("cat");
    let now = db::now_iso();
    let color = color.unwrap_or_else(|| "#5B6CF9".to_string());
    let icon = icon.unwrap_or_else(|| "circle".to_string());
    conn.execute(
        "INSERT INTO categories (id, user_id, name, type, color, icon, parent_id, sort_order, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, 0, 1, ?7, ?7, NULL)",
        params![id, user_id, name, type_, color, icon, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"name":name,"type":type_,"color":color,"icon":icon,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "categories", "INSERT", &id, &row_json.to_string())?;
    Ok(Category {
        id: id.clone(),
        user_id,
        name,
        type_,
        color,
        icon,
        parent_id: None,
        sort_order: 0,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_category(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE categories SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "categories", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

// ---------- Transactions ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceTransaction {
    pub id: String,
    pub user_id: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub type_: String,
    pub amount_minor: i64,
    pub merchant: Option<String>,
    pub note: Option<String>,
    pub txn_date: String,
    pub is_recurring: i32,
    pub import_job_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_transactions(
    user_id: String,
    account_id: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Vec<FinanceTransaction>, String> {
    let conn = db::open(&state)?;
    let sql = "SELECT id, user_id, account_id, category_id, type, amount_minor, merchant, note, txn_date, is_recurring, import_job_id, created_at, updated_at FROM finance_transactions WHERE user_id = ?1 AND deleted_at IS NULL AND (?2 IS NULL OR account_id = ?2) AND (?3 IS NULL OR txn_date >= ?3) AND (?4 IS NULL OR txn_date <= ?4) ORDER BY txn_date DESC, created_at DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id, account_id, from_date, to_date], |r| {
        Ok(FinanceTransaction {
            id: r.get(0)?,
            user_id: r.get(1)?,
            account_id: r.get(2)?,
            category_id: r.get(3)?,
            type_: r.get(4)?,
            amount_minor: r.get(5)?,
            merchant: r.get(6)?,
            note: r.get(7)?,
            txn_date: r.get(8)?,
            is_recurring: r.get(9)?,
            import_job_id: r.get(10)?,
            created_at: r.get(11)?,
            updated_at: r.get(12)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_transaction(
    user_id: String,
    account_id: String,
    category_id: Option<String>,
    type_: String,
    amount_minor: i64,
    merchant: Option<String>,
    note: Option<String>,
    txn_date: String,
    state: State<'_, db::DbState>,
) -> Result<FinanceTransaction, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("txn");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO finance_transactions (id, user_id, account_id, category_id, type, amount_minor, merchant, note, txn_date, is_recurring, import_job_id, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, NULL, ?10, ?10, NULL)",
        params![id, user_id, account_id, category_id, type_, amount_minor, merchant, note, txn_date, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"account_id":account_id,"category_id":category_id,"type":type_,"amount_minor":amount_minor,"merchant":merchant,"note":note,"txn_date":txn_date,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "finance_transactions", "INSERT", &id, &row_json.to_string())?;
    Ok(FinanceTransaction {
        id: id.clone(),
        user_id,
        account_id,
        category_id,
        type_,
        amount_minor,
        merchant,
        note,
        txn_date,
        is_recurring: 0,
        import_job_id: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_update_transaction(
    id: String,
    category_id: Option<String>,
    merchant: Option<String>,
    note: Option<String>,
    txn_date: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    let (cat, mer, nte, dt): (Option<String>, Option<String>, Option<String>, String) = conn.query_row(
        "SELECT category_id, merchant, note, txn_date FROM finance_transactions WHERE id = ?1 AND deleted_at IS NULL", params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
    ).map_err(|e| format!("Transaction not found: {}", e))?;
    let cat = category_id.or(cat);
    let mer = merchant.or(mer);
    let nte = note.or(nte);
    let dt = txn_date.unwrap_or(dt);
    conn.execute(
        "UPDATE finance_transactions SET category_id = ?1, merchant = ?2, note = ?3, txn_date = ?4, updated_at = ?5 WHERE id = ?6 AND deleted_at IS NULL",
        params![cat, mer, nte, dt, now, id],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"updated_at":now});
    pending(&conn, "finance_transactions", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_transaction(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE finance_transactions SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "finance_transactions", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

// ---------- Budgets ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Budget {
    pub id: String,
    pub user_id: String,
    pub category_id: String,
    pub limit_minor: i64,
    pub period: String,
    pub alert_threshold_pct: i32,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_budgets(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Budget>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, category_id, limit_minor, period, alert_threshold_pct, is_active, created_at, updated_at FROM budgets WHERE user_id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Budget {
            id: r.get(0)?,
            user_id: r.get(1)?,
            category_id: r.get(2)?,
            limit_minor: r.get(3)?,
            period: r.get(4)?,
            alert_threshold_pct: r.get(5)?,
            is_active: r.get(6)?,
            created_at: r.get(7)?,
            updated_at: r.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_budget(
    user_id: String,
    category_id: String,
    limit_minor: i64,
    period: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Budget, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("bud");
    let now = db::now_iso();
    let period = period.unwrap_or_else(|| "monthly".to_string());
    conn.execute(
        "INSERT INTO budgets (id, user_id, category_id, limit_minor, period, alert_threshold_pct, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, 80, 1, ?6, ?6, NULL)",
        params![id, user_id, category_id, limit_minor, period, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"category_id":category_id,"limit_minor":limit_minor,"period":period,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "budgets", "INSERT", &id, &row_json.to_string())?;
    Ok(Budget {
        id: id.clone(),
        user_id,
        category_id,
        limit_minor,
        period,
        alert_threshold_pct: 80,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_update_budget(
    id: String,
    limit_minor: i64,
    alert_threshold_pct: i32,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute(
        "UPDATE budgets SET limit_minor = ?1, alert_threshold_pct = ?2, updated_at = ?3 WHERE id = ?4 AND deleted_at IS NULL",
        params![limit_minor, alert_threshold_pct, now, id],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"limit_minor":limit_minor,"alert_threshold_pct":alert_threshold_pct,"updated_at":now});
    pending(&conn, "budgets", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_budget(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE budgets SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "budgets", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

// ---------- Debts ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Debt {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub debt_type: String,
    pub principal_minor: i64,
    pub current_balance_minor: i64,
    pub interest_rate_bp: i32,
    pub min_payment_minor: i64,
    pub due_day: Option<i32>,
    pub start_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_debts(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Debt>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, name, debt_type, principal_minor, current_balance_minor, interest_rate_bp, min_payment_minor, due_day, start_date, created_at, updated_at FROM debts WHERE user_id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Debt {
            id: r.get(0)?,
            user_id: r.get(1)?,
            name: r.get(2)?,
            debt_type: r.get(3)?,
            principal_minor: r.get(4)?,
            current_balance_minor: r.get(5)?,
            interest_rate_bp: r.get(6)?,
            min_payment_minor: r.get(7)?,
            due_day: r.get(8)?,
            start_date: r.get(9)?,
            created_at: r.get(10)?,
            updated_at: r.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_debt(
    user_id: String,
    name: String,
    debt_type: String,
    principal_minor: i64,
    current_balance_minor: i64,
    interest_rate_bp: Option<i32>,
    min_payment_minor: Option<i64>,
    due_day: Option<i32>,
    start_date: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Debt, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("dbt");
    let now = db::now_iso();
    let ir = interest_rate_bp.unwrap_or(0);
    let min_p = min_payment_minor.unwrap_or(0);
    conn.execute(
        "INSERT INTO debts (id, user_id, name, debt_type, principal_minor, current_balance_minor, interest_rate_bp, min_payment_minor, due_day, start_date, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, NULL)",
        params![id, user_id, name, debt_type, principal_minor, current_balance_minor, ir, min_p, due_day, start_date, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"name":name,"debt_type":debt_type,"principal_minor":principal_minor,"current_balance_minor":current_balance_minor,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "debts", "INSERT", &id, &row_json.to_string())?;
    Ok(Debt {
        id: id.clone(),
        user_id,
        name,
        debt_type,
        principal_minor,
        current_balance_minor,
        interest_rate_bp: ir,
        min_payment_minor: min_p,
        due_day,
        start_date,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_update_debt(
    id: String,
    name: String,
    current_balance_minor: i64,
    interest_rate_bp: i32,
    min_payment_minor: i64,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute(
        "UPDATE debts SET name = ?1, current_balance_minor = ?2, interest_rate_bp = ?3, min_payment_minor = ?4, updated_at = ?5 WHERE id = ?6 AND deleted_at IS NULL",
        params![name, current_balance_minor, interest_rate_bp, min_payment_minor, now, id],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"name":name,"current_balance_minor":current_balance_minor,"interest_rate_bp":interest_rate_bp,"min_payment_minor":min_payment_minor,"updated_at":now});
    pending(&conn, "debts", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_debt(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE debts SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "debts", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

// ---------- Subscriptions ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub amount_minor: i64,
    pub billing_cycle: String,
    pub next_renewal_date: String,
    pub category: Option<String>,
    pub notes: Option<String>,
    pub auto_renew: i32,
    pub reminder_days_before: i32,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_list_subscriptions(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<Subscription>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, name, amount_minor, billing_cycle, next_renewal_date, category, notes, auto_renew, reminder_days_before, is_active, created_at, updated_at FROM subscriptions WHERE user_id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(Subscription {
            id: r.get(0)?,
            user_id: r.get(1)?,
            name: r.get(2)?,
            amount_minor: r.get(3)?,
            billing_cycle: r.get(4)?,
            next_renewal_date: r.get(5)?,
            category: r.get(6)?,
            notes: r.get(7)?,
            auto_renew: r.get(8)?,
            reminder_days_before: r.get(9)?,
            is_active: r.get(10)?,
            created_at: r.get(11)?,
            updated_at: r.get(12)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_create_subscription(
    user_id: String,
    name: String,
    amount_minor: i64,
    billing_cycle: String,
    next_renewal_date: String,
    category: Option<String>,
    notes: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<Subscription, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("sub");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO subscriptions (id, user_id, name, amount_minor, billing_cycle, next_renewal_date, category, notes, auto_renew, reminder_days_before, is_active, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, 3, 1, ?9, ?9, NULL)",
        params![id, user_id, name, amount_minor, billing_cycle, next_renewal_date, category, notes, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"name":name,"amount_minor":amount_minor,"billing_cycle":billing_cycle,"next_renewal_date":next_renewal_date,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "subscriptions", "INSERT", &id, &row_json.to_string())?;
    Ok(Subscription {
        id: id.clone(),
        user_id,
        name,
        amount_minor,
        billing_cycle,
        next_renewal_date,
        category,
        notes,
        auto_renew: 1,
        reminder_days_before: 3,
        is_active: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_update_subscription(
    id: String,
    name: String,
    amount_minor: i64,
    billing_cycle: String,
    next_renewal_date: String,
    reminder_days_before: i32,
    state: State<'_, db::DbState>,
) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute(
        "UPDATE subscriptions SET name = ?1, amount_minor = ?2, billing_cycle = ?3, next_renewal_date = ?4, reminder_days_before = ?5, updated_at = ?6 WHERE id = ?7 AND deleted_at IS NULL",
        params![name, amount_minor, billing_cycle, next_renewal_date, reminder_days_before, now, id],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"name":name,"amount_minor":amount_minor,"billing_cycle":billing_cycle,"next_renewal_date":next_renewal_date,"reminder_days_before":reminder_days_before,"updated_at":now});
    pending(&conn, "subscriptions", "UPDATE", &id, &row_json.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn finance_soft_delete_subscription(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE subscriptions SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "subscriptions", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}
