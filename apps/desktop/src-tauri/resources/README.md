# Bundled resources

- **base.db** — Initial SQLite database (schema + seed). Committed so the app runs on any machine without running migrations. Rebuild with `pnpm db:build-base` or `make db-rebuild` if you change `packages/db/migrations/`.
