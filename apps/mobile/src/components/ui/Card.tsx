import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '@/theme';

interface CardProps extends ViewProps { elevated?: boolean; }

export function Card({ style, elevated, ...props }: CardProps) {
  return (
    <View
      style={[styles.card, elevated && styles.elevated, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    ...shadow.cardHover,
  },
});
