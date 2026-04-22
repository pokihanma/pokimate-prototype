import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { Spinner } from '@/components/ui';

export default function Index() {
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <Spinner />;
  return <Redirect href={user ? '/(tabs)/' : '/(auth)/login'} />;
}
