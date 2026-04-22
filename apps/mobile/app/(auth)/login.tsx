import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import bcrypt from 'bcryptjs';
import { getDb } from '@/db';
import { useAuthStore } from '@/store/auth';
import { colors, fontSize, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/ui';

export default function LoginScreen() {
  const router    = useRouter();
  const setUser   = useAuthStore((s) => s.setUser);

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const db   = await getDb();
      const user = await db.getFirstAsync<{
        id: string; username: string; password_hash: string;
        display_name: string | null; email: string | null; role: string; is_active: number;
      }>(
        'SELECT id, username, password_hash, display_name, email, role, is_active FROM users WHERE username = ? AND deleted_at IS NULL',
        [username.trim().toLowerCase()]
      );

      if (!user || !user.is_active) {
        Alert.alert('Login failed', 'User not found.');
        return;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        Alert.alert('Login failed', 'Incorrect password.');
        return;
      }

      setUser({
        user_id:      user.id,
        username:     user.username,
        display_name: user.display_name,
        email:        user.email,
        role:         user.role,
      });

      router.replace('/(tabs)/');
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#080b14', '#0e1320', '#080b14']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.logoIcon}
            >
              <Text style={styles.logoEmoji}>⚡</Text>
            </LinearGradient>
            <Text style={styles.logoTitle}>PokiMate</Text>
            <Text style={styles.logoSub}>Your personal life OS</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to continue</Text>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.mutedFg} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="demo"
                  placeholderTextColor={colors.mutedFg}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedFg} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedFg}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPass ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.mutedFg}
                  />
                </Pressable>
              </View>
            </View>

            <PrimaryButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={styles.signInBtn}
            />

            <Text style={styles.hint}>
              Demo: username <Text style={styles.hintBold}>demo</Text> · password <Text style={styles.hintBold}>demo007</Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },

  logoWrap:  { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoIcon:  { width: 68, height: 68, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoEmoji: { fontSize: 32 },
  logoTitle: { fontSize: fontSize['3xl'], fontWeight: '700', color: colors.foreground, letterSpacing: -0.5 },
  logoSub:   { fontSize: fontSize.sm, color: colors.mutedFg, marginTop: 4 },

  card:     { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardTitle:{ fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  cardSub:  { fontSize: fontSize.sm, color: colors.mutedFg, marginBottom: spacing.xl },

  fieldGroup:{ marginBottom: spacing.lg },
  label:    { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground, marginBottom: 6 },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.muted, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  inputIcon:{ marginLeft: spacing.md },
  input:    { flex: 1, paddingVertical: 13, paddingHorizontal: spacing.md, color: colors.foreground, fontSize: fontSize.base },
  inputFlex:{ flex: 1 },
  eyeBtn:   { padding: spacing.md },

  signInBtn: { marginTop: spacing.sm },
  hint:     { marginTop: spacing.lg, textAlign: 'center', fontSize: fontSize.xs, color: colors.mutedFg },
  hintBold: { color: colors.primary, fontWeight: '600' },
});
