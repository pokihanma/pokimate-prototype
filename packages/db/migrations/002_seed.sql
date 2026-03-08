-- PokiMate v4 — Seed data (ARCHITECTURE Section 3.1, Phase 1)
-- Password hashes: bcrypt cost 12. Generate with: node scripts/generate-hashes.js

-- ========== Users (never plaintext passwords) ==========
INSERT INTO users (id, username, password_hash, display_name, email, role, is_active, created_at, updated_at, deleted_at) VALUES
('usr_admin001', 'admin', '$2a$12$2uhCqgyG5wyl9yNtTv.KO.v5oq7mIXmf9Rj18/UytD9cQHVZQSVeC', 'Admin', 'sudhakaransubramaniam0@gmail.com', 'admin', 1, datetime('now'), datetime('now'), NULL),
('usr_poki001', 'poki', '$2a$12$xtLPGCy6G9MsUnXt18hbI.RryZm1RBnNX4kbXhoA/oAq5vE1tYA.2', 'Poki', 'sudhakaransubramaniam0@gmail.com', 'admin', 1, datetime('now'), datetime('now'), NULL),
('usr_demo001', 'demo', '$2a$12$hhEZ712ICfXp1paneJ44ce2p52JFx4Grmkp9nElOrh14nt5B71On.', 'Demo User', 'sudhakaransubramaniam0@gmail.com', 'demo', 1, datetime('now'), datetime('now'), NULL);

-- ========== Demo user: one primary account ==========
INSERT INTO finance_accounts (id, user_id, name, account_type, balance_minor, currency, is_primary, is_active, created_at, updated_at, deleted_at) VALUES
('acc_demo001', 'usr_demo001', 'Primary Account', 'checking', 0, 'INR', 1, 1, datetime('now'), datetime('now'), NULL);

-- ========== Default Indian expense categories (for demo user) ==========
INSERT INTO categories (id, user_id, name, type, color, icon, parent_id, sort_order, is_active, created_at, updated_at, deleted_at) VALUES
('cat_exp001', 'usr_demo001', 'Food', 'expense', '#5B6CF9', 'utensils', NULL, 1, 1, datetime('now'), datetime('now'), NULL),
('cat_exp002', 'usr_demo001', 'Transport', 'expense', '#10B981', 'car', NULL, 2, 1, datetime('now'), datetime('now'), NULL),
('cat_exp003', 'usr_demo001', 'Health', 'expense', '#EF4444', 'heart', NULL, 3, 1, datetime('now'), datetime('now'), NULL),
('cat_exp004', 'usr_demo001', 'Shopping', 'expense', '#F59E0B', 'shopping-bag', NULL, 4, 1, datetime('now'), datetime('now'), NULL),
('cat_exp005', 'usr_demo001', 'Entertainment', 'expense', '#8B5CF6', 'film', NULL, 5, 1, datetime('now'), datetime('now'), NULL),
('cat_exp006', 'usr_demo001', 'Bills', 'expense', '#6366F1', 'file-text', NULL, 6, 1, datetime('now'), datetime('now'), NULL),
('cat_exp007', 'usr_demo001', 'Education', 'expense', '#EC4899', 'book-open', NULL, 7, 1, datetime('now'), datetime('now'), NULL),
('cat_exp008', 'usr_demo001', 'Personal Care', 'expense', '#14B8A6', 'user', NULL, 8, 1, datetime('now'), datetime('now'), NULL);

-- ========== Default income categories ==========
INSERT INTO categories (id, user_id, name, type, color, icon, parent_id, sort_order, is_active, created_at, updated_at, deleted_at) VALUES
('cat_inc001', 'usr_demo001', 'Salary', 'income', '#10B981', 'briefcase', NULL, 10, 1, datetime('now'), datetime('now'), NULL),
('cat_inc002', 'usr_demo001', 'Freelance', 'income', '#10B981', 'laptop', NULL, 11, 1, datetime('now'), datetime('now'), NULL),
('cat_inc003', 'usr_demo001', 'Business', 'income', '#10B981', 'trending-up', NULL, 12, 1, datetime('now'), datetime('now'), NULL),
('cat_inc004', 'usr_demo001', 'Investment Returns', 'income', '#10B981', 'pie-chart', NULL, 13, 1, datetime('now'), datetime('now'), NULL),
('cat_inc005', 'usr_demo001', 'Other', 'income', '#10B981', 'circle', NULL, 14, 1, datetime('now'), datetime('now'), NULL);

-- ========== Merchant rules: Swiggy/Zomato=Food, Uber/Ola=Transport, Amazon=Shopping, Netflix/Spotify=Entertainment ==========
INSERT INTO merchant_rules (id, user_id, pattern, category_id, is_regex, priority, created_at) VALUES
('mrul_001', 'usr_demo001', 'Swiggy', 'cat_exp001', 0, 10, datetime('now')),
('mrul_002', 'usr_demo001', 'Zomato', 'cat_exp001', 0, 10, datetime('now')),
('mrul_003', 'usr_demo001', 'Uber', 'cat_exp002', 0, 10, datetime('now')),
('mrul_004', 'usr_demo001', 'Ola', 'cat_exp002', 0, 10, datetime('now')),
('mrul_005', 'usr_demo001', 'Amazon', 'cat_exp004', 0, 10, datetime('now')),
('mrul_006', 'usr_demo001', 'Netflix', 'cat_exp005', 0, 10, datetime('now')),
('mrul_007', 'usr_demo001', 'Spotify', 'cat_exp005', 0, 10, datetime('now'));

-- ========== 6 months demo transactions (demo user, realistic Indian amounts in paise) ==========
-- Sep 2025 - Feb 2026: salary, expenses, a few income entries. amount_minor = paise (₹100 = 10000).
INSERT INTO finance_transactions (id, user_id, account_id, category_id, type, amount_minor, merchant, note, txn_date, is_recurring, import_job_id, created_at, updated_at, deleted_at) VALUES
('txn_d1', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2025-09-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d2', 'usr_demo001', 'acc_demo001', 'cat_exp001', 'expense', 45000, 'Swiggy', 'Lunch', '2025-09-05', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d3', 'usr_demo001', 'acc_demo001', 'cat_exp002', 'expense', 120000, 'Ola', 'Cab to office', '2025-09-10', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d4', 'usr_demo001', 'acc_demo001', 'cat_exp005', 'expense', 64900, 'Netflix', 'Monthly', '2025-09-15', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d5', 'usr_demo001', 'acc_demo001', 'cat_exp004', 'expense', 250000, 'Amazon', 'Household', '2025-09-20', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d6', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2025-10-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d7', 'usr_demo001', 'acc_demo001', 'cat_exp001', 'expense', 38000, 'Zomato', 'Dinner', '2025-10-08', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d8', 'usr_demo001', 'acc_demo001', 'cat_exp006', 'expense', 450000, 'Electricity', 'Bill', '2025-10-12', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d9', 'usr_demo001', 'acc_demo001', 'cat_exp002', 'expense', 95000, 'Uber', 'Weekly commute', '2025-10-18', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d10', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2025-11-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d11', 'usr_demo001', 'acc_demo001', 'cat_exp005', 'expense', 99900, 'Spotify', 'Yearly', '2025-11-02', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d12', 'usr_demo001', 'acc_demo001', 'cat_exp003', 'expense', 85000, 'Apollo', 'Checkup', '2025-11-14', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d13', 'usr_demo001', 'acc_demo001', 'cat_exp001', 'expense', 52000, 'Swiggy', 'Family order', '2025-11-22', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d14', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2025-12-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d15', 'usr_demo001', 'acc_demo001', 'cat_exp004', 'expense', 189900, 'Amazon', 'Electronics', '2025-12-10', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d16', 'usr_demo001', 'acc_demo001', 'cat_exp002', 'expense', 110000, 'Ola', 'Travel', '2025-12-20', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d17', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2026-01-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d18', 'usr_demo001', 'acc_demo001', 'cat_exp006', 'expense', 320000, 'Broadband', 'Quarterly', '2026-01-05', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d19', 'usr_demo001', 'acc_demo001', 'cat_exp001', 'expense', 41000, 'Zomato', 'Lunch', '2026-01-15', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d20', 'usr_demo001', 'acc_demo001', 'cat_inc001', 'income', 12500000, 'Employer', 'Monthly salary', '2026-02-01', 1, NULL, datetime('now'), datetime('now'), NULL),
('txn_d21', 'usr_demo001', 'acc_demo001', 'cat_exp008', 'expense', 65000, 'Pharmacy', 'Personal care', '2026-02-08', 0, NULL, datetime('now'), datetime('now'), NULL),
('txn_d22', 'usr_demo001', 'acc_demo001', 'cat_exp007', 'expense', 150000, 'Udemy', 'Course', '2026-02-14', 0, NULL, datetime('now'), datetime('now'), NULL);

-- ========== 5 demo habits (demo user) ==========
INSERT INTO habits (id, user_id, name, description, frequency, target_days, color, icon, reminder_time, is_active, created_at, updated_at, deleted_at) VALUES
('hab_d01', 'usr_demo001', 'Morning Walk', '30 min walk', 'daily', '[1,2,3,4,5,6,0]', '#5B6CF9', 'footprints', '07:00', 1, datetime('now'), datetime('now'), NULL),
('hab_d02', 'usr_demo001', 'Read', 'Read 20 pages', 'daily', '[1,2,3,4,5,6,0]', '#10B981', 'book-open', '21:00', 1, datetime('now'), datetime('now'), NULL),
('hab_d03', 'usr_demo001', 'Meditate', '10 min', 'daily', '[1,2,3,4,5,6,0]', '#8B5CF6', 'brain', '08:00', 1, datetime('now'), datetime('now'), NULL),
('hab_d04', 'usr_demo001', 'No Sugar', 'No added sugar', 'daily', '[1,2,3,4,5,6,0]', '#F59E0B', 'heart', NULL, 1, datetime('now'), datetime('now'), NULL),
('hab_d05', 'usr_demo001', 'Sleep by 11', 'In bed by 11 PM', 'daily', '[0,1,2,3,4,5,6]', '#6366F1', 'moon', NULL, 1, datetime('now'), datetime('now'), NULL);

-- ========== 3 demo goals (demo user) ==========
INSERT INTO goals (id, user_id, title, description, target_amount_minor, current_amount_minor, target_date, color, icon, is_active, created_at, updated_at, deleted_at) VALUES
('goal_d01', 'usr_demo001', 'Emergency Fund', '6 months expense', 60000000, 15000000, '2026-12-31', '#10B981', 'shield', 1, datetime('now'), datetime('now'), NULL),
('goal_d02', 'usr_demo001', 'Vacation', 'Family trip', 25000000, 5000000, '2026-06-30', '#5B6CF9', 'plane', 1, datetime('now'), datetime('now'), NULL),
('goal_d03', 'usr_demo001', 'New Laptop', 'MacBook', 15000000, 3000000, '2026-09-01', '#F59E0B', 'laptop', 1, datetime('now'), datetime('now'), NULL);

-- ========== 3 demo subscriptions (demo user) ==========
INSERT INTO subscriptions (id, user_id, name, amount_minor, billing_cycle, next_renewal_date, category, logo_url, notes, auto_renew, reminder_days_before, is_active, created_at, updated_at, deleted_at) VALUES
('sub_d01', 'usr_demo001', 'Netflix', 64900, 'monthly', '2026-04-01', 'Entertainment', NULL, 'Premium', 1, 3, 1, datetime('now'), datetime('now'), NULL),
('sub_d02', 'usr_demo001', 'Spotify', 11900, 'monthly', '2026-04-01', 'Entertainment', NULL, 'Individual', 1, 3, 1, datetime('now'), datetime('now'), NULL),
('sub_d03', 'usr_demo001', 'YouTube Premium', 12900, 'monthly', '2026-04-15', 'Entertainment', NULL, 'Family', 1, 3, 1, datetime('now'), datetime('now'), NULL);

-- ========== Notification prefs for demo user ==========
INSERT INTO notification_prefs (user_id, enabled, budget_alerts, habit_reminders, bill_reminders, streak_alerts, weekly_summary, sync_status, quiet_start, quiet_end, budget_threshold_pct) VALUES
('usr_demo001', 1, 1, 1, 1, 1, 1, 1, '22:00', '07:00', 80);
