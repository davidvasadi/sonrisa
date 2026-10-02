import type { User } from '@/api';

export function UserView({ user }: { user: User | null }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">My alerts</h1>
      <p className="text-muted-foreground">
        {user ? `Signed in as ${user.name}.` : 'Pick a demo user in the sidebar.'} Categories and channels come in M8.
      </p>
    </section>
  );
}
