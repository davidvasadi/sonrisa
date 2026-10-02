export type User = { id: number; name: string };
export type Category = { id: string; key: string; label: string; declared: boolean };
export type SourceCategories = { sourceId: string; sourceName: string; categories: Category[] };
export type ChannelInfo = {
  id: string;
  label: string;
  fields: { name: string; label: string; secret: boolean }[];
  status: { available: boolean; note?: string; connect?: { enabled: boolean; href: string; note?: string } };
};
export type Destination = { channel: string; label: string | null; config: Record<string, string> };
export type Subscription = { categoryId: string; channel: string; createdAt?: string };
export type EventRow = {
  id: number;
  sourceName: string;
  title: string;
  link: string | null;
  severity: string | null;
  locationText: string | null;
  occurredAt: string | null;
  publishedAt: string | null;
  ingestedAt: string;
  isDemo: number;
  isForecast: number;
  notify: number;
  categories: string[];
  deliveries?: { channel: string; status: string }[];
};

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Sends JSON; returns the parsed body, or throws with the server's error message.
export async function sendJson<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '–');
