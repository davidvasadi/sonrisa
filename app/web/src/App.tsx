import { AppLayout } from '@/components/layout/app-layout';
import { LiveProvider } from '@/live';
import { useCurrentUser } from '@/use-current-user';
import { useView } from '@/use-view';
import { AdminView } from '@/views/admin-view';
import { UserView } from '@/views/user-view';

export function App() {
  const view = useView();
  const { users, user, pick, error } = useCurrentUser();
  return (
    <LiveProvider>
    <AppLayout view={view} users={users} user={user} onPickUser={pick}>
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          Could not load users: {error}
        </p>
      )}
      {view === 'admin' ? <AdminView /> : <UserView user={user} />}
    </AppLayout>
    </LiveProvider>
  );
}
