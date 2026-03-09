import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

/**
 * Wrapper around Tauri invoke. On error, logs and shows a Sonner toast.
 * Use this for all invoke() calls in UI code per .cursorrules.
 */
export async function invokeWithToast<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    const result = await tauriInvoke<T>(cmd, args);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message);
    throw err;
  }
}
