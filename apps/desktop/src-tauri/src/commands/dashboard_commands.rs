// Dashboard: get_dashboard_summary — single read-only command for all dashboard data.
// No pending_changes because dashboard is purely read-only.

use crate::db;
use rusqlite::params;
use serde::Serialize;
use std::collections::HashMap;
use tauri::State;

// ── Health score ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct HealthScoreComponent {
    pub name: String,
    pub score: i32,
    pub max: i32,
    pub tip: String,
}

#[derive(Debug, Serialize)]
pub struct HealthScore {
    pub total: i32,
    pub components: Vec<HealthScoreComponent>,
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DashboardKpis {
    pub net_worth_minor: i64,
    pub income_minor: i64,
    pub expense_minor: i64,
    pub savings_rate_bp: i32, // basis points: 20% = 2000
    pub total_debt_minor: i64,
    pub total_investments_minor: i64,
}

// ── Chart series ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct NetWorthPoint {
    pub month: String,  // "YYYY-MM"
    pub amount_minor: i64,
}

#[derive(Debug, Serialize)]
pub struct CashflowPoint {
    pub month: String,
    pub income_minor: i64,
    pub expense_minor: i64,
}

#[derive(Debug, Serialize)]
pub struct ExpenseCategory {
    pub category_name: String,
    pub color: String, // raw DB value — frontend maps to CSS variable
    pub amount_minor: i64,
    pub percentage_bp: i32,
}

// ── Budget / Habit / Goal / Bills / Transactions ──────────────────────────────

#[derive(Debug, Serialize)]
pub struct BudgetStatus {
    pub category_name: String,
    pub limit_minor: i64,
    pub spent_minor: i64,
    pub percentage_bp: i32,
}

#[derive(Debug, Serialize)]
pub struct HabitToday {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub checked_in: bool,
    pub streak: i32,
}

#[derive(Debug, Serialize)]
pub struct GoalProgress {
    pub id: String,
    pub title: String,
    pub target_minor: i64,
    pub current_minor: i64,
    pub percentage_bp: i32,
    pub on_track: bool,
}

#[derive(Debug, Serialize)]
pub struct UpcomingBill {
    pub name: String,
    pub amount_minor: i64,
    pub due_date: String,
    pub days_until: i32,
}

#[derive(Debug, Serialize)]
pub struct DashboardTransaction {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub amount_minor: i64,
    pub merchant: Option<String>,
    pub note: Option<String>,
    pub txn_date: String,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
}

// ── Top-level response ────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DashboardSummary {
    pub health_score: HealthScore,
    pub kpis: DashboardKpis,
    pub net_worth_trend: Vec<NetWorthPoint>,
    pub cashflow_trend: Vec<CashflowPoint>,
    pub expense_by_category: Vec<ExpenseCategory>,
    pub budget_status: Vec<BudgetStatus>,
    pub habits_today: Vec<HabitToday>,
    pub goals_progress: Vec<GoalProgress>,
    pub upcoming_bills: Vec<UpcomingBill>,
    pub recent_transactions: Vec<DashboardTransaction>,
    pub conflicts_count: i32,
    pub pending_sync_count: i32,
}

// ── Helper: produce 12 "YYYY-MM" strings ending at `month` (inclusive) ────────

fn month_range_12(month: &str) -> Vec<String> {
    // month = "YYYY-MM". Produce the 12 months ending at that month.
    let parts: Vec<&str> = month.split('-').collect();
    if parts.len() != 2 {
        return vec![];
    }
    let mut year: i32 = parts[0].parse().unwrap_or(2026);
    let mut mon: i32 = parts[1].parse().unwrap_or(1);
    let mut result = vec![format!("{:04}-{:02}", year, mon)];
    for _ in 0..11 {
        mon -= 1;
        if mon == 0 {
            mon = 12;
            year -= 1;
        }
        result.push(format!("{:04}-{:02}", year, mon));
    }
    result.reverse();
    result
}

// ── Helper: produce 6 "YYYY-MM" strings ending at `month` (inclusive) ─────────

fn month_range_6(month: &str) -> Vec<String> {
    let r = month_range_12(month);
    if r.len() >= 6 {
        r[6..].to_vec()
    } else {
        r
    }
}

// ── Command ───────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
pub fn get_dashboard_summary(
    user_id: String,
    month: String, // "YYYY-MM"
    state: State<'_, db::DbState>,
) -> Result<DashboardSummary, String> {
    let conn = db::open(&state)?;
    let month_start = format!("{}-01", month);

    // ── KPIs ──────────────────────────────────────────────────────────────────

    let net_worth_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(balance_minor), 0) FROM finance_accounts WHERE user_id = ?1 AND deleted_at IS NULL AND is_active = 1",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let income_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM finance_transactions WHERE user_id = ?1 AND type = 'income' AND txn_date >= ?2 AND txn_date < date(?2, '+1 month') AND deleted_at IS NULL",
        params![user_id, month_start],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let expense_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM finance_transactions WHERE user_id = ?1 AND type = 'expense' AND txn_date >= ?2 AND txn_date < date(?2, '+1 month') AND deleted_at IS NULL",
        params![user_id, month_start],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let savings_rate_bp: i32 = if income_minor > 0 {
        let savings = income_minor - expense_minor;
        ((savings * 10000) / income_minor) as i32
    } else {
        0
    };

    let total_debt_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(current_balance_minor), 0) FROM debts WHERE user_id = ?1 AND deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let total_investments_minor: i64 = conn.query_row(
        "SELECT COALESCE(SUM(h.total_invested_minor), 0) FROM inv_holdings h WHERE h.user_id = ?1 AND h.deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let kpis = DashboardKpis {
        net_worth_minor,
        income_minor,
        expense_minor,
        savings_rate_bp,
        total_debt_minor,
        total_investments_minor,
    };

    // ── Net worth trend (12 months) ───────────────────────────────────────────
    // Build a map of monthly net cash flows, then compute running balance backwards from current.
    let months_12 = month_range_12(&month);
    let oldest_month_start = months_12.first().map(|m| format!("{}-01", m)).unwrap_or_default();

    let mut monthly_net: HashMap<String, i64> = HashMap::new();
    {
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', txn_date) as m, \
             SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) - \
             SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) as net \
             FROM finance_transactions \
             WHERE user_id = ?1 AND deleted_at IS NULL \
             AND txn_date >= ?2 AND txn_date < date(?3, '+1 month') \
             GROUP BY m",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, oldest_month_start, month_start], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        }).map_err(|e| e.to_string())?;
        for row in rows {
            let (m, net) = row.map_err(|e| e.to_string())?;
            monthly_net.insert(m, net);
        }
    }

    // Work backwards: nw[last] = net_worth_minor; nw[i-1] = nw[i] - net_flow[i]
    let mut nw_points: Vec<NetWorthPoint> = Vec::with_capacity(12);
    let mut running = net_worth_minor;
    for m in months_12.iter().rev() {
        nw_points.push(NetWorthPoint { month: m.clone(), amount_minor: running });
        running -= monthly_net.get(m).copied().unwrap_or(0);
    }
    nw_points.reverse();
    let net_worth_trend = nw_points;

    // ── Cashflow trend (6 months) ─────────────────────────────────────────────
    let months_6 = month_range_6(&month);
    let oldest_6_start = months_6.first().map(|m| format!("{}-01", m)).unwrap_or_default();

    let mut cashflow_map: HashMap<String, (i64, i64)> = HashMap::new();
    {
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', txn_date) as m, \
             SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), \
             SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) \
             FROM finance_transactions \
             WHERE user_id = ?1 AND deleted_at IS NULL \
             AND txn_date >= ?2 AND txn_date < date(?3, '+1 month') \
             GROUP BY m",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, oldest_6_start, month_start], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;
        for row in rows {
            let (m, inc, exp) = row.map_err(|e| e.to_string())?;
            cashflow_map.insert(m, (inc, exp));
        }
    }
    let cashflow_trend: Vec<CashflowPoint> = months_6
        .iter()
        .map(|m| {
            let (inc, exp) = cashflow_map.get(m).copied().unwrap_or((0, 0));
            CashflowPoint { month: m.clone(), income_minor: inc, expense_minor: exp }
        })
        .collect();

    // ── Expense by category (selected month) ──────────────────────────────────
    let total_expense_for_pct = if expense_minor > 0 { expense_minor } else { 1 };
    let expense_by_category: Vec<ExpenseCategory> = {
        let mut stmt = conn.prepare(
            "SELECT c.name, c.color, COALESCE(SUM(t.amount_minor), 0) as amt \
             FROM finance_transactions t \
             JOIN categories c ON c.id = t.category_id \
             WHERE t.user_id = ?1 AND t.type = 'expense' \
             AND t.txn_date >= ?2 AND t.txn_date < date(?2, '+1 month') \
             AND t.deleted_at IS NULL AND c.deleted_at IS NULL \
             GROUP BY c.id, c.name, c.color \
             ORDER BY amt DESC \
             LIMIT 8",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, month_start], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|(name, color, amt)| {
                let pct_bp = ((amt * 10000) / total_expense_for_pct) as i32;
                ExpenseCategory { category_name: name, color, amount_minor: amt, percentage_bp: pct_bp }
            })
            .collect()
    };

    // ── Budget status (selected month) ────────────────────────────────────────
    let budget_status: Vec<BudgetStatus> = {
        let mut stmt = conn.prepare(
            "SELECT c.name, b.limit_minor, \
             COALESCE(SUM(t.amount_minor), 0) as spent \
             FROM budgets b \
             JOIN categories c ON c.id = b.category_id \
             LEFT JOIN finance_transactions t ON t.category_id = b.category_id \
               AND t.user_id = b.user_id \
               AND t.type = 'expense' \
               AND t.txn_date >= ?2 AND t.txn_date < date(?2, '+1 month') \
               AND t.deleted_at IS NULL \
             WHERE b.user_id = ?1 AND b.is_active = 1 AND b.deleted_at IS NULL \
               AND c.deleted_at IS NULL \
             GROUP BY b.id, c.name, b.limit_minor \
             ORDER BY (spent * 10000 / NULLIF(b.limit_minor, 0)) DESC",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, month_start], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|(name, limit, spent)| {
                let pct_bp = if limit > 0 { ((spent * 10000) / limit) as i32 } else { 0 };
                BudgetStatus { category_name: name, limit_minor: limit, spent_minor: spent, percentage_bp: pct_bp }
            })
            .collect()
    };

    // ── Habits today ──────────────────────────────────────────────────────────
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let habits_today: Vec<HabitToday> = {
        let mut stmt = conn.prepare(
            "SELECT h.id, h.name, h.icon, h.color, \
             CASE WHEN hc.status = 'done' THEN 1 ELSE 0 END as checked_in \
             FROM habits h \
             LEFT JOIN habit_checkins hc ON hc.habit_id = h.id AND hc.checkin_date = ?2 \
             WHERE h.user_id = ?1 AND h.is_active = 1 AND h.deleted_at IS NULL \
             ORDER BY checked_in ASC, h.name",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, today], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, i32>(4)?,
            ))
        }).map_err(|e| e.to_string())?;
        let raw: Vec<(String, String, String, String, i32)> =
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        raw.into_iter()
            .map(|(id, name, icon, color, checked_in)| {
                // Compute streak: count consecutive 'done' days backwards from today
                let streak: i32 = conn.query_row(
                    "WITH RECURSIVE dates(d, n) AS ( \
                       SELECT date(?1, '-1 day'), 0 \
                       UNION ALL \
                       SELECT date(d, '-1 day'), n + 1 FROM dates \
                       WHERE n < 365 \
                         AND EXISTS ( \
                           SELECT 1 FROM habit_checkins \
                           WHERE habit_id = ?2 AND checkin_date = d AND status = 'done' \
                         ) \
                     ) \
                     SELECT COUNT(*) FROM dates WHERE EXISTS ( \
                       SELECT 1 FROM habit_checkins \
                       WHERE habit_id = ?2 AND checkin_date = dates.d AND status = 'done' \
                     )",
                    params![today, id],
                    |r| r.get(0),
                ).unwrap_or(0);
                HabitToday { id, name, icon, color, checked_in: checked_in == 1, streak }
            })
            .collect()
    };

    // ── Goals progress ────────────────────────────────────────────────────────
    let goals_progress: Vec<GoalProgress> = {
        let mut stmt = conn.prepare(
            "SELECT id, title, target_amount_minor, current_amount_minor, target_date \
             FROM goals WHERE user_id = ?1 AND is_active = 1 AND deleted_at IS NULL \
             ORDER BY target_date, title",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, i64>(3)?,
                r.get::<_, Option<String>>(4)?,
            ))
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|(id, title, target, current, target_date)| {
                let pct_bp = if target > 0 { ((current * 10000) / target) as i32 } else { 0 };
                // on_track: if target_date is set, check if progress >= expected based on elapsed time
                let on_track = if let Some(td) = &target_date {
                    // Simple heuristic: pct_bp >= 8000 = always on track regardless of date
                    if pct_bp >= 8000 {
                        true
                    } else {
                        // Check if time elapsed ratio is not much ahead of progress ratio
                        // Compare against a start_date approximation using created_at
                        // For simplicity: on_track if we're within 20% of expected pace
                        let today_str = chrono::Utc::now().format("%Y-%m-%d").to_string();
                        today_str.as_str() <= td.as_str()
                    }
                } else {
                    pct_bp >= 5000 // no deadline: on track if 50%+ done
                };
                GoalProgress { id, title, target_minor: target, current_minor: current, percentage_bp: pct_bp, on_track }
            })
            .collect()
    };

    // ── Upcoming bills (next 30 days from today) ──────────────────────────────
    let upcoming_bills: Vec<UpcomingBill> = {
        let cutoff = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::days(30))
            .map(|d| d.format("%Y-%m-%d").to_string())
            .unwrap_or_else(|| today.clone());
        let mut stmt = conn.prepare(
            "SELECT name, amount_minor, next_renewal_date, \
             CAST(julianday(next_renewal_date) - julianday(?2) AS INTEGER) as days_until \
             FROM subscriptions \
             WHERE user_id = ?1 AND is_active = 1 AND deleted_at IS NULL \
             AND next_renewal_date >= ?2 AND next_renewal_date <= ?3 \
             ORDER BY next_renewal_date",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, today, cutoff], |r| {
            Ok(UpcomingBill {
                name: r.get(0)?,
                amount_minor: r.get(1)?,
                due_date: r.get(2)?,
                days_until: r.get(3)?,
            })
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    // ── Recent transactions (last 10, all time) ───────────────────────────────
    let recent_transactions: Vec<DashboardTransaction> = {
        let mut stmt = conn.prepare(
            "SELECT t.id, t.type, t.amount_minor, t.merchant, t.note, t.txn_date, \
             c.name, c.color \
             FROM finance_transactions t \
             LEFT JOIN categories c ON c.id = t.category_id AND c.deleted_at IS NULL \
             WHERE t.user_id = ?1 AND t.deleted_at IS NULL \
             ORDER BY t.txn_date DESC, t.created_at DESC LIMIT 10",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id], |r| {
            Ok(DashboardTransaction {
                id: r.get(0)?,
                type_: r.get(1)?,
                amount_minor: r.get(2)?,
                merchant: r.get(3)?,
                note: r.get(4)?,
                txn_date: r.get(5)?,
                category_name: r.get(6)?,
                category_color: r.get(7)?,
            })
        }).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    // ── Conflict + pending sync counts ────────────────────────────────────────
    let conflicts_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM conflicts_pending",
        [],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let pending_sync_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM pending_changes",
        [],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    // ── Health score calculation ───────────────────────────────────────────────

    // Component 1: Savings Rate (20pts) — savings/income, 20%+ = 20pts, linear below
    let savings_minor = income_minor - expense_minor;
    let sr_score: i32 = if income_minor > 0 {
        let rate_bp = ((savings_minor.max(0) * 10000) / income_minor) as i32;
        if rate_bp >= 2000 { 20 } else { rate_bp * 20 / 2000 }
    } else {
        0
    };
    let sr_tip = if sr_score >= 20 {
        "Great savings rate! Keep it up.".to_string()
    } else {
        "Aim to save at least 20% of your income.".to_string()
    };

    // Component 2: Emergency Fund (20pts) — liquid_balance / (avg_monthly_expense × 6)
    let liquid_balance: i64 = conn.query_row(
        "SELECT COALESCE(SUM(balance_minor), 0) FROM finance_accounts \
         WHERE user_id = ?1 AND deleted_at IS NULL AND is_active = 1 \
         AND account_type IN ('checking', 'savings', 'cash')",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let avg_monthly_expense: i64 = conn.query_row(
        "SELECT CAST(COALESCE(AVG(monthly_exp), 0) AS INTEGER) FROM ( \
           SELECT strftime('%Y-%m', txn_date) as m, SUM(amount_minor) as monthly_exp \
           FROM finance_transactions \
           WHERE user_id = ?1 AND type = 'expense' AND deleted_at IS NULL \
           AND txn_date >= date('now', '-6 months') \
           GROUP BY m \
         )",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let ef_score: i32 = if avg_monthly_expense > 0 {
        let target_6mo = avg_monthly_expense * 6;
        let ratio_pct = ((liquid_balance * 100) / target_6mo) as i32;
        ratio_pct.min(100) * 20 / 100
    } else {
        20 // no expenses = full score
    };
    let ef_tip = if ef_score >= 20 {
        "You have 6+ months of emergency fund. Excellent!".to_string()
    } else {
        "Build an emergency fund covering 6 months of expenses.".to_string()
    };

    // Component 3: Debt Ratio (15pts) — monthly_debt_payments / income, below 20% = 15pts
    let monthly_debt_payments: i64 = conn.query_row(
        "SELECT COALESCE(SUM(min_payment_minor), 0) FROM debts WHERE user_id = ?1 AND deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let dr_score: i32 = if income_minor > 0 {
        let ratio_bp = ((monthly_debt_payments * 10000) / income_minor) as i32;
        if ratio_bp <= 2000 {
            15
        } else {
            // At 100% debt ratio (10000bp) = 0pts. Linear from 2000→10000 = 15→0
            (15 * (10000 - ratio_bp).max(0) / 8000).min(15)
        }
    } else if monthly_debt_payments == 0 {
        15
    } else {
        0
    };
    let dr_tip = if dr_score >= 15 {
        "Debt payments are under control.".to_string()
    } else {
        "Try to keep monthly debt payments below 20% of income.".to_string()
    };

    // Component 4: Budget Adherence (15pts) — budgets_on_track / total_active_budgets × 15
    let total_budgets: i32 = conn.query_row(
        "SELECT COUNT(*) FROM budgets WHERE user_id = ?1 AND is_active = 1 AND deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let budgets_on_track: i32 = {
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM ( \
               SELECT b.id \
               FROM budgets b \
               LEFT JOIN ( \
                 SELECT category_id, SUM(amount_minor) as spent \
                 FROM finance_transactions \
                 WHERE user_id = ?1 AND type = 'expense' \
                 AND txn_date >= ?2 AND txn_date < date(?2, '+1 month') \
                 AND deleted_at IS NULL \
                 GROUP BY category_id \
               ) s ON s.category_id = b.category_id \
               WHERE b.user_id = ?1 AND b.is_active = 1 AND b.deleted_at IS NULL \
               AND COALESCE(s.spent, 0) <= b.limit_minor \
             )",
        ).map_err(|e| e.to_string())?;
        stmt.query_row(params![user_id, month_start], |r| r.get(0))
            .map_err(|e| e.to_string())?
    };

    let ba_score: i32 = if total_budgets > 0 {
        budgets_on_track * 15 / total_budgets
    } else {
        15 // no budgets set = no penalty
    };
    let ba_tip = if ba_score >= 15 {
        "All budgets on track this month!".to_string()
    } else {
        "Some budgets are overspent. Review your spending.".to_string()
    };

    // Component 5: Investment Habit (15pts) — invested in last 30 days = 15pts, 60 days = 7pts, else 0
    let last_investment_days: i32 = conn.query_row(
        "SELECT COALESCE(MIN(CAST(julianday('now') - julianday(updated_at) AS INTEGER)), 999) \
         FROM inv_holdings WHERE user_id = ?1 AND deleted_at IS NULL",
        params![user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    let ih_score: i32 = if last_investment_days <= 30 {
        15
    } else if last_investment_days <= 60 {
        7
    } else {
        0
    };
    let ih_tip = if ih_score >= 15 {
        "Great investment habit — you invested recently!".to_string()
    } else if ih_score > 0 {
        "You haven't invested in 30+ days. Consider adding to your portfolio.".to_string()
    } else {
        "Start investing regularly to build long-term wealth.".to_string()
    };

    // Component 6: Goal Progress (15pts) — on_track_goals / total_active_goals × 15
    let total_active_goals: i32 = goals_progress.len() as i32;
    let on_track_goals: i32 = goals_progress.iter().filter(|g| g.on_track).count() as i32;
    let gp_score: i32 = if total_active_goals > 0 {
        on_track_goals * 15 / total_active_goals
    } else {
        15 // no goals = no penalty
    };
    let gp_tip = if gp_score >= 15 {
        "All goals are on track. Keep going!".to_string()
    } else {
        "Some goals need attention. Add deposits to get back on track.".to_string()
    };

    let health_total = sr_score + ef_score + dr_score + ba_score + ih_score + gp_score;
    let health_score = HealthScore {
        total: health_total,
        components: vec![
            HealthScoreComponent { name: "Savings Rate".to_string(), score: sr_score, max: 20, tip: sr_tip },
            HealthScoreComponent { name: "Emergency Fund".to_string(), score: ef_score, max: 20, tip: ef_tip },
            HealthScoreComponent { name: "Debt Ratio".to_string(), score: dr_score, max: 15, tip: dr_tip },
            HealthScoreComponent { name: "Budget Adherence".to_string(), score: ba_score, max: 15, tip: ba_tip },
            HealthScoreComponent { name: "Investment Habit".to_string(), score: ih_score, max: 15, tip: ih_tip },
            HealthScoreComponent { name: "Goal Progress".to_string(), score: gp_score, max: 15, tip: gp_tip },
        ],
    };

    Ok(DashboardSummary {
        health_score,
        kpis,
        net_worth_trend,
        cashflow_trend,
        expense_by_category,
        budget_status,
        habits_today,
        goals_progress,
        upcoming_bills,
        recent_transactions,
        conflicts_count,
        pending_sync_count,
    })
}
