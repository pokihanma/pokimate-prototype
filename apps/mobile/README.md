# PokiMate Mobile

A React Native / Expo mobile app for PokiMate — your personal life OS. Track habits, goals, and finances entirely on-device with optional Google Drive backup.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native 0.76 + Expo SDK 52 | Managed workflow, fast iteration |
| Navigation | Expo Router v4 | File-based routing, same feel as Next.js |
| Styling | NativeWind v4 (Tailwind CSS) | Utility-first, design tokens |
| Animations | React Native Reanimated 3 | 60 fps on the UI thread |
| Database | expo-sqlite v15 (async API) | Same SQLite schema as desktop app |
| Server State | TanStack Query v5 | Caching, optimistic updates, refetch |
| Client State | Zustand v5 + AsyncStorage | Auth persistence across restarts |
| Auth | bcryptjs | Verifies same password hashes as desktop |
| Notifications | expo-notifications | Daily habit reminders, goal deadline alerts |
| Drive Backup | Google Drive REST API + expo-auth-session | Full `.db` file upload/download |
| Build | EAS Build | APK (debug/preview) and AAB (production) |

---

## Prerequisites

Install these once on your machine:

```bash
# Node.js (LTS, 20+)
https://nodejs.org

# pnpm (package manager used by this monorepo)
npm install -g pnpm

# Expo CLI
npm install -g expo-cli

# EAS CLI (for building APK/AAB)
npm install -g eas-cli
eas login   # sign in with your Expo account
```

### Android development
1. Install [Android Studio](https://developer.android.com/studio)
2. Inside Android Studio → SDK Manager, install:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34
   - Android Emulator
3. Create a virtual device (AVD) or plug in a physical device with USB debugging enabled
4. Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or Windows Environment Variables):
   ```
   ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk   (Windows)
   ANDROID_HOME = ~/Library/Android/sdk                       (macOS)
   PATH += $ANDROID_HOME/platform-tools
   ```

### Java (JDK)
EAS local builds need JDK 17:
```bash
# Windows — install from https://adoptium.net
# macOS
brew install openjdk@17
```

---

## Installation

All commands run from the **monorepo root** (`pokimate-prototype/`).

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. (First time only) Generate the Expo native project files
cd apps/mobile
npx expo prebuild --clean   # creates android/ and ios/ folders
```

---

## Running in Development

### Option A — Expo Go (fastest, limited features)
> ⚠️  expo-sqlite local DB and expo-notifications require a dev build; Expo Go will not work for these.

### Option B — Development build (recommended)

```bash
# Build a debug APK and install it on your device/emulator
cd apps/mobile
eas build --platform android --profile development --local

# Then start the dev server
pnpm --filter @pokimate/mobile dev
# or
cd apps/mobile && npx expo start
```

The dev build acts like Expo Go but includes all native modules. Scan the QR code or press `a` to open on the emulator.

### Environment variable (Google Drive)

Create `apps/mobile/.env.local`:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your-android-oauth-client-id>
```

See the **Google Drive Setup** section below for how to get this value.

---

## Building APK / AAB for Distribution

### Preview APK (good for sharing/testing)
```bash
cd apps/mobile
eas build --platform android --profile preview
```
Downloads a signed `.apk` you can install directly.

### Production AAB (for Play Store)
```bash
eas build --platform android --profile production
```
Downloads an `.aab` bundle for the Play Store.

### Local build (no EAS server required)
```bash
eas build --platform android --profile preview --local
```
Requires Android SDK + JDK installed locally.

### Build profiles (`eas.json`)
| Profile | Output | Use case |
|---|---|---|
| `development` | APK debug + dev client | Day-to-day development |
| `preview` | APK signed | Internal testing / side-loading |
| `production` | AAB | Play Store submission |

---

## Google Drive Setup

To enable the database backup/restore feature:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (e.g., "PokiMate")
3. Enable the **Google Drive API**:
   - APIs & Services → Library → search "Google Drive API" → Enable
4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Android**
   - Package name: `com.pokimate.mobile` (must match `app.json`)
   - SHA-1 fingerprint: run `keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android -keypass android` and copy the SHA-1
5. Copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
6. Paste it into `apps/mobile/.env.local`:
   ```
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   ```
7. Add `https://auth.expo.io` to the **Authorized redirect URIs** in OAuth consent screen

> **Note:** The Drive sync uses last-write-wins. Always upload before switching devices to avoid data loss.

---

## Project Structure

```
apps/mobile/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout (fonts, DB init, auth gate)
│   ├── index.tsx               # Redirect → tabs or login
│   ├── (auth)/
│   │   └── login.tsx           # Login screen
│   └── (tabs)/
│       ├── _layout.tsx         # Bottom tab bar
│       ├── index.tsx           # Dashboard
│       ├── habits.tsx          # Habits tracker
│       ├── goals.tsx           # Goals tracker
│       ├── finance.tsx         # Finance tracker
│       └── settings.tsx        # Settings + Drive sync
├── src/
│   ├── components/ui/          # Card, Button, Badge, KpiCard, ProgressBar, …
│   ├── db/
│   │   ├── schema.ts           # Full SQL schema (CREATE TABLE IF NOT EXISTS)
│   │   └── index.ts            # getDb(), getDbPath(), replaceDbWithFile()
│   ├── hooks/
│   │   ├── useHabits.ts
│   │   ├── useGoals.ts
│   │   └── useFinance.ts
│   ├── notifications/
│   │   └── reminders.ts        # scheduleHabitReminder, scheduleGoalReminder, …
│   ├── store/
│   │   └── auth.ts             # Zustand auth store with AsyncStorage persistence
│   ├── sync/
│   │   └── googleDrive.ts      # OAuth, uploadToDrive, downloadFromDrive
│   └── theme.ts                # Design tokens (colors, spacing, radius, …)
├── global.css                  # NativeWind base styles
├── app.json                    # Expo app config
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
└── eas.json
```

---

## Database

The app uses **expo-sqlite** with the same schema as the desktop app. On first launch the database is created at:

```
# Android
/data/data/com.pokimate.mobile/files/SQLite/pokimate.db
```

The schema uses `CREATE TABLE IF NOT EXISTS` everywhere, so it's safe to open a database that was imported from the desktop app or another device.

### Importing a desktop database

1. On desktop: find `pokimate.db` in your app data folder
2. Copy it to your phone (via USB or cloud)
3. In the mobile app: **Settings → Import database** → pick the file
4. Restart the app

---

## Debugging

### Metro bundler
```bash
# Start Metro with verbose logging
cd apps/mobile
npx expo start --clear
```

### Android Logcat
```bash
# Stream all logs
adb logcat

# Filter to your app only
adb logcat --pid=$(adb shell pidof com.pokimate.mobile)

# Filter React Native JS errors
adb logcat | grep -E "ReactNativeJS|ERROR"
```

### Flipper (optional)
Install [Flipper](https://fbflipper.com/) for network inspection, React Query devtools, and SQLite browser.

### Common issues

| Problem | Fix |
|---|---|
| `Unable to resolve module …` | Run `npx expo start --clear` to clear Metro cache |
| White screen on launch | Check `adb logcat` for JS errors; usually a missing import or hook error |
| SQLite errors on import | Make sure the `.db` file is not corrupted and matches the expected schema |
| Google Drive auth fails | Verify the SHA-1 fingerprint and package name in Google Cloud Console |
| Notifications not firing | On Android 13+, grant POST_NOTIFICATIONS permission manually in system settings |
| `SCHEDULE_EXACT_ALARM` denied | Grant "Alarms & reminders" permission for the app in Android Settings |
| Build fails with JDK error | Ensure `JAVA_HOME` points to JDK 17, not another version |

### React Query DevTools
Add to `app/_layout.tsx` during development:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools/native';
// inside the QueryClientProvider:
<ReactQueryDevtools initialIsOpen={false} />
```

---

## Notifications

Habit reminders: set a time (HH:MM) when creating a habit → daily notification fires every day at that time.

Goal reminders: set a date when creating a goal → one-time notification fires the morning of that date.

All reminders are cancelled on logout.

On Android, the app requests notification permissions on first launch. If denied, reminders won't fire — the user can grant them later in system settings.

---

## Releasing to Play Store

1. Build production AAB: `eas build --platform android --profile production`
2. Download the `.aab` from the EAS dashboard
3. Create an app in [Google Play Console](https://play.google.com/console)
4. Upload to Internal Testing → promote to Production when ready

---

## Useful Commands Cheatsheet

```bash
# Install deps (run from repo root)
pnpm install

# Start dev server
cd apps/mobile && npx expo start

# Open on connected Android device
npx expo start --android

# Clear all caches and restart
npx expo start --clear

# Build preview APK via EAS
eas build -p android --profile preview

# Build locally (needs JDK + Android SDK)
eas build -p android --profile preview --local

# List running EAS builds
eas build:list

# Run TypeScript type-check
cd apps/mobile && npx tsc --noEmit

# Lint
cd apps/mobile && npx eslint . --ext .ts,.tsx
```
