import type { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';

const MAX_LEN = 1000;

/**
 * Returns the IPC error message as-is (with minimal whitespace normalization).
 * Falls back to the caller's generic message when unavailable.
 */
export function formatUserFacingErrorMessage(
	error: IpcAsyncResponse['error'] | undefined,
	fallback: string,
): string {
	const raw = error?.message ?? error?.original?.message;
	if (raw == null) return fallback;

	const msg = (typeof raw === 'string' ? raw : String(raw)).trim();
	if (!msg) return fallback;

	return msg.length > MAX_LEN ? `${msg.slice(0, MAX_LEN - 1)}…` : msg;
}


