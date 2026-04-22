import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, radius, fontSize } from '@/theme';

interface ButtonProps {
  label: string; onPress: () => void;
  loading?: boolean; disabled?: boolean;
  style?: ViewStyle; fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({ label, onPress, loading, disabled, style, fullWidth }: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.primary, fullWidth && styles.full, (disabled || loading) && styles.disabled, animStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.primaryText}>{label}</Text>
      }
    </AnimatedPressable>
  );
}

export function GhostButton({ label, onPress, disabled, style, fullWidth }: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.ghost, fullWidth && styles.full, disabled && styles.disabled, animStyle, style]}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryText: { color: '#fff', fontSize: fontSize.base, fontWeight: '600' },
  ghostText:   { color: colors.foreground, fontSize: fontSize.base, fontWeight: '500' },
  disabled:    { opacity: 0.5 },
  full:        { width: '100%' },
});
