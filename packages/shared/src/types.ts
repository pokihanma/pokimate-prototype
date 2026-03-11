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
