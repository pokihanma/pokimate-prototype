import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, fontSize, spacing } from '@/theme';

interface KpiCardProps {
  label: string; value: string; sub?: string;
  icon?: React.ReactNode; accent?: string;
}

export function KpiCard({ label, value, sub, icon, accent }: KpiCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:  { padding: spacing.lg, flex: 1 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: fontSize.xs, color: colors.mutedFg, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.foreground },
  sub:   { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2 },
});
