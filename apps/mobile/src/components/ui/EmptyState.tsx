import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '@/theme';

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
  icon:      { marginBottom: spacing.sm },
  title:     { fontSize: fontSize.lg, fontWeight: '600', color: colors.foreground, textAlign: 'center' },
  desc:      { fontSize: fontSize.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 20 },
  action:    { marginTop: spacing.md },
});
