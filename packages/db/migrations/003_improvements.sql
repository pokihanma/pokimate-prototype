-- ============================================================
-- Migration 003: Performance indexes + Goals enhancements
-- ============================================================

-- ── Missing user_id indexes (query performance) ──────────────
CREATE INDEX IF NOT EXISTS idx_habits_user        ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user         ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user  ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user       ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user         ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user      ON finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user      ON inv_holdings(user_id);

-- ── Goals: reward + reminder columns ─────────────────────────
-- reward_title: what you get when you complete the goal (e.g. "New shoes", "Bike")
-- reward_emoji: visual emoji for the reward (e.g. "👟", "🚴")
-- reminder_date: date to remind (YYYY-MM-DD), NULL = no reminder
-- reminder_time: time of day for reminder (HH:MM), NULL = default 09:00
ALTER TABLE goals ADD COLUMN reward_title    TEXT;
ALTER TABLE goals ADD COLUMN reward_emoji    TEXT;
ALTER TABLE goals ADD COLUMN reminder_date   TEXT;
ALTER TABLE goals ADD COLUMN reminder_time   TEXT DEFAULT '09:00';

-- ── Habits: reminder_enabled flag ────────────────────────────
-- reminder_time already exists; add enabled toggle separately
ALTER TABLE habits ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;
