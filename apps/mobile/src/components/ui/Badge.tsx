import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from '@/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'muted';

const variantMap: Record<Variant, { bg: string; color: string }> = {
  success: { bg: colors.successMuted,     color: colors.success },
  warning: { bg: colors.warningMuted,     color: colors.warning },
  danger:  { bg: colors.destructiveMuted, color: colors.destructive },
  info:    { bg: 'rgba(56,189,248,0.12)', color: colors.info },
  primary: { bg: colors.primaryMuted,     color: colors.primary },
  muted:   { bg: colors.muted,            color: colors.mutedFg },
};

export function Badge({ label, variant = 'muted' }: { label: string; variant?: Variant }) {
  const v = variantMap[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text:  { fontSize: fontSize.xs, fontWeight: '600' },
});
