/**
 * Shared types — expanded in Phase 3 with dashboard types.
 */

/** Matches Rust SessionInfo from auth_commands. */
export interface SessionInfo {
  session_id: string;
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  expires_at: string;
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export type NotificationType =
  | 'budget_alert'
  | 'habit_reminder'
  | 'bill_reminder'
  | 'streak_alert'
  | 'weekly_summary'
  | 'sync_status'
  | 'goal_milestone';

// ── Dashboard types (Phase 3) ─────────────────────────────────────────────────

export interface HealthScoreComponent {
  name: string;
  score: number;
  max: number;
  tip: string;
}

export interface HealthScore {
  total: number;
  components: HealthScoreComponent[];
}

export interface DashboardKpis {
  net_worth_minor: number;
  income_minor: number;
  expense_minor: number;
  /** basis points: 20% = 2000 */
  savings_rate_bp: number;
  total_debt_minor: number;
  total_investments_minor: number;
}

export interface NetWorthPoint {
  month: string; // "YYYY-MM"
  amount_minor: number;
}

export interface CashflowPoint {
  month: string;
  income_minor: number;
  expense_minor: number;
}

export interface ExpenseCategory {
  category_name: string;
  /** Raw DB color hex — frontend maps to CSS variable */
  color: string;
  amount_minor: number;
  /** basis points: 30% = 3000 */
  percentage_bp: number;
}

export interface BudgetStatus {
  category_name: string;
  limit_minor: number;
  spent_minor: number;
  percentage_bp: number;
}

export interface HabitToday {
  id: string;
  name: string;
  icon: string;
  color: string;
  checked_in: boolean;
  streak: number;
}

export interface GoalProgress {
  id: string;
  title: string;
  target_minor: number;
  current_minor: number;
  percentage_bp: number;
  on_track: boolean;
}

export interface UpcomingBill {
  name: string;
  amount_minor: number;
  due_date: string;
  days_until: number;
}

export interface DashboardTransaction {
  id: string;
  type: string;
  amount_minor: number;
  merchant: string | null;
  note: string | null;
  txn_date: string;
  category_name: string | null;
  category_color: string | null;
}

// ── Finance types (Phase 4) ───────────────────────────────────────────────────

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  balance_minor: number;
  currency: string;
  is_primary: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type_: string;
  color: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type_: string;
  amount_minor: number;
  merchant: string | null;
  note: string | null;
  txn_date: string;
  is_recurring: number;
  import_job_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_minor: number;
  period: string;
  alert_threshold_pct: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: string;
  principal_minor: number;
  current_balance_minor: number;
  interest_rate_bp: number;
  min_payment_minor: number;
  due_day: number | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount_minor: number;
  billing_cycle: string;
  next_renewal_date: string;
  category: string | null;
  notes: string | null;
  auto_renew: number;
  reminder_days_before: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface InvAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  isin: string | null;
  exchange: string | null;
  fund_house: string | null;
  asset_source: string;
  created_at: string;
  updated_at: string;
}

export interface InvHolding {
  id: string;
  user_id: string;
  asset_id: string;
  quantity_str: string;
  avg_cost_minor: number;
  total_invested_minor: number;
  folio_number: string | null;
  last_imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvPrice {
  id: string;
  asset_id: string;
  price_minor: number;
  day_change_minor: number;
  day_change_percent_bp: number;
  as_of: string;
  source: string;
}

export interface HoldingWithPnL {
  holding: InvHolding;
  asset: InvAsset;
  current_price_minor: number;
  current_value_minor: number;
  pnl_minor: number;
  pnl_percent_bp: number;
}

export interface ParsedBankRow {
  row_index: number;
  txn_date: string;
  description: string;
  amount_minor: number;
  txn_type: string;
  status: 'new' | 'duplicate' | 'uncategorized';
  category_id: string | null;
}

export interface ParsedStatement {
  job_id: string;
  bank_name: string | null;
  row_count: number;
  rows: ParsedBankRow[];
  needs_mapping: boolean;
  detected_columns: string[];
}

export interface ConfirmedRow {
  row_index: number;
  txn_date: string;
  description: string;
  amount_minor: number;
  txn_type: string;
  category_id: string | null;
  skip: boolean;
}

export interface GrowwMFPreviewRow {
  scheme_name: string;
  isin: string | null;
  fund_house: string | null;
  units: string;
  avg_cost_minor: number;
  total_invested_minor: number;
  folio_number: string | null;
  imported: boolean;
}

export interface GrowwStockPreviewRow {
  symbol: string;
  name: string;
  isin: string | null;
  quantity: string;
  avg_price_minor: number;
  total_invested_minor: number;
  imported: boolean;
}

export interface DashboardSummary {
  health_score: HealthScore;
  kpis: DashboardKpis;
  net_worth_trend: NetWorthPoint[];
  cashflow_trend: CashflowPoint[];
  expense_by_category: ExpenseCategory[];
  budget_status: BudgetStatus[];
  habits_today: HabitToday[];
  goals_progress: GoalProgress[];
  upcoming_bills: UpcomingBill[];
  recent_transactions: DashboardTransaction[];
  conflicts_count: number;
  pending_sync_count: number;
}

// ── Habits types (Phase 5) ────────────────────────────────────────────────────

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: string;
  target_days: string; // JSON array e.g. "[0,1,2,3,4,5,6]"
  color: string;
  icon: string;
  reminder_time: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HabitCheckin {
  id: string;
  habit_id: string;
  user_id: string;
  checkin_date: string; // "YYYY-MM-DD"
  status: 'done' | 'skip' | 'missed';
  note: string | null;
  created_at: string;
}

// ── Goals types (Phase 5) ─────────────────────────────────────────────────────

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_amount_minor: number;
  current_amount_minor: number;
  target_date: string | null;
  color: string;
  icon: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GoalDeposit {
  id: string;
  goal_id: string;
  user_id: string;
  amount_minor: number;
  note: string | null;
  deposit_date: string; // "YYYY-MM-DD"
  created_at: string;
}

// ── Time Tracker types (Phase 5) ──────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  start_time: string; // ISO datetime
  end_time: string | null;
  duration_minutes: number | null;
  is_running: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
