# PokiMate v4 — Changelog

---

## Known Patterns & Rules (Read Before Every Phase)

> Apply these rules to ALL remaining phases: 5, 6, 7, 8, 9.

### Rule 1 — userId Guard (MUST follow in every page)
Every page that calls `invoke()` with `userId` MUST:
1. Get user from auth store: `const user = useAuthStore((s) => s.user)`
2. Pass `user?.user_id` to the TanStack Query hook (all existing hooks already do this via `enabled: Boolean(userId)`)
3. Add guard in `queryFn`: `enabled: Boolean(userId)` so query never fires without a userId
4. Show `<LoadingShimmer />` while `isLoading` is true

**BAD** (causes "missing required key user_id" Tauri error):
```ts
// Query fires immediately with empty userId
useQuery({ queryFn: () => invoke('finance_list_transactions', { user_id: '' }) })
```

**GOOD** (pattern used in all Phase 4 hooks):
```ts
const user = useAuthStore((s) => s.user)
const userId = user?.user_id ?? ''
useQuery({
  queryKey: ['transactions', userId],
  queryFn: () => invokeWithToast('finance_list_transactions', { user_id: userId }),
  enabled: Boolean(userId),   // ← guard: never fires without a real userId
})
```

### Rule 2 — Every new page checklist
Before finishing any new page always check:
- [ ] `userId` guard added (`enabled: Boolean(userId)` in every query hook)
- [ ] `<LoadingShimmer />` shown while `isLoading` is true
- [ ] `<EmptyState />` shown when data array is empty
- [ ] All mutations use `invokeWithToast` (never raw `invoke`) — errors auto-toast
- [ ] Soft delete used everywhere (never hard delete) — call `*_soft_delete_*` commands
- [ ] `<ConfirmDialog />` shown before every delete action
- [ ] New page is added to `Sidebar.tsx` (see Rule 3)

### Rule 3 — New sidebar links
When adding a new page always add the nav link to:
`apps/desktop/src/components/shell/Sidebar.tsx`

### Rule 4 — Tauri command naming (snake_case params)
Tauri v2 **defaults to camelCase** for command parameter names when called from JS.
To use snake_case params in JS (and Rust), **every** `#[tauri::command]` **MUST** include `rename_all = "snake_case"`.
Without it you get: `"missing required key userId"` even when frontend sends `user_id`.

**ALL Rust commands must be written as:**
```rust
#[tauri::command(rename_all = "snake_case")]
pub fn my_command(user_id: String, ...) -> ...
```

**Frontend invoke must use snake_case:**
```ts
invoke('my_command', { user_id: id })   // ✅ snake_case
invoke('my_command', { userId: id })    // ❌ camelCase — only works WITHOUT rename_all
```

**Confirmed fixed in:** auth_commands, dashboard_commands (Phase 3), finance_commands, investment_commands, bank_import_commands, habits_commands, goals_commands, time_commands, settings_commands, log_commands (Phase 4 hotfix — all 60 commands).

### Rule 5 — calamine XLSX parsing (calamine 0.24+)
In calamine 0.24+, `DataType` was renamed to `Data`. Always use:
- `calamine::Data::String(s)` — not `DataType::String(s)`
- `calamine::Data::Float(f)` — not `DataType::Float(f)`
- `calamine::Data::Int(i)` — not `DataType::Int(i)`
Do NOT import `DataType` from calamine — it no longer exists.

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
**Date:** 2026-03-11
**Status:** ✅ Done
**Built:**
- **Rust — `finance_commands.rs`**: Added `finance_update_budget(id, limit_minor, alert_threshold_pct)`, `finance_update_debt(id, name, current_balance_minor, interest_rate_bp, min_payment_minor)`, `finance_update_subscription(id, name, amount_minor, billing_cycle, next_renewal_date, reminder_days_before)` — all write `pending_changes` on success.
- **Rust — `bank_import_commands.rs`**: Added `parse_bank_statement(user_id, file_name, file_b64)` — base64-decodes browser FileReader output, auto-detects bank by column headers (HDFC/SBI/ICICI/Axis/Kotak), deduplicates against existing transactions, creates `import_jobs` row, returns `ParsedStatement`. Added `confirm_bank_import(user_id, job_id, account_id, rows)` — bulk INSERTs `finance_transactions` with `pending_changes` per row.
- **Rust — `investment_commands.rs`**: Added `import_groww_mf(user_id, file_b64)` and `import_groww_stocks(user_id, file_b64)` — parse Groww XLSX via calamine, upsert `inv_assets` + `inv_holdings`, return preview rows.
- **Cargo.toml**: Added `calamine = "0.25"`, `base64 = "0.22"`, `csv = "1"`. Not in ARCHITECTURE.md but required for v1 bank import scope (Section 6.1).
- **`lib.rs`**: Registered all 9 new commands.
- **Shared types** (`packages/shared/src/types.ts`): Added all finance types including `FinanceTransaction`, `Budget`, `Debt`, `Subscription`, `InvHolding`, `HoldingWithPnL`, `ParsedStatement`, `ConfirmedRow`, `GrowwMFPreviewRow`, `GrowwStockPreviewRow` etc.
- **TanStack Query hooks** (7 new files in `apps/desktop/src/hooks/`): `useFinanceAccounts`, `useCategories`, `useTransactions`, `useBudgets`, `useDebts`, `useSubscriptions`, `useInvestments` — all with mutations and `invalidateQueries` on success.
- **Finance components** (`apps/desktop/src/components/finance/`): `TransactionSheet.tsx`, `BankImportWizard.tsx` (4-step wizard), `BudgetCard.tsx` (green/amber/red CSS vars), `DebtCard.tsx` (amortization payoff calculator), `ImportGrowwModal.tsx`, `SubscriptionCard.tsx` (urgency coloring).
- **Finance pages** (replaced all 5 stubs): `finance/transactions/page.tsx` (filter bar, DataTable, soft-delete badges, import wizard), `finance/budgets/page.tsx` (cards grid, spent from this month's transactions, threshold slider), `finance/debts/page.tsx` (cards grid, total outstanding KPI), `finance/investments/page.tsx` (4 KPIs, holdings table, Recharts donut chart), `subscriptions/page.tsx` (normalized monthly total, urgency-sorted cards).
**Decisions:**
- Browser `FileReader.readAsDataURL()` → base64 → Rust (avoids needing `tauri-plugin-dialog`/`tauri-plugin-fs`).
- `calamine`/`base64`/`csv` crates not in ARCHITECTURE.md Cargo.toml — added as required for v1 scope, flagged in plan.
- Missing Rust update commands (budget/debt/subscription) were a Phase 1 gap; added following exact same pattern as existing update commands.
- Investment current price defaults to `avg_cost_minor` (P&L = 0) until live price data is sourced; no live price fetch in v1 per ARCHITECTURE.md.
**Known issues:** None introduced by Phase 4. Pre-existing Cargo/TypeScript issues from Phase 1 remain.

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
**Bug fixes:**
- `get_dashboard_summary` Tauri command was missing `rename_all = "snake_case"` attribute, causing Tauri v2 to expect `userId` (camelCase) from JS while the frontend correctly sent `user_id` (snake_case). Fixed by changing `#[tauri::command]` → `#[tauri::command(rename_all = "snake_case")]` in `dashboard_commands.rs`, matching the same pattern used in `auth_commands.rs`.
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
