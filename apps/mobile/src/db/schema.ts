// SQLite schema — identical to desktop packages/db/migrations/
// Uses CREATE TABLE IF NOT EXISTS so importing an existing .db file is safe.
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'user',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);

CREATE TABLE IF NOT EXISTS habits (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  frequency     TEXT NOT NULL DEFAULT 'daily',
  target_days   TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  color         TEXT NOT NULL DEFAULT '#5B6CF9',
  icon          TEXT NOT NULL DEFAULT 'check-circle',
  reminder_time TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

CREATE TABLE IF NOT EXISTS habit_checkins (
  id           TEXT PRIMARY KEY,
  habit_id     TEXT NOT NULL REFERENCES habits(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  checkin_date TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'done',
  note         TEXT,
  created_at   TEXT NOT NULL,
  UNIQUE(habit_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS goals (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id),
  title                TEXT NOT NULL,
  description          TEXT,
  goal_type            TEXT NOT NULL DEFAULT 'money',
  target_amount_minor  INTEGER,
  current_amount_minor INTEGER NOT NULL DEFAULT 0,
  target_value         REAL,
  current_value        REAL NOT NULL DEFAULT 0,
  unit_label           TEXT,
  target_date          TEXT,
  color                TEXT NOT NULL DEFAULT '#5B6CF9',
  icon                 TEXT NOT NULL DEFAULT 'target',
  is_active            INTEGER NOT NULL DEFAULT 1,
  reward_title         TEXT,
  reward_emoji         TEXT,
  reminder_date        TEXT,
  reminder_time        TEXT DEFAULT '09:00',
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  deleted_at           TEXT
);

CREATE TABLE IF NOT EXISTS goal_deposits (
  id          TEXT PRIMARY KEY,
  goal_id     TEXT NOT NULL REFERENCES goals(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  amount_minor INTEGER NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  account_type  TEXT NOT NULL,
  balance_minor INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'INR',
  is_primary    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  icon       TEXT,
  parent_id  TEXT REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  account_id   TEXT NOT NULL REFERENCES finance_accounts(id),
  category_id  TEXT REFERENCES categories(id),
  type         TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  description  TEXT,
  txn_date     TEXT NOT NULL,
  notes        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  category_id  TEXT REFERENCES categories(id),
  name         TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  period       TEXT NOT NULL DEFAULT 'monthly',
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);

CREATE TABLE IF NOT EXISTS debts (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  name                TEXT NOT NULL,
  debt_type           TEXT NOT NULL DEFAULT 'loan',
  principal_minor     INTEGER NOT NULL,
  outstanding_minor   INTEGER NOT NULL,
  interest_rate       REAL NOT NULL DEFAULT 0,
  emi_minor           INTEGER,
  start_date          TEXT,
  end_date            TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  name           TEXT NOT NULL,
  amount_minor   INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'INR',
  cycle          TEXT NOT NULL DEFAULT 'monthly',
  next_due_date  TEXT,
  category       TEXT,
  notes          TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT
);

CREATE TABLE IF NOT EXISTS time_entries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  category    TEXT,
  start_time  TEXT NOT NULL,
  end_time    TEXT,
  duration_s  INTEGER,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS inv_holdings (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  account_id     TEXT REFERENCES finance_accounts(id),
  symbol         TEXT NOT NULL,
  name           TEXT,
  holding_type   TEXT NOT NULL DEFAULT 'stock',
  quantity       REAL NOT NULL DEFAULT 0,
  avg_price_minor INTEGER NOT NULL DEFAULT 0,
  current_price_minor INTEGER NOT NULL DEFAULT 0,
  last_updated   TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT
);

CREATE TABLE IF NOT EXISTS pending_changes (
  id         TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation  TEXT NOT NULL,
  row_id     TEXT NOT NULL,
  row_data   TEXT NOT NULL,
  device_id  TEXT NOT NULL DEFAULT 'mobile',
  created_at TEXT NOT NULL,
  synced_at  TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id         ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit   ON habit_checkins(habit_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_id          ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON finance_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id        ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id          ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id  ON subscriptions(user_id);
`;
