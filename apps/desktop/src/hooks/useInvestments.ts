import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InvAsset, InvHolding, InvPrice, HoldingWithPnL, GrowwMFPreviewRow, GrowwStockPreviewRow } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useInvAssets() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<InvAsset[]>({
    queryKey: ['inv_assets', userId],
    queryFn: () => invokeWithToast<InvAsset[]>('inv_list_assets', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvHoldings() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<InvHolding[]>({
    queryKey: ['inv_holdings', userId],
    queryFn: () => invokeWithToast<InvHolding[]>('inv_list_holdings', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortfolio(): { data: HoldingWithPnL[]; isLoading: boolean } {
  const { data: assets = [], isLoading: la } = useInvAssets();
  const { data: holdings = [], isLoading: lh } = useInvHoldings();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const data: HoldingWithPnL[] = holdings
    .filter((h) => assetMap.has(h.asset_id))
    .map((h) => {
      const asset = assetMap.get(h.asset_id)!;
      // Without live prices, current value = total invested (placeholder)
      const current_value_minor = h.total_invested_minor;
      const pnl_minor = current_value_minor - h.total_invested_minor;
      const pnl_percent_bp =
        h.total_invested_minor > 0
          ? Math.round((pnl_minor / h.total_invested_minor) * 10000)
          : 0;
      return {
        holding: h,
        asset,
        current_price_minor: h.avg_cost_minor,
        current_value_minor,
        pnl_minor,
        pnl_percent_bp,
      };
    });

  return { data, isLoading: la || lh };
}

export function useImportGrowwMF() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: { file_b64: string }) =>
      invokeWithToast<GrowwMFPreviewRow[]>('import_groww_mf', {
        user_id: user?.user_id,
        file_b64: args.file_b64,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv_assets'] });
      qc.invalidateQueries({ queryKey: ['inv_holdings'] });
    },
  });
}

export function useImportGrowwStocks() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: { file_b64: string }) =>
      invokeWithToast<GrowwStockPreviewRow[]>('import_groww_stocks', {
        user_id: user?.user_id,
        file_b64: args.file_b64,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv_assets'] });
      qc.invalidateQueries({ queryKey: ['inv_holdings'] });
    },
  });
}
