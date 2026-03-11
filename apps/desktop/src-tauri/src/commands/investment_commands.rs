// Investments: inv_assets, inv_holdings, inv_prices, Groww import. Every write → pending_changes.

use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use base64::Engine as _;
use std::io::Cursor;

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

// ---------- Groww Import ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrowwMFPreviewRow {
    pub scheme_name: String,
    pub isin: Option<String>,
    pub fund_house: Option<String>,
    pub units: String,
    pub avg_cost_minor: i64,
    pub total_invested_minor: i64,
    pub folio_number: Option<String>,
    pub imported: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrowwStockPreviewRow {
    pub symbol: String,
    pub name: String,
    pub isin: Option<String>,
    pub quantity: String,
    pub avg_price_minor: i64,
    pub total_invested_minor: i64,
    pub imported: bool,
}

fn parse_f64_minor(s: &str) -> i64 {
    let clean: String = s.chars().filter(|c| c.is_ascii_digit() || *c == '.').collect();
    if let Ok(v) = clean.parse::<f64>() { (v * 100.0).round() as i64 } else { 0 }
}

fn read_xlsx_first_sheet(bytes: &[u8]) -> Vec<Vec<String>> {
    use calamine::{Reader, open_workbook_from_rs, Xlsx};
    let cursor = Cursor::new(bytes);
    let mut wb: Xlsx<_> = match open_workbook_from_rs(cursor) { Ok(w) => w, Err(_) => return vec![] };
    let sheet = wb.sheet_names().first().cloned().unwrap_or_default();
    let range = match wb.worksheet_range(&sheet) { Ok(r) => r, Err(_) => return vec![] };
    range.rows().map(|row| {
        row.iter().map(|c| match c {
            calamine::Data::String(s) => s.trim().to_string(),
            calamine::Data::Float(f) => f.to_string(),
            calamine::Data::Int(i) => i.to_string(),
            _ => String::new(),
        }).collect()
    }).collect()
}

fn col_by_name(headers: &[String], candidates: &[&str]) -> Option<usize> {
    for c in candidates {
        let c_lower = c.to_lowercase();
        if let Some(i) = headers.iter().position(|h| h.to_lowercase().contains(&c_lower)) {
            return Some(i);
        }
    }
    None
}

#[tauri::command]
pub fn import_groww_mf(
    user_id: String,
    file_b64: String,
    state: State<'_, db::DbState>,
) -> Result<Vec<GrowwMFPreviewRow>, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_b64)
        .map_err(|e| format!("Base64 decode: {}", e))?;
    let sheet = read_xlsx_first_sheet(&bytes);
    if sheet.is_empty() { return Ok(vec![]); }
    let headers = &sheet[0];
    let scheme_col = col_by_name(headers, &["scheme", "fund name", "scheme name"]);
    let isin_col = col_by_name(headers, &["isin"]);
    let fund_house_col = col_by_name(headers, &["amc", "fund house", "amcname"]);
    let units_col = col_by_name(headers, &["units", "quantity", "allotted units"]);
    let avg_nav_col = col_by_name(headers, &["avg nav", "average nav", "avg cost", "purchase nav"]);
    let invested_col = col_by_name(headers, &["invested", "total invested", "cost value", "amount invested"]);
    let folio_col = col_by_name(headers, &["folio"]);

    let conn = db::open(&state)?;
    let now = db::now_iso();
    let mut preview = Vec::new();

    for row in sheet.iter().skip(1) {
        let get = |idx: Option<usize>| idx.and_then(|i| row.get(i)).map(|s| s.as_str()).unwrap_or("");
        let scheme_name = get(scheme_col).to_string();
        if scheme_name.is_empty() { continue; }
        let isin = isin_col.and_then(|i| row.get(i)).filter(|s| !s.is_empty()).cloned();
        let fund_house = fund_house_col.and_then(|i| row.get(i)).filter(|s| !s.is_empty()).cloned();
        let units = get(units_col).to_string();
        let avg_cost_minor = parse_f64_minor(get(avg_nav_col));
        let total_invested_minor = parse_f64_minor(get(invested_col));
        let folio_number = folio_col.and_then(|i| row.get(i)).filter(|s| !s.is_empty()).cloned();

        let asset_id = db::new_id("ast");
        conn.execute(
            "INSERT OR IGNORE INTO inv_assets (id, user_id, symbol, name, asset_type, isin, fund_house, asset_source, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, 'mutual_fund', ?5, ?6, 'groww', ?7, ?7, NULL)",
            params![asset_id, user_id, scheme_name, scheme_name, isin, fund_house, now],
        ).map_err(|e| e.to_string())?;
        let actual_asset_id: String = conn.query_row(
            "SELECT id FROM inv_assets WHERE user_id = ?1 AND symbol = ?2 AND deleted_at IS NULL LIMIT 1",
            params![user_id, scheme_name],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;

        let holding_id = db::new_id("hld");
        conn.execute(
            "INSERT INTO inv_holdings (id, user_id, asset_id, quantity_str, avg_cost_minor, total_invested_minor, folio_number, last_imported_at, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8, NULL)",
            params![holding_id, user_id, actual_asset_id, units, avg_cost_minor, total_invested_minor, folio_number, now],
        ).map_err(|e| e.to_string())?;
        let h_json = serde_json::json!({"id":holding_id,"user_id":user_id,"asset_id":actual_asset_id,"quantity_str":units,"avg_cost_minor":avg_cost_minor,"total_invested_minor":total_invested_minor,"created_at":now,"updated_at":now,"deleted_at":null});
        pending(&conn, "inv_holdings", "INSERT", &holding_id, &h_json.to_string())?;

        preview.push(GrowwMFPreviewRow { scheme_name, isin, fund_house, units, avg_cost_minor, total_invested_minor, folio_number, imported: true });
    }
    Ok(preview)
}

#[tauri::command]
pub fn import_groww_stocks(
    user_id: String,
    file_b64: String,
    state: State<'_, db::DbState>,
) -> Result<Vec<GrowwStockPreviewRow>, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_b64)
        .map_err(|e| format!("Base64 decode: {}", e))?;
    let sheet = read_xlsx_first_sheet(&bytes);
    if sheet.is_empty() { return Ok(vec![]); }
    let headers = &sheet[0];
    let symbol_col = col_by_name(headers, &["symbol", "trading symbol", "scrip"]);
    let name_col = col_by_name(headers, &["company", "name", "scrip name"]);
    let isin_col = col_by_name(headers, &["isin"]);
    let qty_col = col_by_name(headers, &["quantity", "qty", "shares"]);
    let avg_col = col_by_name(headers, &["avg price", "average price", "avg cost", "buy avg"]);
    let invested_col = col_by_name(headers, &["invested", "total invested", "buy value"]);

    let conn = db::open(&state)?;
    let now = db::now_iso();
    let mut preview = Vec::new();

    for row in sheet.iter().skip(1) {
        let get = |idx: Option<usize>| idx.and_then(|i| row.get(i)).map(|s| s.as_str()).unwrap_or("");
        let symbol = get(symbol_col).to_string();
        if symbol.is_empty() { continue; }
        let name = get(name_col).to_string();
        let display_name = if name.is_empty() { symbol.clone() } else { name.clone() };
        let isin = isin_col.and_then(|i| row.get(i)).filter(|s| !s.is_empty()).cloned();
        let quantity = get(qty_col).to_string();
        let avg_price_minor = parse_f64_minor(get(avg_col));
        let total_invested_minor = parse_f64_minor(get(invested_col));

        let asset_id = db::new_id("ast");
        conn.execute(
            "INSERT OR IGNORE INTO inv_assets (id, user_id, symbol, name, asset_type, isin, exchange, asset_source, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, 'stock', ?5, 'NSE', 'groww', ?6, ?6, NULL)",
            params![asset_id, user_id, symbol, display_name, isin, now],
        ).map_err(|e| e.to_string())?;
        let actual_asset_id: String = conn.query_row(
            "SELECT id FROM inv_assets WHERE user_id = ?1 AND symbol = ?2 AND deleted_at IS NULL LIMIT 1",
            params![user_id, symbol],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;

        let holding_id = db::new_id("hld");
        conn.execute(
            "INSERT INTO inv_holdings (id, user_id, asset_id, quantity_str, avg_cost_minor, total_invested_minor, folio_number, last_imported_at, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?7, ?7, NULL)",
            params![holding_id, user_id, actual_asset_id, quantity, avg_price_minor, total_invested_minor, now],
        ).map_err(|e| e.to_string())?;
        let h_json = serde_json::json!({"id":holding_id,"user_id":user_id,"asset_id":actual_asset_id,"quantity_str":quantity,"avg_cost_minor":avg_price_minor,"total_invested_minor":total_invested_minor,"created_at":now,"updated_at":now,"deleted_at":null});
        pending(&conn, "inv_holdings", "INSERT", &holding_id, &h_json.to_string())?;

        preview.push(GrowwStockPreviewRow { symbol, name: display_name, isin, quantity, avg_price_minor, total_invested_minor, imported: true });
    }
    Ok(preview)
}
