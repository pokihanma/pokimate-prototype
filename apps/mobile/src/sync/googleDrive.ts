/**
 * Google Drive sync — Phase 1 (full file replace strategy)
 *
 * Flow:
 *   Upload: local pokimate.db → Google Drive as "pokimate.db"
 *   Download: Google Drive "pokimate.db" → replace local db
 *
 * Setup required:
 *   1. Create project at console.cloud.google.com
 *   2. Enable Google Drive API
 *   3. Create OAuth 2.0 credentials (Web + Android)
 *   4. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to .env
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDbPath, replaceDbWithFile } from '@/db';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID    = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const DRIVE_FOLDER = 'PokiMate';
const DB_FILE_NAME = 'pokimate.db';
const LAST_SYNC_KEY = 'pokimate_last_sync';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
};

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
];

export interface SyncStatus {
  lastSynced: string | null;
  driveModifiedAt: string | null;
  localModifiedAt: string | null;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────
export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'pokimate' });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:     CLIENT_ID,
      scopes:       SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    discovery
  );
  return { request, response, promptAsync, redirectUri };
}

// ── Drive API helpers ─────────────────────────────────────────────────────────
async function driveGet(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res;
}

async function findOrCreateFolder(token: string): Promise<string> {
  // Search for existing PokiMate folder
  const q = encodeURIComponent(`name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await driveGet(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, token);
  const data = await res.json();
  if (data.files?.length > 0) return data.files[0].id;

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function findDbFile(token: string, folderId: string): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name='${DB_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
  const res = await driveGet(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`,
    token
  );
  const data = await res.json();
  return data.files?.[0] ?? null;
}

// ── Upload .db to Drive ───────────────────────────────────────────────────────
export async function uploadToDrive(token: string): Promise<void> {
  const dbPath   = getDbPath();
  const folderId = await findOrCreateFolder(token);
  const existing = await findDbFile(token, folderId);

  // Read DB file as base64
  const base64 = await FileSystem.readAsStringAsync(dbPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const boundary = '-------314159265358979323846';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({
      name: DB_FILE_NAME,
      parents: existing ? undefined : [folderId],
    }),
    `--${boundary}`,
    'Content-Type: application/octet-stream',
    'Content-Transfer-Encoding: base64',
    '',
    base64,
    `--${boundary}--`,
  ].join('\r\n');

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body,
  });

  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);

  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

// ── Download .db from Drive ───────────────────────────────────────────────────
export async function downloadFromDrive(token: string): Promise<void> {
  const folderId = await findOrCreateFolder(token);
  const file     = await findDbFile(token, folderId);
  if (!file) throw new Error('No pokimate.db found on Google Drive. Upload first.');

  const tempPath = `${FileSystem.cacheDirectory}pokimate_import.db`;

  // Download to temp location
  const result = await FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    tempPath,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (result.status !== 200) throw new Error('Download failed');

  // Replace local DB with downloaded file
  await replaceDbWithFile(tempPath);

  // Clean up temp file
  await FileSystem.deleteAsync(tempPath, { idempotent: true });
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

// ── Get sync status ───────────────────────────────────────────────────────────
export async function getSyncStatus(token: string): Promise<SyncStatus> {
  const lastSynced = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const dbInfo     = await FileSystem.getInfoAsync(getDbPath());

  let driveModifiedAt: string | null = null;
  try {
    const folderId = await findOrCreateFolder(token);
    const file     = await findDbFile(token, folderId);
    driveModifiedAt = file?.modifiedTime ?? null;
  } catch { /* no network or not connected */ }

  return {
    lastSynced,
    driveModifiedAt,
    localModifiedAt: dbInfo.exists && 'modificationTime' in dbInfo
      ? new Date(dbInfo.modificationTime * 1000).toISOString()
      : null,
  };
}
