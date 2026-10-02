import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getJson } from './api';

// Live updates over SSE (D-004). One EventSource for the app; every change message bumps a
// version number, and each panel refetches its data when the version changes. No page refresh.
const LiveContext = createContext<{ version: number; connected: boolean }>({ version: 0, connected: false });

export function LiveProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const es = new EventSource('/api/stream');
    const bump = () => setVersion((v) => v + 1);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // EventSource reconnects by itself
    for (const type of ['events.created', 'source.updated', 'delivery.updated', 'user.updated']) es.addEventListener(type, bump);
    return () => es.close();
  }, []);
  return <LiveContext.Provider value={{ version, connected }}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

// Fetches JSON and refetches on every live change. `url` null means "nothing to load yet".
// Data is kept with the URL it came from, so after the URL changes (another user) the old
// data is never returned: callers see null until the new URL has loaded.
export function useLiveJson<T>(url: string | null): { data: T | null; error: string | null; reload: () => void } {
  const { version } = useLive();
  const [state, setState] = useState<{ url: string; data: T | null; error: string | null } | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    getJson<T>(url)
      .then((d) => !cancelled && setState({ url, data: d, error: null }))
      .catch((e: Error) => !cancelled && setState((s) => ({ url, data: s?.url === url ? s.data : null, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [url, version, nonce]);
  const current = state && state.url === url ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null, reload: () => setNonce((n) => n + 1) };
}
