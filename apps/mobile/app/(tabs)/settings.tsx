import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '@/store/auth';
import { getDbPath, replaceDbWithFile } from '@/db';
import { useGoogleAuth, uploadToDrive, downloadFromDrive, getSyncStatus } from '@/sync/googleDrive';
import { cancelAllReminders } from '@/notifications/reminders';
import { Card } from '@/components/ui';
import { colors, fontSize, spacing, radius } from '@/theme';

const APP_VERSION = '1.0.0';

// ── Row components ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon, iconColor = colors.primary, label, sublabel, right, onPress, destructive,
}: {
  icon: string; iconColor?: string; label: string; sublabel?: string;
  right?: React.ReactNode; onPress?: () => void; destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, destructive && { color: colors.destructive }]}>{label}</Text>
        {sublabel ? <Text style={styles.settingSubLabel}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} /> : null)}
    </Pressable>
  );
}

// ── Google Drive Sync section ─────────────────────────────────────────────────
function DriveSync() {
  const { request, promptAsync, token, loading: authLoading } = useGoogleAuth();
  const [status, setStatus] = useState<{ lastSynced: string | null; driveModifiedAt: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const refreshStatus = async (t: string) => {
    try {
      const s = await getSyncStatus(t);
      setStatus(s);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (token) refreshStatus(token);
  }, [token]);

  const handleUpload = async () => {
    if (!token) { await promptAsync(); return; }
    Alert.alert(
      'Upload to Google Drive',
      'This will overwrite the backup on Drive with your current local data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            setUploading(true);
            try {
              await uploadToDrive(token);
              await refreshStatus(token);
              Alert.alert('Done', 'Database uploaded to Google Drive.');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Upload failed.');
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  const handleDownload = async () => {
    if (!token) { await promptAsync(); return; }
    Alert.alert(
      'Download from Google Drive',
      '⚠️  This will REPLACE your current local data with the Drive backup. All unsaved local changes will be lost. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace & Download',
          style: 'destructive',
          onPress: async () => {
            setDownloading(true);
            try {
              await downloadFromDrive(token);
              await refreshStatus(token);
              Alert.alert('Done', 'Database replaced from Google Drive. Restart the app to see changes.');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Download failed.');
            } finally {
              setDownloading(false);
            }
          },
        },
      ],
    );
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString();
  };

  return (
    <Card style={styles.card}>
      <View style={styles.driveTitleRow}>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text style={styles.driveTitle}>Google Drive Sync</Text>
        {token && <View style={styles.connectedDot} />}
      </View>

      {token ? (
        <>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Last synced</Text>
            <Text style={styles.syncStatusValue}>{fmtDate(status?.lastSynced ?? null)}</Text>
          </View>
          {status?.driveModifiedAt && (
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncStatusLabel}>Drive version</Text>
              <Text style={styles.syncStatusValue}>{fmtDate(status.driveModifiedAt)}</Text>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.driveHint}>
          Connect your Google account to back up and sync your PokiMate database across devices.
        </Text>
      )}

      <View style={styles.driveButtons}>
        <Pressable
          style={[styles.driveBtn, { backgroundColor: colors.primary }]}
          onPress={handleUpload}
          disabled={uploading || authLoading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
          <Text style={styles.driveBtnText}>{token ? 'Upload' : 'Connect & Upload'}</Text>
        </Pressable>

        {token && (
          <Pressable
            style={[styles.driveBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading
              ? <ActivityIndicator color={colors.foreground} size="small" />
              : <Ionicons name="cloud-download-outline" size={16} color={colors.foreground} />}
            <Text style={[styles.driveBtnText, { color: colors.foreground }]}>Download</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.driveWarning}>
        ⚠️  Last-write-wins — make sure you upload before switching devices.
      </Text>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleExportDb = async () => {
    try {
      const dbPath = getDbPath();
      const available = await Sharing.isAvailableAsync();
      if (!available) { Alert.alert('Not available', 'Sharing is not available on this device.'); return; }
      await Sharing.shareAsync(dbPath, {
        mimeType: 'application/x-sqlite3',
        dialogTitle: 'Export PokiMate database',
        UTI: 'public.database',
      });
    } catch (e: any) {
      Alert.alert('Export failed', e.message);
    }
  };

  const handleImportDb = async () => {
    Alert.alert(
      'Import database',
      '⚠️  This will REPLACE all your current data with the selected file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/x-sqlite3', 'application/octet-stream', '*/*'],
                copyToCacheDirectory: true,
              });
              if (result.canceled) return;
              const uri = result.assets[0].uri;
              await replaceDbWithFile(uri);
              Alert.alert('Done', 'Database imported. Please restart the app to load the new data.');
            } catch (e: any) {
              Alert.alert('Import failed', e.message);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.display_name ?? user?.username ?? 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.display_name ?? user?.username}</Text>
            <Text style={styles.profileRole}>{user?.role ?? 'user'}</Text>
          </View>
        </Card>

        {/* Sync */}
        <SectionHeader title="SYNC" />
        <DriveSync />

        {/* Data */}
        <SectionHeader title="DATA" />
        <Card style={styles.card}>
          <SettingRow
            icon="share-outline"
            label="Export database"
            sublabel="Share your .db file"
            onPress={handleExportDb}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="folder-open-outline"
            iconColor={colors.warning}
            label="Import database"
            sublabel="Replace all data from a .db file"
            onPress={handleImportDb}
          />
        </Card>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <Card style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Habit reminders"
            sublabel="Set per-habit in the Habits screen"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="alarm-outline"
            label="Goal reminders"
            sublabel="Set per-goal in the Goals screen"
          />
        </Card>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <Card style={styles.card}>
          <SettingRow
            icon="phone-portrait-outline"
            label="Version"
            right={<Text style={styles.valueText}>{APP_VERSION}</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="server-outline"
            label="Database"
            right={<Text style={styles.valueText}>Local SQLite</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor={colors.success}
            label="Privacy"
            right={<Text style={styles.valueText}>100% on-device</Text>}
          />
        </Card>

        {/* Logout */}
        <SectionHeader title="ACCOUNT" />
        <Card style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            iconColor={colors.destructive}
            label="Log out"
            destructive
            onPress={handleLogout}
          />
        </Card>

        <Text style={styles.footer}>PokiMate · Your personal life OS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  header:  { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  screenTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing['3xl'] },

  sectionHeader: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.mutedFg,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },

  profileCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontWeight: '800', fontSize: fontSize.xl },
  profileInfo:  { flex: 1 },
  profileName:  { fontSize: fontSize.base, fontWeight: '700', color: colors.foreground },
  profileRole:  { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2, textTransform: 'capitalize' },

  card:    { overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  settingRow:     { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  settingIconWrap:{ width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  settingText:    { flex: 1 },
  settingLabel:   { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  settingSubLabel:{ fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2 },
  valueText:      { fontSize: fontSize.sm, color: colors.mutedFg },

  // Drive sync
  driveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.xs },
  driveTitle:    { fontSize: fontSize.base, fontWeight: '700', color: colors.foreground, flex: 1 },
  connectedDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  driveHint:     { fontSize: fontSize.xs, color: colors.mutedFg, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, lineHeight: 18 },
  syncStatusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 4 },
  syncStatusLabel:{ fontSize: fontSize.xs, color: colors.mutedFg },
  syncStatusValue:{ fontSize: fontSize.xs, color: colors.foreground, fontWeight: '500' },
  driveButtons:  { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  driveBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.lg },
  driveBtnText:  { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  driveWarning:  { fontSize: fontSize.xs, color: colors.mutedFg, paddingHorizontal: spacing.md, paddingBottom: spacing.md, lineHeight: 18 },

  footer: { textAlign: 'center', fontSize: fontSize.xs, color: colors.mutedFg, marginTop: spacing.lg },
});
