// One fetch wrapper for every backend call (APP_API_GUIDE.md §1). Reads the token fresh on each request.
import { API_URL } from './config';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail?: string,
  ) {
    super(detail || `Request failed (${status})`);
  }
}

async function token(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}`, ...init.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach Echo. Check your connection and try again.");
  }
  if (res.status === 401) {
    // Expired or revoked: the auth listener in the store sends the user back to sign-in.
    await supabase.auth.signOut();
    throw new ApiError(401, 'Your session expired. Sign in again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof body.detail === 'string' ? body.detail : undefined);
  }
  return res.json();
}

export const get = <T>(path: string) => api<T>(path);
export const send = <T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Message to show for a failed call: the server's `detail`, or a generic line by status. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'Not found.';
    if (e.status === 500) return e.detail ?? 'Something went wrong on our side. Try again in a few seconds.';
    return e.detail ?? 'Something went wrong.';
  }
  return e instanceof Error ? e.message : String(e);
}
