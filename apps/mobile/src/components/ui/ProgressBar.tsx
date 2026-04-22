import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, useEffect } from 'react-native-reanimated';
import { colors, radius } from '@/theme';

export function ProgressBar({ progress, color = colors.primary, height = 6 }: {
  progress: number; color?: string; height?: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1) * 100, { duration: 600 });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, animStyle, { backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.muted, overflow: 'hidden', width: '100%' },
  fill:  { height: '100%' },
});
