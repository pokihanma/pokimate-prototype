# ⚡ PokiMate v4 — Finalized Architecture
> **Version:** v4.1 · **Date:** March 2026 · **Status:** CURSOR BUILD READY
>
> Every decision in this document is **final and locked**. This is the single source of truth.
> If Cursor or any AI suggests something different, refer back here.

---

## SECTION 1 — ALL ARCHITECTURAL DECISIONS LOCKED

### 1.1 — Core Architecture

| Decision | Final Answer | Rationale |
|---|---|---|
| Primary DB | SQLite on each device (WAL mode) | Zero config, zero network, instant queries, works 100% offline |
| Cloud sync medium | Google Drive: JSON changelog + monthly snapshots | Free, personal, no server needed, conflict-safe |
| Desktop role | Client only — reads/writes local SQLite, syncs via Drive | No laptop as server. App runs standalone like any normal app |
| Mobile role | Client only — same as desktop, independent SQLite | Android only, offline-first, syncs to Drive independently |
| Business logic location | Both apps independently (same logic, shared spec) | No dependency between devices, truly standalone |
| Backend framework | Tauri v2 + Rust commands + SQLite (NO Python sidecar) | One process, fast startup, no Python runtime to bundle |
| Mobile framework | React Native + Expo SDK 52 | Shares UI code with desktop web layer, best ecosystem |
| Web layer | Next.js 15 inside Tauri webview (desktop only) | Not a public web app. localhost only, no hosting needed |
| Currency | INR only for v1 | Simpler, faster to build, add multi-currency in v2 |
| AI | Skip for v1, add Gemini later | Faster MVP, Gemini free tier when ready |
| Auth | Username + password (bcrypt hashed in seeded DB) | Simple, offline-capable, no OAuth complexity for login |
| Delete strategy | Soft delete — hidden 30 days, recoverable in Settings | No accidental data loss, syncs correctly across devices |

### 1.2 — Tech Stack (Final, No Changes)

| Layer | Technology | Version |
|---|---|---|
| Desktop shell | Tauri v2 (Rust) | v2.x latest |
| Desktop DB + logic | Rust (tauri-plugin-sql + rusqlite) | SQLite 3.45+, WAL mode |
| Desktop UI | Next.js 15 static export (inside Tauri webview) | Next.js 15, React 19 |
| Styling | Tailwind CSS v4 + CSS variables for dual theme | v4.x |
| UI components | shadcn/ui (Radix primitives) | Latest |
| State management | Zustand v5 (UI) + TanStack Query v5 (data) | Latest |
| Charts | Recharts | v2.x |
| Forms | React Hook Form v7 + Zod v3 | Latest |
| Money math | BIGINT paise (×100). Never Float. | Native JS BigInt |
| Tables | TanStack Table v8 | Latest |
| Animations | Framer Motion v11 | Latest |
| Mobile shell | Expo SDK 52 + Expo Router v4 | SDK 52 |
| Mobile UI | NativeWind v4 (Tailwind for RN) | v4.x |
| Mobile DB | expo-sqlite (WAL mode) | Latest |
| Mobile notifications | expo-notifications (local only) | Latest |
| Mobile secure store | expo-secure-store (JWT + user prefs) | Latest |
| Drive sync | Google Drive REST API v3 (scope: appDataFolder) | v3 |
| Logging | Local file (daily rotation) + in-app viewer | Custom |
| Password hashing | bcrypt (argon2 for new hashes in Rust) | — |

---

## SECTION 2 — SYNC ENGINE SPECIFICATION

### 2.1 — How Sync Works (The Complete Mental Model)

Each device has its OWN local SQLite database. Google Drive holds a shared JSON changelog. Devices sync by:
1. Pushing their own new changes to Drive on demand
2. Pulling others' changes from Drive on app open + manual sync

**THE SYNC RULES — Read This Before Building**

- **Rule 1:** Local SQLite is always the live database. All reads/writes hit local SQLite. Drive is backup + sync medium only.
- **Rule 2:** Every write to local SQLite ALSO writes a record to the local `pending_changes` table.
- **Rule 3:** On SYNC (app open + manual button): pull changelog from Drive → apply new entries → push pending_changes → clear them.
- **Rule 4:** If two devices modified the SAME ROW → show Conflict Resolution Screen. User picks winner.
- **Rule 5:** New rows from different devices (no same-row conflict) → merge both. No data loss.
- **Rule 6:** Soft-deleted rows sync their `deleted_at` timestamp. Other devices hide them too.
- **Rule 7:** The seeded base DB is baked into the app binary. First launch = copy base DB to device storage.

### 2.2 — Sync Flow (Step by Step)

**On App Open:**
1. App starts → copies base DB to device if no local DB exists yet
2. Connect to Google Drive using stored OAuth token
3. Download `pokimate_changelog.json` from Drive appDataFolder
4. Read local `last_sync_cursor` (stored in `app_config` table)
5. Find all changelog entries with id > last_sync_cursor
6. For each new entry: check if same row was also modified locally (conflict check)
7. If conflict found: add to `conflicts_pending` table, skip that row for now
8. Apply all non-conflicting new entries to local SQLite
9. Show Conflict Badge in topbar if `conflicts_pending` has rows
10. Update `last_sync_cursor` to latest processed entry id

**On Manual Sync Button Press:**
11. Run the On App Open flow above first (pull latest)
12. Read all rows from `pending_changes` table (local unsynced mutations)
13. Download current changelog from Drive
14. Append pending_changes entries to changelog JSON
15. Upload updated changelog back to Drive (atomic: download → modify in memory → upload)
16. Clear `pending_changes` table (mark as synced)
17. Show sync success/failure notification

**Conflict Resolution Screen:**
Shown when `conflicts_pending` table has rows. Full-screen modal, one conflict at a time.

| UI Element | What It Shows |
|---|---|
| Left panel — LOCAL | Your change on this device: field name + old value → new value + timestamp |
| Right panel — REMOTE | Other device's change: same fields + that device's timestamp |
| Action buttons | 'Keep Mine' \| 'Keep Theirs' \| 'Keep Both' (only for non-unique fields) |
| Progress | 'Conflict 1 of 3' — resolve all before continuing |
| After all resolved | Run sync push with resolved values. Clear conflicts_pending. |

### 2.3 — Changelog JSON Format

```json
// pokimate_changelog.json lives in Google Drive appDataFolder
// appDataFolder is hidden from user's Drive UI — only this app can see it
[
  {
    "id": "chg_a1b2c3d4",         // monotonic ID per device: deviceId_timestamp_seq
    "device": "Desktop-Win11",     // human-readable device name
    "device_id": "uuid-v4",        // permanent device identifier
    "timestamp": "2026-03-10T14:30:00.000Z",
    "table": "finance_transactions",
    "op": "INSERT",                // INSERT | UPDATE | DELETE
    "row_id": "txn_abc123",        // primary key of affected row
    "data": {                      // full row for INSERT/UPDATE, just row_id for DELETE
      "id": "txn_abc123",
      "amount_minor": 15000,
      "merchant": "Swiggy",
      "category_id": "cat_food",
      "txn_date": "2026-03-10",
      "deleted_at": null
    }
  }
]

// Monthly compaction (1st of month, background):
// 1. Take current local SQLite → encrypt → upload as pokimate_snapshot_YYYY-MM.db.enc
// 2. Add snapshot_marker entry to changelog (type: 'snapshot', file: 'pokimate_snapshot_...')
// 3. Keep changelog entries — never delete (they are tiny, ~200 bytes each)
// 4. New device install: download latest snapshot → replay changelog since snapshot marker
```

---

## SECTION 3 — COMPLETE DATABASE SCHEMA

**Schema Rules — Non-Negotiable**
- ALL primary keys: text format `'prefix_' + 12-char hex` (e.g. `txn_a1b2c3d4e5f6`)
- ALL money: BIGINT stored as paise (×100). ₹100.50 = 10050. NEVER use REAL/FLOAT for money.
- ALL tables: include `created_at`, `updated_at` (ISO timestamps), `deleted_at` (NULL = active, timestamp = soft deleted)
- ALL tables synced via changelog EXCEPT: `app_logs`, `pending_changes`, `conflicts_pending`, `sync_cursors`
- WAL mode + foreign_keys=ON + synchronous=NORMAL applied on every connection

### 3.1 — Auth & Users

```sql
-- users table (seeded at install, never created by user)
CREATE TABLE users (
  id TEXT PRIMARY KEY,                          -- 'usr_' + hex
  username TEXT UNIQUE NOT NULL,                -- 'admin', 'poki', 'demo'
  password_hash TEXT NOT NULL,                  -- bcrypt hash
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','user','demo')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT                               -- NULL = active
);

-- Seeded users (baked into base DB):
-- id: usr_admin001  username: admin    password: admin@007        role: admin
-- id: usr_poki001   username: poki     password: pokihanma@007    role: admin
-- id: usr_demo001   username: demo     password: demo007          role: demo
-- email for admin/poki: sudhakaransubramaniam0@gmail.com

-- auth_sessions table (local JWT sessions)
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,              -- SHA256 of session token
  device_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT                               -- NULL = active
);
```

### 3.2 — Sync Infrastructure

```sql
-- pending_changes: local mutations not yet pushed to Drive
CREATE TABLE pending_changes (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL CHECK(op IN ('INSERT','UPDATE','DELETE')),
  row_id TEXT NOT NULL,
  row_data TEXT NOT NULL,                       -- JSON
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- conflicts_pending: rows needing manual resolution
CREATE TABLE conflicts_pending (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  local_data TEXT NOT NULL,                     -- JSON of local version
  remote_data TEXT NOT NULL,                    -- JSON of remote version
  local_ts TEXT NOT NULL,
  remote_ts TEXT NOT NULL,
  remote_device TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- sync_cursors: tracks what we've already applied
CREATE TABLE sync_cursors (
  key TEXT PRIMARY KEY,                         -- 'last_applied_change_id'
  value TEXT NOT NULL
);

-- app_config: all app settings as key-value
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                          -- JSON
  updated_at TEXT NOT NULL
);

-- app_logs: structured log entries (in-app viewer)
CREATE TABLE app_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK(level IN ('ERROR','WARN','INFO','DEBUG')),
  module TEXT NOT NULL,                         -- 'sync', 'finance', 'auth', etc.
  message TEXT NOT NULL,
  data TEXT,                                    -- JSON extra context
  created_at TEXT NOT NULL
);
CREATE INDEX idx_logs_level ON app_logs(level, created_at DESC);
CREATE INDEX idx_logs_module ON app_logs(module, created_at DESC);
```

### 3.3 — Finance Schema

```sql
CREATE TABLE finance_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('checking','savings','credit','investment','loan','cash')),
  balance_minor BIGINT NOT NULL DEFAULT 0,      -- paise
  currency TEXT NOT NULL DEFAULT 'INR',
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
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
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT NOT NULL REFERENCES finance_accounts(id),
  category_id TEXT REFERENCES categories(id),
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount_minor BIGINT NOT NULL,                 -- paise, always positive
  merchant TEXT,
  note TEXT,
  txn_date TEXT NOT NULL,                       -- YYYY-MM-DD
  is_recurring INTEGER NOT NULL DEFAULT 0,
  import_job_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
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
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL CHECK(debt_type IN ('loan','credit_card','personal','other')),
  principal_minor BIGINT NOT NULL,
  current_balance_minor BIGINT NOT NULL,
  interest_rate_bp INTEGER NOT NULL DEFAULT 0,  -- basis points (12% = 1200)
  min_payment_minor BIGINT NOT NULL DEFAULT 0,
  due_day INTEGER,
  start_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
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
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
```

### 3.4 — Investments, Habits, Goals, Time

```sql
-- INVESTMENTS
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
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE inv_holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  asset_id TEXT NOT NULL REFERENCES inv_assets(id),
  quantity_str TEXT NOT NULL,                   -- stored as string to avoid float issues
  avg_cost_minor BIGINT NOT NULL,
  total_invested_minor BIGINT NOT NULL,
  folio_number TEXT,
  last_imported_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
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

-- HABITS
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',  -- JSON day array
  color TEXT NOT NULL DEFAULT '#5B6CF9',
  icon TEXT NOT NULL DEFAULT 'check-circle',
  reminder_time TEXT,                           -- 'HH:MM' 24h
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE habit_checkins (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  checkin_date TEXT NOT NULL,                   -- YYYY-MM-DD
  status TEXT NOT NULL CHECK(status IN ('done','skip','missed')),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_checkin_unique ON habit_checkins(habit_id, checkin_date);

-- GOALS
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  target_amount_minor BIGINT NOT NULL,
  current_amount_minor BIGINT NOT NULL DEFAULT 0,
  target_date TEXT,
  color TEXT NOT NULL DEFAULT '#10B981',
  icon TEXT NOT NULL DEFAULT 'target',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
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

-- TIME TRACKER
CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER,
  is_running INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

-- IMPORTS
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  import_source TEXT NOT NULL,
  bank_name TEXT,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'preview',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
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

-- NOTIFICATIONS
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,                                    -- JSON
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
```

---

## SECTION 4 — USER SYSTEM & ADMIN CONTROL

### 4.1 — Users & Roles

| Username | Password | Role | What They Can Do |
|---|---|---|---|
| admin | admin@007 | admin | Full access + master control panel |
| poki | pokihanma@007 | admin | Full access + master control panel (same as admin) |
| demo | demo007 | demo | Read-only view of seeded demo data. Can't modify real data. |

**Security Notes:**
- Passwords are stored as bcrypt hashes in the seeded SQLite database — never plaintext.
- The base DB file is compiled into the app binary. Decompiling reveals the DB but hashes cannot be reversed.
- Session tokens are stored in device secure storage (Keychain on Windows, Keystore on Android).
- Admin accounts can change their own password in Settings → Security.

### 4.2 — Admin Master Control Panel

Accessible at: **Settings → Admin Panel** (only visible when logged in as admin role)

| Admin Capability | How It Works |
|---|---|
| Impersonate any user | Button 'Login As Demo' — switches session to that user. Banner shows 'Viewing as: demo'. Click to exit. |
| View system logs | Full app_logs viewer with level filter (ERROR/WARN/INFO/DEBUG) + module filter + search |
| Reset demo data | One button — wipes all demo user's data, re-seeds with fresh 6-month sample data |
| Export encrypted backup | Exports full SQLite DB as AES-256-GCM encrypted .db.enc file to Downloads folder |
| Change app-wide settings | Categories, merchant rules, default budgets — affects all users |
| Manage users | Enable/disable users. Change passwords. View last login. |

---

## SECTION 5 — LOGGING ARCHITECTURE

### 5.1 — Log System Design

Two outputs: (1) rotating log file on disk for forensics/debugging, (2) SQLite `app_logs` table for in-app viewer. Both are written simultaneously.

| Level | When to Use | Example |
|---|---|---|
| ERROR | Something broke, user impact. Always log. | Sync failed: Drive quota exceeded |
| WARN | Unexpected but handled. Log. | Conflict detected on finance_transactions row txn_abc |
| INFO | Normal important events. | Sync completed: 12 changes applied, 3 pushed |
| DEBUG | Detailed flow tracing. Off in production. | Parsing HDFC row 45: date=07/03/2026, amount=50000 |

```
// Log file location:
// Desktop (Windows): C:\Users\{user}\AppData\Local\PokiMate\logs\app-YYYY-MM-DD.log
// Mobile (Android):  /data/data/com.pokimate.app/files/logs/app-YYYY-MM-DD.log
//
// Rotation: new file each day. Keep last 7 days. Delete older.
//
// Log format (each line):
// [2026-03-10T14:30:00.123Z] [INFO]  [sync]    Sync completed: 12 applied, 3 pushed
// [2026-03-10T14:30:01.456Z] [ERROR] [finance] Failed to parse date "32/03/2026" in row 45
//
// In-app log viewer: Settings → Diagnostics → View Logs
// Filters: Level dropdown (ALL/ERROR/WARN/INFO/DEBUG) + Module dropdown + date range
// Search: full-text search on message column
// Export button: exports filtered logs as .txt file
//
// Auto-clear: logs older than 30 days deleted automatically on app start
// Log levels configurable in Settings → Diagnostics → Log Level
// Production default: INFO (DEBUG off for performance)
// Change takes effect immediately, stored in app_config
```

---

## SECTION 6 — V1 MODULE SCOPE

### 6.1 — What's In v1 (Final Scope)

| Module | Status | Key Features |
|---|---|---|
| Finance — Transactions | ✅ v1 | Add/edit/delete, filters, monthly view, search |
| Finance — Budgets | ✅ v1 | Monthly budgets per category, % used, alerts |
| Finance — Debts | ✅ v1 | Loan/credit card tracking, payoff estimate |
| Finance — Investments | ✅ v1 | Holdings, P&L, portfolio view |
| Bank Import (HDFC/SBI/ICICI/Axis/Kotak) | ✅ v1 | 4-step wizard, auto-detect, categorize, dedupe |
| Groww Import (MF + Stocks) | ✅ v1 | Separate MF + Stock XLSX import |
| Habits Tracker | ✅ v1 | Daily habits, check-in, streaks, heatmap |
| Goals Tracker | ✅ v1 | Target amount, progress, deposits timeline |
| Time Tracker | ✅ v1 | Start/stop timer, categories, weekly summary |
| Subscriptions / Bill Reminders | ✅ v1 | Renewal tracking, reminders, total monthly cost |
| Dashboard | ✅ v1 | Health score, KPIs, charts, recent activity |
| Notifications (Android) | ✅ v1 | All 7 types: local push, no internet needed |
| Sync (Google Drive) | ✅ v1 | On open + manual button, conflict resolution UI |
| Admin Control Panel | ✅ v1 | All 6 admin capabilities |
| Settings | ✅ v1 | Profile, appearance, backup, logs, security |
| Journal / Notes | ❌ v2 | Add later — not critical for day 1 |
| AI Assistant | ❌ v2 | Gemini API, add after v1 is stable |
| Multi-currency | ❌ v2 | INR only for v1 |
| Web app (public) | ❌ v2 | Desktop Tauri webview only for now |

---

## SECTION 7 — MOBILE DEEP LINK ROUTING

### 7.1 — Deep Link Scheme

All deep links use scheme: `pokimate://` — registered in `AndroidManifest.xml` and Expo `app.json`

| Deep Link URL | Opens | Triggered By |
|---|---|---|
| pokimate://dashboard | Dashboard home screen | App icon tap, weekly summary notification |
| pokimate://finance/transactions | Transactions list | Budget alert notification |
| pokimate://finance/budgets | Budgets page | Budget overspend notification |
| pokimate://finance/investments | Investments page | — |
| pokimate://habits | Habits page | Habit reminder notification, streak alert |
| pokimate://habits/:id | Specific habit detail | Habit reminder for that habit |
| pokimate://goals | Goals page | Goal milestone notification |
| pokimate://time | Time tracker | — |
| pokimate://subscriptions | Subscriptions page | Bill due reminder notification |
| pokimate://sync | Sync status screen | Sync success/failure notification |
| pokimate://settings | Settings home | — |
| pokimate://settings/logs | Log viewer | — |
| pokimate://conflicts | Conflict resolution screen | Sync conflict detected |
| pokimate://notifications | Notification center | Notification bell tap |

---

## SECTION 8 — GOOGLE CLOUD PROJECT SETUP (ONE TIME)

### 8.1 — Exact Steps to Create OAuth Credentials

> Do this ONCE before building. Takes ~10 minutes.

1. Go to https://console.cloud.google.com — sign in with `sudhakaransubramaniam0@gmail.com`
2. Click 'Select a project' → 'New Project' → Name: 'PokiMate' → Create
3. Left menu → 'APIs & Services' → 'Enable APIs' → search 'Google Drive API' → Enable
4. Left menu → 'OAuth consent screen' → User Type: External → Fill name: PokiMate, email: your gmail
5. Scopes → Add scope → search 'drive.appdata' → select it → Save
6. Test users → Add your gmail → Save
7. Left menu → 'Credentials' → 'Create Credentials' → 'OAuth 2.0 Client ID'
8. Desktop app: Application type = 'Desktop app' → Name: 'PokiMate Desktop' → Create → Copy Client ID + Secret
9. Android app: Application type = 'Android' → Package: 'com.pokimate.app' → SHA-1 from keytool → Create
10. Store Client ID + Secret in your `.env` file (never commit to git)

```env
# .env file (desktop — never commit this to git)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:7429/auth/callback

# Drive scope used: https://www.googleapis.com/auth/drive.appdata
# This scope: app can ONLY see its own files in appDataFolder
# User's regular Drive files are completely invisible to the app
# This is the correct minimal-permission scope for PokiMate

# Files stored in Drive appDataFolder:
# pokimate_changelog.json              — sync changelog
# pokimate_snapshot_YYYY-MM.db.enc     — monthly encrypted snapshots
# pokimate_device_registry.json        — list of registered devices
```

---

## SECTION 9 — CURSOR MASTER BUILD PLAN

### How To Use These Phases

- Open Cursor → New Chat → Copy the ENTIRE prompt for that phase → paste → run.
- Complete each phase fully before starting the next. Test before moving on.
- If Cursor asks a clarifying question, always say: 'follow the PokiMate architecture exactly as specified'.
- Never let Cursor add PostgreSQL, any cloud DB, Python sidecar, or remote API URLs.
- All Cursor prompts use the exact folder structure defined in Phase 0.

### Monorepo Folder Structure (Required)

```
pokimate/
├── apps/
│   ├── desktop/             # Tauri v2 app (Windows + Mac)
│   │   ├── src/             # Next.js 15 pages + components
│   │   ├── src-tauri/       # Rust backend
│   │   │   └── src/
│   │   │       ├── main.rs
│   │   │       ├── commands/
│   │   │       │   ├── auth.rs
│   │   │       │   ├── finance.rs
│   │   │       │   ├── habits.rs
│   │   │       │   ├── goals.rs
│   │   │       │   ├── sync.rs
│   │   │       │   ├── admin.rs
│   │   │       │   └── notifications.rs
│   │   │       ├── db/
│   │   │       │   └── mod.rs
│   │   │       └── models/
│   │   └── tauri.conf.json
│   └── mobile/              # Expo SDK 52 (Android only)
│       ├── src/
│       │   ├── app/         # Expo Router pages
│       │   ├── components/
│       │   ├── db/          # expo-sqlite layer
│       │   └── sync/        # Drive sync logic
│       └── app.json
├── packages/
│   ├── ui/                  # Shared React components
│   ├── shared/              # Zod schemas, money helpers, types, constants
│   └── db/                  # SQL migrations + seed data + base.db
│       ├── migrations/
│       │   ├── 001_initial.sql
│       │   └── 002_seed.sql
│       └── base.db
├── ARCHITECTURE.md          # This file
├── CURSOR_PROMPTING_GUIDE.md
├── CHANGELOG.md
├── .cursorrules
├── .gitignore
├── .env                     # Google OAuth credentials (never commit)
├── turbo.json
├── pnpm-workspace.yaml
└── Makefile
```

### Cargo.toml Dependencies (Desktop)

```toml
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-global-shortcut = "2"
tauri-plugin-window-state = "2"
rusqlite = { version = "0.31", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
bcrypt = "0.15"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
```

### Shared Packages

```typescript
// packages/shared/src/money.ts
paise(amount: number): bigint          // convert rupees to paise
formatINR(paise: bigint): string       // format paise as "₹1,234.56"

// packages/shared/src/constants.ts
APP_VERSION, DB_VERSION, DRIVE_CHANGELOG_FILE, DRIVE_SNAPSHOT_PREFIX

// packages/shared/src/types.ts
User, SyncEntry, ConflictItem, LogLevel, NotificationType

// packages/shared/src/zod-schemas.ts
TransactionSchema, HabitSchema, GoalSchema  // shared validation
```

---

## FINAL DECISION SUMMARY — ALL LOCKED

| Topic | Final Decision |
|---|---|
| Database | SQLite on each device, WAL mode, BIGINT paise for money |
| Cloud sync | Google Drive appDataFolder: JSON changelog + monthly .db.enc snapshots |
| Desktop tech | Tauri v2 + Rust SQLite commands + Next.js 15 (no Python, no server) |
| Mobile tech | Expo SDK 52 + React Native + expo-sqlite + NativeWind v4 |
| Auth | Username/password (bcrypt hashed in seeded base.db). No OAuth for login. |
| Users | admin (admin@007), poki (pokihanma@007), demo (demo007) — all seeded at install |
| Sync timing | Pull on app open + manual Sync Now button. Auto-sync in v2. |
| Conflicts | Manual resolution screen. One conflict at a time. User picks winner. |
| Currency | INR only (v1). BIGINT paise. Multi-currency in v2. |
| AI | Skip v1. Add Gemini API in v2. |
| Delete | Soft delete (deleted_at). Hidden in UI. Recoverable 30 days in Settings. |
| Logging | Local file (daily rotation, 7 days) + in-app viewer in Settings → Logs |
| Admin | All 6 capabilities: impersonate, logs, reset demo, export, settings, user mgmt |
| v1 modules | Finance + Bank Import + Groww Import + Habits + Goals + Time + Subscriptions |
| Web app | Tauri webview only (localhost). No public web app in v1. |
| Notifications | Android: all 7 types via expo-notifications (local, no internet needed) |
| Google Drive OAuth | User creates own Google Cloud Project (steps in Section 8) |

---

> **YOU ARE READY TO BUILD. START WITH PHASE 0.**
>
> - This document is the ONLY source of truth. If Cursor suggests anything different, ignore it and refer here.
> - Build order: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Never skip.
> - After Phase 1 (DB layer), you will already have a working login. That's your first milestone.
> - After Phase 6 (Sync), you have a complete working app. Phases 7–9 are polish and mobile.

*PokiMate v4 · Personal Life OS · Architecture locked March 2026*
