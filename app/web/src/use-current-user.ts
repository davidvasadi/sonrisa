import { useEffect, useState } from 'react';
import { getJson, type User } from './api';

// The user picker's state (D-015). No auth: the choice is remembered in this browser only.
const STORAGE_KEY = 'sonrisa.userId';

function readStored(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function useCurrentUser() {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<number | null>(readStored);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<User[]>('/api/users')
      .then((list) => {
        setUsers(list);
        setUserId((cur) => (list.some((u) => u.id === cur) ? cur : (list[0]?.id ?? null)));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  function pick(id: number) {
    setUserId(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
  }

  return { users, user: users.find((u) => u.id === userId) ?? null, pick, error };
}
