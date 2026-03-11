import { useQuery } from '@tanstack/react-query';
import type { Category } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useCategories() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Category[]>({
    queryKey: ['categories', userId],
    queryFn: () => invokeWithToast<Category[]>('finance_list_categories', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 10 * 60 * 1000,
  });
}
