import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}
