import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

/**
 * Returns true only when running inside the Tauri WebView.
 * At localhost:3000 in a regular browser this is false.
 */
function isTauriContext(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  );
}

/**
 * Wrapper around Tauri invoke. Always use this instead of raw invoke().
 * - If not in Tauri context: shows a toast and throws a descriptive error.
 * - On command error: shows a toast with the error and re-throws.
 */
export async function invokeWithToast<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriContext()) {
    const msg =
      'Tauri desktop runtime not found. ' +
      'Open this app with "pnpm tauri dev" instead of a browser.';
    toast.error(msg);
    throw new Error(msg);
  }
  try {
    const result = await tauriInvoke<T>(cmd, args);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message);
    throw err;
  }
}
