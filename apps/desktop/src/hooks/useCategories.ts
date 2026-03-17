import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useCreateCategory() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      name: string;
      // Key must be 'type' (not 'type_'): Tauri rename_all="snake_case" strips the
      // trailing underscore from the Rust param `type_` when parsing JSON input.
      type: string;
      color?: string;
    }) =>
      invokeWithToast<Category>('finance_create_category', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
