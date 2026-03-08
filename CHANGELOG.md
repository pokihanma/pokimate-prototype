# PokiMate v4 — Changelog

---

## v1.0.0 — Release Summary
**Date:** [fill in]
**Status:** 🔲 Pending
All v1 modules: Finance, Bank Import, Groww Import, Habits, Goals, Time, Subscriptions, Sync, Admin, Notifications

---

## Phase 9 — Polish + Testing
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Global error boundaries, error translation, offline handling, E2E tests
**Tests passing:** [list which tests passed]
**Fixed:** [list any bugs fixed]

---

## Phase 8 — Mobile App (Android)
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Complete Android app — all screens, local SQLite, Drive sync, local notifications
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 7 — Notifications + Settings
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** All 7 notification types, Settings page (profile, appearance, security, backup, logs, admin panel)
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 6 — Google Drive Sync
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** OAuth flow, changelog push/pull, conflict resolution screen, monthly snapshots
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 5 — Habits + Goals + Time Tracker
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Habits module (check-in, streaks, heatmap), Goals module (deposits, progress), Time Tracker (start/stop, weekly summary)
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 4 — Finance Module
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Transactions CRUD, Budgets, Debts, Investments, Bank Import wizard (HDFC/SBI/ICICI/Axis/Kotak), Groww Import
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 3 — Dashboard + Health Score
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Dashboard page, health score algorithm, KPI cards, charts (Recharts), recent activity feed
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 2 — Theme + App Shell + Login
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** CSS variables theme (light/dark), app layout shell, sidebar nav, login screen, auth flow
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 1 — Database Layer (Rust + SQLite)
**Date:** 2026-03-09
**Status:** ✅ Done
**Built:**
- **PART A** — `packages/db/migrations/001_initial.sql`: Full schema (users, auth_sessions; pending_changes, conflicts_pending, sync_cursors, app_config, app_logs; finance_accounts, categories, finance_transactions, budgets, debts, subscriptions; inv_assets, inv_holdings, inv_prices; habits, habit_checkins; goals, goal_deposits; time_entries; import_jobs, merchant_rules; notifications, notification_prefs) with all indexes. All money columns BIGINT _minor.
- **PART B** — `packages/db/migrations/002_seed.sql`: Users (usr_admin001, usr_poki001, usr_demo001) with bcrypt hashes; default Indian expense/income categories; merchant rules (Swiggy/Zomato=Food, Uber/Ola=Transport, Amazon=Shopping, Netflix/Spotify=Entertainment); 6 months demo transactions; 5 demo habits, 3 demo goals, 3 demo subscriptions for demo user; notification_prefs for demo.
- **PART C** — `apps/desktop/src-tauri/src/db/mod.rs`: init() opens SQLite, applies WAL pragmas (journal_mode=WAL, synchronous=NORMAL, foreign_keys=ON, cache_size=-32000, temp_store=MEMORY), copies base.db from resources to app data dir on first launch.
- **PART D** — All Tauri command modules: auth_commands, finance_commands, investment_commands, bank_import_commands, habits_commands, goals_commands, time_commands, dashboard_commands, settings_commands, log_commands. Helper `write_pending_change(conn, table, op, row_id, row_data)` used on every write to synced tables.
- **PART E** — Pre-built `apps/desktop/src-tauri/resources/base.db` via `packages/db/scripts/build-base-db.js` (sql.js). tauri.conf.json bundles `resources/base.db`. Makefile and pnpm scripts: `db-rebuild` / `db:build-base`.
**Decisions:** bcrypt hashes for seed generated via `packages/db/scripts/generate-hashes.js` (bcryptjs). Device ID for pending_changes set to "desktop" in Phase 1. auth_sessions not synced (no pending_changes on login/logout).
**Known issues:** Cargo not in PATH in some Windows shells; run `cargo check`/`cargo build` from a dev environment with Rust installed. Login flow can be exercised once Phase 2 (frontend) is in place.

---

## Phase 0 — Monorepo Bootstrap
**Date:** 2026-03-07
**Status:** ✅ Done
**Built:** pnpm workspaces, Turborepo, root package.json with dev/build scripts; apps/desktop (Tauri v2 + Next.js 15 static export, Tailwind v4, skeleton page); apps/mobile (Expo SDK 52 + Expo Router v4, scheme pokimate, skeleton home); packages/ui (Button stub, React peer), packages/shared (money, constants, types, zod-schemas stubs), packages/db (migrations/001_initial.sql, 002_seed.sql placeholders); Makefile (dev-desktop, dev-mobile, build-desktop, build-mobile, db-rebuild); .gitignore. .cursorrules and CHANGELOG.md already present.
**Decisions:** Tauri 2 config uses flat schema (identifier, app, build, bundle, plugins). Desktop uses protocol-asset + shell plugin only for Phase 0. Mobile created with blank-typescript then converted to Expo Router and SDK 52.
**Known issues:** `make dev-desktop` / `pnpm dev:desktop` requires Rust (cargo) and WebView2 installed. `make dev-mobile` / `pnpm dev:mobile` requires Android device or emulator for full verification. On Windows, use Git Bash or WSL for make, or use pnpm scripts directly. Mobile `expo export --platform android` may hit a react-native-screens codegen compatibility issue with Expo SDK 52/RN 0.76; `expo start` (dev server) should still run—fix or workaround in a later phase if needed.
