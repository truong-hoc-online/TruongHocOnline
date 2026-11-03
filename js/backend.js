// Thin Supabase client (no library): anonymous sign-in, token refresh, REST + RPC calls.
// Everything here fails soft: when the backend is not configured or the network is down, calls return null
// and the game keeps working offline from localStorage.
import { BACKEND } from './config.js';

const AUTH_KEY = 'tho-auth';
const TIMEOUT_MS = 8000;

export const enabled = () => !!(BACKEND.supabaseUrl && BACKEND.supabaseAnonKey);

function readSession() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } }
function writeSession(s) { try { s ? localStorage.setItem(AUTH_KEY, JSON.stringify(s)) : localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ } }

async function call(path, { method = 'GET', body, token, headers = {} } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BACKEND.supabaseUrl.replace(/\/$/, '') + path, {
      method,
      signal: ctl.signal,
      headers: {
        apikey: BACKEND.supabaseAnonKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function keep(d) {
  if (!d?.access_token) return null;
  const s = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in ?? 3600) * 1000,
    user_id: d.user?.id ?? readSession()?.user_id,
  };
  writeSession(s);
  return s;
}

let pending = null;
// A valid access token, signing in anonymously the first time. null when offline / not configured.
export async function token() {
  if (!enabled()) return null;
  if (pending) return pending;
  pending = (async () => {
    let s = readSession();
    if (s && s.expires_at - Date.now() > 60_000) return s.access_token;
    if (s?.refresh_token) {
      const r = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } });
      if (r.ok) return keep(r.data)?.access_token ?? null;
      if (r.status === 0) return null; // offline: keep the session for later
      // refresh token rejected (revoked / expired): fall through and start a new anonymous account
    }
    const r = await call('/auth/v1/signup', { method: 'POST', body: { data: {} } });
    return r.ok ? keep(r.data)?.access_token ?? null : null;
  })();
  try { return await pending; } finally { pending = null; }
}

export const userId = () => readSession()?.user_id ?? null;

// PostgREST request as the signed-in player. Returns { ok, status, data } or null when unavailable.
export async function rest(path, opts = {}) {
  const t = await token();
  if (!t) return null;
  return call('/rest/v1/' + path, { ...opts, token: t });
}

export async function rpc(fn, args = {}) {
  const r = await rest('rpc/' + fn, { method: 'POST', body: args });
  return r?.ok ? r.data : null;
}

// Called after a transfer moved this account's data elsewhere: start over with a fresh anonymous account.
export function forgetSession() { writeSession(null); }
