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
**Date:** [fill in]
**Status:** 🔲 Pending
**Built:** Complete SQLite schema (001_initial.sql), seed data (002_seed.sql), all Rust Tauri commands, base.db
**Decisions:** [any decisions made during build]
**Known issues:** [any deferred items]

---

## Phase 0 — Monorepo Bootstrap
**Date:** 2026-03-07
**Status:** ✅ Done
**Built:** pnpm workspaces, Turborepo, root package.json with dev/build scripts; apps/desktop (Tauri v2 + Next.js 15 static export, Tailwind v4, skeleton page); apps/mobile (Expo SDK 52 + Expo Router v4, scheme pokimate, skeleton home); packages/ui (Button stub, React peer), packages/shared (money, constants, types, zod-schemas stubs), packages/db (migrations/001_initial.sql, 002_seed.sql placeholders); Makefile (dev-desktop, dev-mobile, build-desktop, build-mobile, db-rebuild); .gitignore. .cursorrules and CHANGELOG.md already present.
**Decisions:** Tauri 2 config uses flat schema (identifier, app, build, bundle, plugins). Desktop uses protocol-asset + shell plugin only for Phase 0. Mobile created with blank-typescript then converted to Expo Router and SDK 52.
**Known issues:** `make dev-desktop` / `pnpm dev:desktop` requires Rust (cargo) and WebView2 installed. `make dev-mobile` / `pnpm dev:mobile` requires Android device or emulator for full verification. On Windows, use Git Bash or WSL for make, or use pnpm scripts directly. Mobile `expo export --platform android` may hit a react-native-screens codegen compatibility issue with Expo SDK 52/RN 0.76; `expo start` (dev server) should still run—fix or workaround in a later phase if needed.
