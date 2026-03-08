// Investments: inv_assets, inv_holdings, inv_prices. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEVICE_ID: &str = "desktop";

fn pending(conn: &rusqlite::Connection, table: &str, op: &str, row_id: &str, row_data: &str) -> Result<(), String> {
    db::write_pending_change(conn, table, op, row_id, row_data, DEVICE_ID)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvAsset {
    pub id: String,
    pub user_id: String,
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub isin: Option<String>,
    pub exchange: Option<String>,
    pub fund_house: Option<String>,
    pub asset_source: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn inv_list_assets(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<InvAsset>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, symbol, name, asset_type, isin, exchange, fund_house, asset_source, created_at, updated_at FROM inv_assets WHERE user_id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(InvAsset {
            id: r.get(0)?,
            user_id: r.get(1)?,
            symbol: r.get(2)?,
            name: r.get(3)?,
            asset_type: r.get(4)?,
            isin: r.get(5)?,
            exchange: r.get(6)?,
            fund_house: r.get(7)?,
            asset_source: r.get(8)?,
            created_at: r.get(9)?,
            updated_at: r.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn inv_create_asset(
    user_id: String,
    symbol: String,
    name: String,
    asset_type: String,
    isin: Option<String>,
    exchange: Option<String>,
    fund_house: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<InvAsset, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("ast");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO inv_assets (id, user_id, symbol, name, asset_type, isin, exchange, fund_house, asset_source, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'manual', ?9, ?9, NULL)",
        params![id, user_id, symbol, name, asset_type, isin, exchange, fund_house, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"symbol":symbol,"name":name,"asset_type":asset_type,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "inv_assets", "INSERT", &id, &row_json.to_string())?;
    Ok(InvAsset {
        id: id.clone(),
        user_id,
        symbol,
        name,
        asset_type,
        isin,
        exchange,
        fund_house,
        asset_source: "manual".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn inv_soft_delete_asset(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE inv_assets SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "inv_assets", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvHolding {
    pub id: String,
    pub user_id: String,
    pub asset_id: String,
    pub quantity_str: String,
    pub avg_cost_minor: i64,
    pub total_invested_minor: i64,
    pub folio_number: Option<String>,
    pub last_imported_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn inv_list_holdings(user_id: String, state: State<'_, db::DbState>) -> Result<Vec<InvHolding>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, asset_id, quantity_str, avg_cost_minor, total_invested_minor, folio_number, last_imported_at, created_at, updated_at FROM inv_holdings WHERE user_id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], |r| {
        Ok(InvHolding {
            id: r.get(0)?,
            user_id: r.get(1)?,
            asset_id: r.get(2)?,
            quantity_str: r.get(3)?,
            avg_cost_minor: r.get(4)?,
            total_invested_minor: r.get(5)?,
            folio_number: r.get(6)?,
            last_imported_at: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn inv_create_holding(
    user_id: String,
    asset_id: String,
    quantity_str: String,
    avg_cost_minor: i64,
    total_invested_minor: i64,
    folio_number: Option<String>,
    state: State<'_, db::DbState>,
) -> Result<InvHolding, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("hld");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO inv_holdings (id, user_id, asset_id, quantity_str, avg_cost_minor, total_invested_minor, folio_number, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, NULL)",
        params![id, user_id, asset_id, quantity_str, avg_cost_minor, total_invested_minor, folio_number, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"user_id":user_id,"asset_id":asset_id,"quantity_str":quantity_str,"avg_cost_minor":avg_cost_minor,"total_invested_minor":total_invested_minor,"created_at":now,"updated_at":now,"deleted_at":null});
    pending(&conn, "inv_holdings", "INSERT", &id, &row_json.to_string())?;
    Ok(InvHolding {
        id: id.clone(),
        user_id,
        asset_id,
        quantity_str,
        avg_cost_minor,
        total_invested_minor,
        folio_number,
        last_imported_at: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn inv_soft_delete_holding(id: String, state: State<'_, db::DbState>) -> Result<(), String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    conn.execute("UPDATE inv_holdings SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":id,"deleted_at":now});
    pending(&conn, "inv_holdings", "DELETE", &id, &row_json.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvPrice {
    pub id: String,
    pub asset_id: String,
    pub price_minor: i64,
    pub day_change_minor: i64,
    pub day_change_percent_bp: i32,
    pub as_of: String,
    pub source: String,
}

#[tauri::command]
pub fn inv_list_prices(asset_id: String, state: State<'_, db::DbState>) -> Result<Vec<InvPrice>, String> {
    let conn = db::open(&state)?;
    let mut stmt = conn.prepare(
        "SELECT id, asset_id, price_minor, day_change_minor, day_change_percent_bp, as_of, source FROM inv_prices WHERE asset_id = ?1 ORDER BY as_of DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![asset_id], |r| {
        Ok(InvPrice {
            id: r.get(0)?,
            asset_id: r.get(1)?,
            price_minor: r.get(2)?,
            day_change_minor: r.get(3)?,
            day_change_percent_bp: r.get(4)?,
            as_of: r.get(5)?,
            source: r.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn inv_upsert_price(
    asset_id: String,
    price_minor: i64,
    day_change_minor: i64,
    day_change_percent_bp: i32,
    as_of: String,
    state: State<'_, db::DbState>,
) -> Result<InvPrice, String> {
    let conn = db::open(&state)?;
    let id = db::new_id("prc");
    let source = "manual".to_string();
    conn.execute(
        "INSERT INTO inv_prices (id, asset_id, price_minor, day_change_minor, day_change_percent_bp, as_of, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, asset_id, price_minor, day_change_minor, day_change_percent_bp, as_of, source],
    ).map_err(|e| e.to_string())?;
    // inv_prices has no deleted_at and is typically not synced per row (prices are volatile). ARCHITECTURE doesn't list inv_prices in "synced tables" explicitly; Section 3 says "ALL tables synced via changelog EXCEPT: app_logs, pending_changes, conflicts_pending, sync_cursors". So we do write pending_changes for inv_prices.
    let row_json = serde_json::json!({"id":id,"asset_id":asset_id,"price_minor":price_minor,"as_of":as_of});
    pending(&conn, "inv_prices", "INSERT", &id, &row_json.to_string())?;
    Ok(InvPrice {
        id,
        asset_id,
        price_minor,
        day_change_minor,
        day_change_percent_bp,
        as_of,
        source,
    })
}
