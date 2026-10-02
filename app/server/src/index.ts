import './node-version.js'; // must stay the first import
import { config, loadEnv } from './env.js';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';
import { startWorker } from './worker.js';
import { sources } from './sources/index.js';
import { createChannels } from './channels/index.js';
import { failInterrupted } from './dispatch.js';

loadEnv();
const { port, databasePath } = config();

const db = openDb(databasePath);
seed(db);
const channels = createChannels({ db, env: process.env, log: console.log });
const interrupted = failInterrupted(db);
if (interrupted) console.log(`dispatch: ${interrupted} interrupted deliveries marked failed (outcome unknown)`);
console.log(`channels: ${channels.map((c) => `${c.id} (${c.status?.().note ?? 'ready'})`).join(', ')}`);
const worker = startWorker(db, sources, { channels });
const server = createApp(db, { sources, channels }).listen(port, () => {
  console.log(`api: listening on http://localhost:${port} (database ${databasePath})`);
});

// Ctrl+C: open SSE streams would keep server.close() waiting forever, and a poll still running
// would hit a closed database. So close every connection and exit at once. A delivery cut off
// mid-send stays pending; at the next start it is marked failed with "outcome unknown", because
// Slack or SMTP may already have received it (design F8).
function shutdown() {
  worker.stop();
  server.closeAllConnections();
  server.close();
  db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
