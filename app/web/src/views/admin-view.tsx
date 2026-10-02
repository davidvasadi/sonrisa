import type { User } from '@/api';
import { Badge } from '@/components/ui/badge';

export function AdminView({ users }: { users: User[] }) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <p className="text-muted-foreground">Open to anyone who can reach the app: local demo only (D-006).</p>
      <div>
        <h2 className="mb-2 font-semibold">Users</h2>
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              {u.name} <Badge variant="secondary">id {u.id}</Badge>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">Events, deliveries, sources and demo inject come in M7–M8.</p>
    </section>
  );
}
