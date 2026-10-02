import { type EventRow, time } from '@/api';
import { Badge } from '@/components/ui/badge';

export function EventList({ events, showDeliveries = false }: { events: EventRow[]; showDeliveries?: boolean }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No events yet.</p>;
  return (
    <ul className="divide-y">
      {events.map((e) => (
        <li key={e.id} className="py-2">
          <div className="flex flex-wrap items-center gap-2">
            {e.isDemo ? <Badge>Demo</Badge> : null}
            {e.isForecast ? <Badge variant="outline">Forecast</Badge> : null}
            {e.link ? (
              <a href={e.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {e.title}
              </a>
            ) : (
              <span className="font-medium">{e.title}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {e.sourceName} · {e.categories.join(', ')} · {e.severity ? `${e.severity} · ` : ''}
            {/* When it happened or was published, not when we stored it (first-poll items all share one ingest time). */}
            {e.isForecast ? 'expected ' : ''}
            {time(e.occurredAt ?? e.publishedAt ?? e.ingestedAt)}
            {showDeliveries && e.deliveries && e.deliveries.length > 0 && (
              <> · sent to you: {e.deliveries.map((d) => `${d.channel} (${d.status})`).join(', ')}</>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
