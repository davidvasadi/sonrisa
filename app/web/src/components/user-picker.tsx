import type { User } from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function UserPicker({ users, user, onPick }: { users: User[]; user: User | null; onPick: (id: number) => void }) {
  return (
    <Select value={user ? String(user.id) : undefined} onValueChange={(v) => onPick(Number(v))} disabled={users.length === 0}>
      <SelectTrigger className="w-full" aria-label="Viewing as">
        <SelectValue placeholder="Pick a demo user" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
