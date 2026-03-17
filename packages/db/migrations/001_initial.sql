-- PokiMate v4 — Initial schema (ARCHITECTURE.md Section 3)
-- All money: BIGINT paise. All PKs: prefix_ + 12-char hex. All tables: created_at, updated_at, deleted_at where applicable.

-- ========== 3.1 Auth & Users ==========
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','user','demo')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

-- ========== 3.2 Sync Infrastructure ==========
CREATE TABLE pending_changes (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL CHECK(op IN ('INSERT','UPDATE','DELETE')),
  row_id TEXT NOT NULL,
  row_data TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE conflicts_pending (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  local_data TEXT NOT NULL,
  remote_data TEXT NOT NULL,
  local_ts TEXT NOT NULL,
  remote_ts TEXT NOT NULL,
  remote_device TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sync_cursors (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK(level IN ('ERROR','WARN','INFO','DEBUG')),
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_logs_level ON app_logs(level, created_at DESC);
CREATE INDEX idx_logs_module ON app_logs(module, created_at DESC);

-- ========== 3.3 Finance ==========
CREATE TABLE finance_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('checking','savings','credit','investment','loan','cash')),
  balance_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  color TEXT NOT NULL DEFAULT '#5B6CF9',
  icon TEXT NOT NULL DEFAULT 'circle',
  parent_id TEXT REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT NOT NULL REFERENCES finance_accounts(id),
  category_id TEXT REFERENCES categories(id),
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount_minor BIGINT NOT NULL,
  merchant TEXT,
  note TEXT,
  txn_date TEXT NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  import_job_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_txn_user_date ON finance_transactions(user_id, txn_date DESC);
CREATE INDEX idx_txn_category ON finance_transactions(category_id, txn_date DESC);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  limit_minor BIGINT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL CHECK(debt_type IN ('loan','credit_card','personal','other')),
  principal_minor BIGINT NOT NULL,
  current_balance_minor BIGINT NOT NULL,
  interest_rate_bp INTEGER NOT NULL DEFAULT 0,
  min_payment_minor BIGINT NOT NULL DEFAULT 0,
  due_day INTEGER,
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly','yearly','weekly','quarterly')),
  next_renewal_date TEXT NOT NULL,
  category TEXT,
  logo_url TEXT,
  notes TEXT,
  auto_renew INTEGER NOT NULL DEFAULT 1,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- ========== 3.4 Investments ==========
CREATE TABLE inv_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('stock','mutual_fund','etf','fd','other')),
  isin TEXT,
  exchange TEXT,
  fund_house TEXT,
  asset_source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE inv_holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  asset_id TEXT NOT NULL REFERENCES inv_assets(id),
  quantity_str TEXT NOT NULL,
  avg_cost_minor BIGINT NOT NULL,
  total_invested_minor BIGINT NOT NULL,
  folio_number TEXT,
  last_imported_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE inv_prices (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES inv_assets(id),
  price_minor BIGINT NOT NULL,
  day_change_minor BIGINT NOT NULL DEFAULT 0,
  day_change_percent_bp INTEGER NOT NULL DEFAULT 0,
  as_of TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
);

-- ========== 3.4 Habits ==========
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  color TEXT NOT NULL DEFAULT '#5B6CF9',
  icon TEXT NOT NULL DEFAULT 'check-circle',
  reminder_time TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE habit_checkins (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  checkin_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('done','skip','missed')),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_checkin_unique ON habit_checkins(habit_id, checkin_date);

-- ========== 3.4 Goals ==========
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'money',   -- 'money' | 'activity'
  target_amount_minor BIGINT NOT NULL DEFAULT 0,
  current_amount_minor BIGINT NOT NULL DEFAULT 0,
  target_value INTEGER,                       -- for activity goals: numeric target
  unit_label TEXT,                            -- for activity goals: "lessons", "km", "books"
  target_date TEXT,
  color TEXT NOT NULL DEFAULT '#10B981',
  icon TEXT NOT NULL DEFAULT 'target',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE goal_deposits (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_minor BIGINT NOT NULL,
  note TEXT,
  deposit_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ========== 3.4 Time Tracker ==========
CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER,
  is_running INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- ========== 3.4 Imports ==========
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  import_source TEXT NOT NULL,
  bank_name TEXT,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'preview',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE merchant_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  pattern TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  is_regex INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- ========== 3.4 Notifications ==========
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  deep_link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notif_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE notification_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  enabled INTEGER NOT NULL DEFAULT 1,
  budget_alerts INTEGER NOT NULL DEFAULT 1,
  habit_reminders INTEGER NOT NULL DEFAULT 1,
  bill_reminders INTEGER NOT NULL DEFAULT 1,
  streak_alerts INTEGER NOT NULL DEFAULT 1,
  weekly_summary INTEGER NOT NULL DEFAULT 1,
  sync_status INTEGER NOT NULL DEFAULT 1,
  quiet_start TEXT DEFAULT '22:00',
  quiet_end TEXT DEFAULT '07:00',
  budget_threshold_pct INTEGER NOT NULL DEFAULT 80
);
