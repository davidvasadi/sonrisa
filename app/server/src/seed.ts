import type { Db } from './db.js';

// Demo users for the user picker (D-015). example.com is reserved and never delivers.
// Every user gets an email and a log destination, so those channels need no special
// case in the core (design F4). Safe to run on every start: existing rows are kept.
const users = [
  { id: 1, name: 'Ada', email: 'ada@example.com' },
  { id: 2, name: 'Grace', email: 'grace@example.com' },
  { id: 3, name: 'Linus', email: 'linus@example.com' },
];

export function seed(db: Db): void {
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)');
  const insertDestination = db.prepare(
    'INSERT OR IGNORE INTO destinations (user_id, channel, config, label) VALUES (?, ?, ?, ?)',
  );
  db.transaction(() => {
    for (const u of users) {
      insertUser.run(u.id, u.name);
      insertDestination.run(u.id, 'email', JSON.stringify({ address: u.email }), null);
      insertDestination.run(u.id, 'log', JSON.stringify({}), null);
    }
  })();
}
