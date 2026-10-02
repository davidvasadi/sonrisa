import { useEffect, useMemo, useState } from 'react';
import { type ChannelInfo, type Destination, type EventRow, type SourceCategories, type Subscription, type User, sendJson } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EventList } from '@/components/panels/event-list';
import { Section } from '@/components/panels/section';
import { useLiveJson } from '@/live';

// Result of the Slack OAuth round trip, passed back in the hash: #/?slack=connected|cancelled|error:...
function useConnectResult(): string | null {
  const [result] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('slack'));
  useEffect(() => {
    if (result) history.replaceState(null, '', '#/');
  }, [result]);
  return result;
}

export function UserView({ user }: { user: User | null }) {
  const connectResult = useConnectResult();
  if (!user) return <p className="text-muted-foreground">Pick a demo user in the sidebar.</p>;
  return (
    <div className="space-y-4">
      {connectResult && (
        <p role="status" className={`rounded-md border p-3 text-sm ${connectResult === 'connected' ? 'border-green-600' : 'border-destructive'}`}>
          {connectResult === 'connected' ? 'Slack connected.' : connectResult === 'cancelled' ? 'Slack was not connected.' : `Slack connection failed (${connectResult}).`}
        </p>
      )}
      <Subscriptions userId={user.id} />
      <Channels userId={user.id} />
      <Feed userId={user.id} />
    </div>
  );
}

function Feed({ userId }: { userId: number }) {
  const { data } = useLiveJson<EventRow[]>(`/api/users/${userId}/feed`);
  return (
    <Section title="Live feed" hint="Recent events in the categories you follow. Updates live.">
      <div className="max-h-[32rem] overflow-y-auto">
        <EventList events={data ?? []} showDeliveries />
      </div>
    </Section>
  );
}

function Subscriptions({ userId }: { userId: number }) {
  const { data: sources, error: e1 } = useLiveJson<SourceCategories[]>('/api/categories');
  const { data: channels, error: e2 } = useLiveJson<ChannelInfo[]>('/api/channels');
  const { data: saved, error: e3 } = useLiveJson<Subscription[]>(`/api/users/${userId}/subscriptions`);
  const savedKeys = useMemo(() => new Set((saved ?? []).map((s) => `${s.categoryId}|${s.channel}`)), [saved]);
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const current = draft ?? savedKeys;

  useEffect(() => setDraft(null), [userId]);

  function toggle(key: string) {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDraft(next);
  }

  async function save() {
    const body = [...current].map((k) => {
      const [categoryId, channel] = k.split('|');
      return { categoryId, channel };
    });
    try {
      await sendJson('PUT', `/api/users/${userId}/subscriptions`, body);
      setDraft(null);
      setMessage('Saved. New events in these categories will be sent to you.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  if (!sources || !channels) return <LoadState title="My alerts" error={e1 ?? e2 ?? e3} />;
  return (
    <Section title="My alerts" hint="Pick categories and the channels that deliver each one. Only events from now on are sent (D-027).">
      <div className="space-y-4">
        {sources.map((s) => (
          <div key={s.sourceId} className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-4 font-medium">{s.sourceName}</th>
                  {channels.map((c) => (
                    <th key={c.id} className="px-2 py-1 text-center font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="py-1 pr-4">{cat.label}</td>
                    {channels.map((c) => {
                      const key = `${cat.id}|${c.id}`;
                      return (
                        <td key={c.id} className="px-2 text-center">
                          <input type="checkbox" aria-label={`${cat.label} by ${c.label}`} checked={current.has(key)} onChange={() => toggle(key)} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={draft === null}>
            Save
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </div>
    </Section>
  );
}

function Channels({ userId }: { userId: number }) {
  const { data: channels, error: e1 } = useLiveJson<ChannelInfo[]>('/api/channels');
  const { data: destinations, error: e2, reload } = useLiveJson<Destination[]>(`/api/users/${userId}/destinations`);
  if (!channels || !destinations) return <LoadState title="Channels" error={e1 ?? e2} />;
  return (
    <Section title="Channels" hint="Where your alerts go. Secrets are only ever shown masked.">
      <div className="space-y-4">
        {channels.map((c) => (
          <ChannelForm key={`${userId}-${c.id}`} userId={userId} channel={c} destination={destinations.find((d) => d.channel === c.id)} onChange={reload} />
        ))}
      </div>
    </Section>
  );
}

// Rendered only from the channel's `fields` and `status`: the UI never names a channel (D-001).
function ChannelForm({ userId, channel, destination, onChange }: { userId: number; channel: ChannelInfo; destination?: Destination; onChange: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const url = `/api/users/${userId}/destinations/${channel.id}`;

  async function save(config: Record<string, string>) {
    try {
      await sendJson('PUT', url, { config });
      setValues({});
      setMessage('Saved.');
      onChange();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function remove() {
    await sendJson('DELETE', url);
    setMessage('Removed.');
    onChange();
  }

  const connect = channel.status.connect;
  return (
    <div className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-medium">{channel.label}</h3>
        <span className="text-sm text-muted-foreground">
          {destination
            ? `connected${destination.label ? ` (${destination.label})` : ''}${Object.values(destination.config).length ? `: ${Object.values(destination.config).join(', ')}` : ''}`
            : 'not connected'}
        </span>
      </div>

      {channel.fields.length === 0 ? (
        <Button variant="outline" size="sm" onClick={() => (destination ? remove() : save({}))}>
          {destination ? 'Turn off' : 'Turn on'}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {connect && (
            <span className="flex flex-col gap-1">
              <Button
                size="sm"
                disabled={!connect.enabled}
                onClick={() => {
                  window.location.href = `${connect.href}?userId=${userId}`;
                }}
              >
                Connect {channel.label}
              </Button>
            </span>
          )}
          {channel.fields.map((f) => (
            <Input
              key={f.name}
              className="max-w-sm"
              type={f.secret ? 'password' : 'text'}
              autoComplete="off"
              placeholder={connect ? `or paste a ${f.label.toLowerCase()}` : f.label}
              aria-label={f.label}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          ))}
          <Button size="sm" variant="outline" onClick={() => save(values)} disabled={channel.fields.some((f) => !values[f.name])}>
            Save
          </Button>
          {destination && (
            <Button size="sm" variant="ghost" onClick={remove}>
              Remove
            </Button>
          )}
        </div>
      )}
      {connect && !connect.enabled && connect.note && <p className="text-xs text-muted-foreground">{connect.note}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

function LoadState({ title, error }: { title: string; error: string | null }) {
  return (
    <Section title={title}>
      <p className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{error ? `Could not load: ${error}` : 'Loading…'}</p>
    </Section>
  );
}
