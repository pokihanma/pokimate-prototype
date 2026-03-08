# PokiMate v4 — Phase 0+ targets
# On Windows use Git Bash or WSL to run make, or use: pnpm dev:desktop / pnpm dev:mobile etc.

.PHONY: dev-desktop dev-mobile build-desktop build-mobile db-rebuild

dev-desktop:
	cd apps/desktop && pnpm tauri dev

dev-mobile:
	cd apps/mobile && pnpm start

build-desktop:
	cd apps/desktop && pnpm tauri build

build-mobile:
	cd apps/mobile && pnpm exec expo run:android

db-rebuild:
	@echo "Run migrations when Phase 1 is done."
