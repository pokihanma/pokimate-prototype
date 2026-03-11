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
**Date:** 2026-03-11
**Status:** ✅ Done
**Built:**
- **PART A — Rust: `get_dashboard_summary(user_id, month)`** in `apps/desktop/src-tauri/src/commands/dashboard_commands.rs`: Full `DashboardSummary` struct with nested structs for `HealthScore` (6 components), `DashboardKpis`, `NetWorthPoint` (12-month trend), `CashflowPoint` (6-month trend), `ExpenseCategory`, `BudgetStatus`, `HabitToday` (with streak), `GoalProgress`, `UpcomingBill`, `DashboardTransaction`. All 6 health score components (Savings Rate 20pts, Emergency Fund 20pts, Debt Ratio 15pts, Budget Adherence 15pts, Investment Habit 15pts, Goal Progress 15pts) implemented in pure integer arithmetic (no floats). `conflicts_count` and `pending_sync_count` from DB. Replaced old `dashboard_get_summary` stub; updated `lib.rs` handler registration.
- **PART B — Shared types**: `DashboardSummary` and all nested TypeScript interfaces added to `packages/shared/src/types.ts`.
- **PART C — TanStack Query provider**: `apps/desktop/src/app/providers.tsx` wrapped with `QueryClientProvider` (staleTime 5 min, refetchOnWindowFocus). `useDashboard(month)` hook in `apps/desktop/src/hooks/useDashboard.ts` → `invokeWithToast('get_dashboard_summary', { user_id, month })`.
- **PART D — Topbar month picker**: `Topbar.tsx` extended with optional `actions` slot. `TopbarActionsContext.tsx` context provider lets dashboard page inject month picker without layout prop-drilling. `DashboardLayout` updated to use context. `MonthPicker` component in `apps/desktop/src/components/dashboard/MonthPicker.tsx` (chevron prev/next, disables future months).
- **PART E — Dashboard page** `apps/desktop/src/app/(dashboard)/dashboard/page.tsx`: Row 0 — health ring (animated count-up via Framer Motion useSpring + useTransform) with 5-band color scale, click → `HealthScoreSheet` slide-up with 6 component breakdown + score history line chart. Quick actions: Add Transaction, Check Habit, Start Timer (navigate), Import Bank (visual-only, Phase 4), Sync. Row 1 — 6 KPI cards (Net Worth, Income, Expense, Savings Rate, Investments, Debt). Row 2 — 12-month area chart + expense donut (Recharts, CSS variable fills). Row 3 — 6-month cashflow bar chart + budget progress bars. Row 4 — goals progress, today's habits with streaks, upcoming bills (30 days). Row 5 — recent transactions DataTable (10 rows). Amber conflict banner when `conflicts_count > 0`. Full LoadingShimmer skeleton while fetching. EmptyState for all sections with no data.
- **Dependencies added to `apps/desktop`**: `@tanstack/react-query ^5.x`, `framer-motion ^12.x`, `recharts ^2.15.x`, `@tanstack/react-table ^8.x`.
**Decisions:**
- Route group stays `(dashboard)` (not `(app)`) to match existing Phase 2 shell and routes.
- Color conflict: `ARCHITECTURE.md` stores category colors as DB hex values; `.cursorrules` requires CSS variables in components. Resolution: raw colors kept in backend payload; dashboard frontend ignores them and uses `var(--chart-1..5)` for all chart fills (frontend mapping layer).
- `Import Bank` quick action is visual-only (disabled) — no import route exists until Phase 4.
- `teal` color band (81–95 health score) maps to `var(--chart-5)` (purple) since no teal CSS variable is defined in the theme.
- Health score history line chart shows empty state until Phase 9 (no history table in schema yet); sheet still renders component breakdown.
- Net worth trend computed by working backwards from current account balances using cumulative monthly net cash flows.
**Known issues:** Cargo not in PATH in some Windows shells (same as Phase 1). Pre-existing TypeScript errors in `packages/ui` and `packages/shared/zod-schemas.ts` (missing peer type declarations) are not introduced by Phase 3.

---

## Phase 2 — Theme + App Shell + Login
**Date:** 2026-03-09
**Status:** ✅ Done
**Built:**
- **PART A** — `apps/desktop/src/globals.css`: Full light/dark theme via CSS variables (--background, --foreground, --card, --border, --primary, --muted, --accent, --destructive, --sidebar-*, --chart-1..5, etc.). Tailwind v4 @theme mapping. Global transition for background-color and border-color. Class-based dark (`.dark`) for next-themes.
- **PART B** — App shell: `(dashboard)/layout.tsx` with Sidebar (240px / 64px collapsible), Topbar (56px), SyncPanel drawer (320px), NotificationDrawer (380px). Sidebar: logo + version badge, nav (Dashboard; Finance accordion — Transactions, Budgets, Debts, Investments; Habits, Goals, Time, Subscriptions, Settings), bottom user block + UserMenu. Topbar: dynamic page title + breadcrumb, SyncStatusBadge (shell states), NotificationBell, ThemeToggle (Light/System/Dark), UserMenu. Route structure: `(auth)/login`, `(dashboard)/*`, root redirect.
- **PART C** — `packages/ui`: KPICard, MoneyDisplay (paise → formatINR), MoneyInput (rupee input → paise bigint), DataTable (TanStack Table v8, sortable, row click), StatRing (SVG gauge 0–100, color by range), EmptyState, LoadingShimmer, ConfirmDialog. All exported from index; colors via CSS variables.
- **PART D** — `apps/desktop/src/app/(auth)/login/page.tsx`: Centered card, username/password, show/hide password, Login → auth_login, token in sessionStorage, redirect to /dashboard, "Try Demo" (demo/demo007), inline error message.
- **PART E** — `apps/desktop/src/store/auth.ts`: Zustand store (user, token, isLoading, login, logout, impersonate placeholder). Hydration in `providers.tsx`: sessionStorage token → auth_get_session → restore. Protected routes: dashboard layout redirects to /login if no token. `packages/shared/src/types.ts`: SessionInfo type. `apps/desktop/src/lib/tauri.ts`: invokeWithToast (invoke + Sonner on error).
**Decisions:** Token = session_id; use auth_get_session(session_id) for restore. Version badge from APP_VERSION/package.json. SyncStatusBadge and NotificationDrawer are UI shells only (Phase 6/7 for real logic).
**Known issues:** None.

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
