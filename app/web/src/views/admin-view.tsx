import { useState } from 'react';
import { type EventRow, type SourceCategories, sendJson, time } from '@/api';
import { channelAdminPanels } from '@/channels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventList } from '@/components/panels/event-list';
import { Section, Table, Td } from '@/components/panels/section';
import { useLiveJson } from '@/live';

type AdminUser = {
  id: number;
  name: string;
  subscriptions: { categoryId: string; channel: string }[];
  destinations: { channel: string; label: string | null; config: Record<string, string> }[];
};
type Feed = { sourceId: string; feedKey: string; baselinedAt: string | null; lastAttemptAt: string | null; lastSuccessAt: string | null; lastError: string | null };
type Delivery = { id: number; eventId: number; title: string; isDemo: number; userName: string; channel: string; status: string; error: string | null; createdAt: string };

export function AdminView() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Open to anyone who can reach the app: local demo only (D-006). Updates live.</p>
      <Inject />
      <Deliveries />
      <Users />
      <Feeds />
      <Section title="Recent events">
        <div className="max-h-[32rem] overflow-y-auto">
          <RecentEvents />
        </div>
      </Section>
      {channelAdminPanels.map((Panel, i) => (
        <Panel key={i} />
      ))}
    </div>
  );
}

function Inject() {
  const { data: sources } = useLiveJson<SourceCategories[]>('/api/categories');
  const [sourceId, setSourceId] = useState('gdacs');
  const [categoryKey, setCategoryKey] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const source = sources?.find((s) => s.sourceId === sourceId);
  const key = categoryKey || source?.categories[0]?.key || '';

  async function inject() {
    try {
      const r = await sendJson<{ eventId: number; deliveries: { channel: string; status: string }[] }>('POST', '/api/admin/inject', { sourceId, categoryKey: key });
      setResult(`Event ${r.eventId}: ${r.deliveries.length ? r.deliveries.map((d) => `${d.channel} ${d.status}`).join(', ') : 'no subscribers'}`);
    } catch (e) {
      setResult((e as Error).message);
    }
  }

  return (
    <Section title="Inject a demo event" hint="A stored real item goes through the whole pipeline: normalise, store, match, deliver (D-017).">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-md border bg-transparent px-2 py-1 text-sm" value={sourceId} onChange={(e) => (setSourceId(e.target.value), setCategoryKey(''))} aria-label="Source">
          {sources?.map((s) => (
            <option key={s.sourceId} value={s.sourceId}>
              {s.sourceName}
            </option>
          ))}
        </select>
        <select className="rounded-md border bg-transparent px-2 py-1 text-sm" value={key} onChange={(e) => setCategoryKey(e.target.value)} aria-label="Category">
          {source?.categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={inject} disabled={!key}>
          Inject
        </Button>
        {result && <span className="text-sm text-muted-foreground">{result}</span>}
      </div>
    </Section>
  );
}

function Deliveries() {
  const { data } = useLiveJson<Delivery[]>('/api/admin/deliveries');
  return (
    <Section title="Deliveries" hint="Every delivery, failures included. No retries (D-030).">
      <Table head={['Time', 'User', 'Channel', 'Status', 'Event', 'Error']} empty={!data?.length}>
        {data?.map((d) => (
          <tr key={d.id}>
            <Td className="whitespace-nowrap">{time(d.createdAt)}</Td>
            <Td>{d.userName}</Td>
            <Td>{d.channel}</Td>
            <Td>
              <Badge variant={d.status === 'failed' ? 'destructive' : d.status === 'sent' ? 'secondary' : 'outline'}>{d.status}</Badge>
            </Td>
            <Td>
              {d.isDemo ? <Badge className="mr-1">Demo</Badge> : null}
              {d.title}
            </Td>
            <Td className="text-destructive">{d.error ?? ''}</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function Users() {
  const { data } = useLiveJson<AdminUser[]>('/api/admin/users');
  return (
    <Section title="Users" hint="Subscriptions and destinations. Webhook URLs are masked.">
      <Table head={['User', 'Subscriptions', 'Destinations']} empty={!data?.length}>
        {data?.map((u) => (
          <tr key={u.id}>
            <Td>{u.name}</Td>
            <Td>{u.subscriptions.length ? u.subscriptions.map((s) => `${s.categoryId} → ${s.channel}`).join(', ') : '–'}</Td>
            <Td>
              {u.destinations.map((d) => (
                <div key={d.channel}>
                  {d.channel}
                  {d.label ? ` (${d.label})` : ''}: {Object.values(d.config).join(', ') || 'on'}
                </div>
              ))}
            </Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function Feeds() {
  const { data } = useLiveJson<Feed[]>('/api/admin/feeds');
  return (
    <Section title="Source freshness" hint="Last successful fetch per feed (D-014). A dead feed shows here, not as a quiet world.">
      <Table head={['Source', 'Feed', 'Last success', 'Last attempt', 'Error']} empty={!data?.length}>
        {data?.map((f) => (
          <tr key={`${f.sourceId}/${f.feedKey}`}>
            <Td>{f.sourceId}</Td>
            <Td>{f.feedKey}</Td>
            <Td className="whitespace-nowrap">{time(f.lastSuccessAt)}</Td>
            <Td className="whitespace-nowrap">{time(f.lastAttemptAt)}</Td>
            <Td className="text-destructive">{f.lastError ?? ''}</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function RecentEvents() {
  const { data } = useLiveJson<EventRow[]>('/api/admin/events');
  return <EventList events={data ?? []} />;
}
