// Bank import: import_jobs, merchant_rules, parse_bank_statement, confirm_bank_import.
// Every write to synced tables → pending_changes.

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

// ---------- Bank Statement Parsing ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedBankRow {
    pub row_index: usize,
    pub txn_date: String,
    pub description: String,
    pub amount_minor: i64,
    pub txn_type: String, // "income" or "expense"
    pub status: String,   // "new", "duplicate", "uncategorized"
    pub category_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedStatement {
    pub job_id: String,
    pub bank_name: Option<String>,
    pub row_count: usize,
    pub rows: Vec<ParsedBankRow>,
    pub needs_mapping: bool,
    pub detected_columns: Vec<String>,
}

fn detect_bank_and_parse_csv(
    content: &str,
    existing_keys: &std::collections::HashSet<String>,
) -> (Option<String>, Vec<ParsedBankRow>) {
    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(content.as_bytes());

    let headers: Vec<String> = rdr.headers()
        .map(|h| h.iter().map(|s| s.to_lowercase()).collect())
        .unwrap_or_default();

    let bank = detect_bank_from_headers(&headers);
    let rows = parse_csv_rows(&mut rdr, &headers, &bank, existing_keys);
    (bank, rows)
}

fn detect_bank_from_headers(headers: &[String]) -> Option<String> {
    let h: Vec<&str> = headers.iter().map(|s| s.as_str()).collect();
    if h.iter().any(|s| *s == "narration") && h.iter().any(|s| *s == "debit amount") {
        Some("HDFC".to_string())
    } else if h.iter().any(|s| *s == "txn date") && h.iter().any(|s| *s == "debit") {
        Some("SBI".to_string())
    } else if h.iter().any(|s| *s == "transaction remarks") {
        Some("ICICI".to_string())
    } else if h.iter().any(|s| *s == "particulars") && h.iter().any(|s| *s == "dr") {
        Some("Axis".to_string())
    } else if h.iter().any(|s| *s == "description") && h.iter().any(|s| *s == "debit") {
        Some("SBI".to_string())
    } else {
        None
    }
}

fn col_idx(headers: &[String], names: &[&str]) -> Option<usize> {
    for name in names {
        if let Some(i) = headers.iter().position(|h| h == name) {
            return Some(i);
        }
    }
    None
}

fn parse_amount(s: &str) -> i64 {
    let clean: String = s.chars().filter(|c| c.is_ascii_digit() || *c == '.').collect();
    if let Ok(v) = clean.parse::<f64>() {
        (v * 100.0).round() as i64
    } else {
        0
    }
}

fn parse_csv_rows(
    rdr: &mut csv::Reader<&[u8]>,
    headers: &[String],
    bank: &Option<String>,
    existing_keys: &std::collections::HashSet<String>,
) -> Vec<ParsedBankRow> {
    let mut rows = Vec::new();
    let (date_col, desc_col, debit_col, credit_col) = match bank.as_deref() {
        Some("HDFC") => (
            col_idx(headers, &["date", "value date"]),
            col_idx(headers, &["narration", "description"]),
            col_idx(headers, &["debit amount", "withdrawal amt."]),
            col_idx(headers, &["credit amount", "deposit amt."]),
        ),
        Some("ICICI") => (
            col_idx(headers, &["transaction date", "date"]),
            col_idx(headers, &["transaction remarks", "description"]),
            col_idx(headers, &["withdrawal amount (inr)", "debit"]),
            col_idx(headers, &["deposit amount (inr)", "credit"]),
        ),
        Some("Axis") => (
            col_idx(headers, &["tran date", "date"]),
            col_idx(headers, &["particulars", "description"]),
            col_idx(headers, &["dr", "debit"]),
            col_idx(headers, &["cr", "credit"]),
        ),
        _ => (
            col_idx(headers, &["date", "txn date", "transaction date"]),
            col_idx(headers, &["description", "narration", "particulars"]),
            col_idx(headers, &["debit", "dr", "withdrawal"]),
            col_idx(headers, &["credit", "cr", "deposit"]),
        ),
    };

    for (i, record) in rdr.records().enumerate() {
        let Ok(record) = record else { continue };
        let fields: Vec<&str> = record.iter().collect();
        let get = |idx: Option<usize>| -> &str {
            idx.and_then(|i| fields.get(i).copied()).unwrap_or("")
        };
        let date_raw = get(date_col).trim().to_string();
        let desc = get(desc_col).trim().to_string();
        if date_raw.is_empty() && desc.is_empty() { continue; }
        let debit = parse_amount(get(debit_col));
        let credit = parse_amount(get(credit_col));
        let (amount_minor, txn_type) = if debit > 0 {
            (debit, "expense".to_string())
        } else if credit > 0 {
            (credit, "income".to_string())
        } else {
            continue;
        };
        let dedup_key = format!("{}:{}:{}", date_raw, desc, amount_minor);
        let status = if existing_keys.contains(&dedup_key) {
            "duplicate"
        } else if desc.is_empty() {
            "uncategorized"
        } else {
            "new"
        };
        rows.push(ParsedBankRow {
            row_index: i,
            txn_date: date_raw,
            description: desc,
            amount_minor,
            txn_type,
            status: status.to_string(),
            category_id: None,
        });
    }
    rows
}

fn parse_xlsx_rows(
    bytes: &[u8],
    existing_keys: &std::collections::HashSet<String>,
) -> (Option<String>, Vec<ParsedBankRow>) {
    use calamine::{Reader, open_workbook_from_rs, Xlsx};
    let cursor = Cursor::new(bytes);
    let mut workbook: Xlsx<_> = match open_workbook_from_rs(cursor) {
        Ok(wb) => wb,
        Err(_) => return (None, vec![]),
    };
    let sheet_name = workbook.sheet_names().first().cloned().unwrap_or_default();
    let range = match workbook.worksheet_range(&sheet_name) {
        Ok(r) => r,
        Err(_) => return (None, vec![]),
    };
    let mut rows_iter = range.rows();
    let header_row: Vec<String> = match rows_iter.next() {
        Some(row) => row.iter().map(|c| match c {
            calamine::Data::String(s) => s.to_lowercase(),
            _ => String::new(),
        }).collect(),
        None => return (None, vec![]),
    };
    let bank = detect_bank_from_headers(&header_row);
    let (date_col, desc_col, debit_col, credit_col) = (
        col_idx(&header_row, &["date", "txn date", "transaction date", "tran date", "value date"]),
        col_idx(&header_row, &["description", "narration", "transaction remarks", "particulars"]),
        col_idx(&header_row, &["debit", "dr", "debit amount", "withdrawal amount (inr)", "withdrawal amt."]),
        col_idx(&header_row, &["credit", "cr", "credit amount", "deposit amount (inr)", "deposit amt."]),
    );
    let mut rows = Vec::new();
    for (i, row) in rows_iter.enumerate() {
        let get_str = |idx: Option<usize>| -> String {
            idx.and_then(|j| row.get(j)).map(|c| match c {
                calamine::Data::String(s) => s.trim().to_string(),
                calamine::Data::Float(f) => f.to_string(),
                _ => String::new(),
            }).unwrap_or_default()
        };
        let date_raw = get_str(date_col);
        let desc = get_str(desc_col);
        if date_raw.is_empty() && desc.is_empty() { continue; }
        let debit = parse_amount(&get_str(debit_col));
        let credit = parse_amount(&get_str(credit_col));
        let (amount_minor, txn_type) = if debit > 0 {
            (debit, "expense".to_string())
        } else if credit > 0 {
            (credit, "income".to_string())
        } else {
            continue;
        };
        let dedup_key = format!("{}:{}:{}", date_raw, desc, amount_minor);
        let status = if existing_keys.contains(&dedup_key) { "duplicate" } else { "new" };
        rows.push(ParsedBankRow {
            row_index: i,
            txn_date: date_raw,
            description: desc,
            amount_minor,
            txn_type,
            status: status.to_string(),
            category_id: None,
        });
    }
    (bank, rows)
}

#[tauri::command]
pub fn parse_bank_statement(
    user_id: String,
    file_name: String,
    file_b64: String,
    state: State<'_, db::DbState>,
) -> Result<ParsedStatement, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_b64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // Build dedup set from existing transactions
    let conn = db::open(&state)?;
    let mut existing_keys = std::collections::HashSet::new();
    {
        let mut stmt = conn.prepare(
            "SELECT txn_date, merchant, amount_minor FROM finance_transactions WHERE user_id = ?1 AND deleted_at IS NULL"
        ).map_err(|e| e.to_string())?;
        let res = stmt.query_map(params![user_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?, r.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;
        for row in res.flatten() {
            let (date, merchant, amt) = row;
            existing_keys.insert(format!("{}:{}:{}", date, merchant.unwrap_or_default(), amt));
        }
    }

    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    let (bank_name, rows) = if ext == "csv" {
        let content = String::from_utf8(bytes).map_err(|e| e.to_string())?;
        detect_bank_and_parse_csv(&content, &existing_keys)
    } else {
        parse_xlsx_rows(&bytes, &existing_keys)
    };

    let row_count = rows.len();
    let needs_mapping = bank_name.is_none();

    // Create import job record
    let job_id = db::new_id("imp");
    let now = db::now_iso();
    conn.execute(
        "INSERT INTO import_jobs (id, user_id, import_source, bank_name, file_name, row_count, status, created_at, updated_at) VALUES (?1, ?2, 'bank_statement', ?3, ?4, ?5, 'preview', ?6, ?6)",
        params![job_id, user_id, bank_name, file_name, row_count as i32, now],
    ).map_err(|e| e.to_string())?;
    let row_json = serde_json::json!({"id":job_id,"user_id":user_id,"import_source":"bank_statement","file_name":file_name,"status":"preview","created_at":now,"updated_at":now});
    pending(&conn, "import_jobs", "INSERT", &job_id, &row_json.to_string())?;

    Ok(ParsedStatement {
        job_id,
        bank_name,
        row_count,
        rows,
        needs_mapping,
        detected_columns: vec![],
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfirmedRow {
    pub row_index: usize,
    pub txn_date: String,
    pub description: String,
    pub amount_minor: i64,
    pub txn_type: String,
    pub category_id: Option<String>,
    pub skip: bool,
}

#[tauri::command]
pub fn confirm_bank_import(
    user_id: String,
    job_id: String,
    account_id: String,
    rows: Vec<ConfirmedRow>,
    state: State<'_, db::DbState>,
) -> Result<usize, String> {
    let conn = db::open(&state)?;
    let now = db::now_iso();
    let mut inserted = 0usize;

    for row in &rows {
        if row.skip { continue; }
        let id = db::new_id("txn");
        conn.execute(
            "INSERT INTO finance_transactions (id, user_id, account_id, category_id, type, amount_minor, merchant, note, txn_date, is_recurring, import_job_id, created_at, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, 0, ?9, ?10, ?10, NULL)",
            params![id, user_id, account_id, row.category_id, row.txn_type, row.amount_minor, row.description, row.txn_date, job_id, now],
        ).map_err(|e| e.to_string())?;
        let row_json = serde_json::json!({"id":id,"user_id":user_id,"account_id":account_id,"category_id":row.category_id,"type":row.txn_type,"amount_minor":row.amount_minor,"merchant":row.description,"txn_date":row.txn_date,"import_job_id":job_id,"created_at":now,"updated_at":now,"deleted_at":null});
        pending(&conn, "finance_transactions", "INSERT", &id, &row_json.to_string())?;
        inserted += 1;
    }

    conn.execute(
        "UPDATE import_jobs SET status = 'completed', row_count = ?1, updated_at = ?2 WHERE id = ?3",
        params![inserted as i32, now, job_id],
    ).map_err(|e| e.to_string())?;
    let upd_json = serde_json::json!({"id":job_id,"status":"completed","row_count":inserted,"updated_at":now});
    pending(&conn, "import_jobs", "UPDATE", &job_id, &upd_json.to_string())?;

    Ok(inserted)
}
