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
if (interrupted) console.log(`dispatch: ${interrupted} interrupted deliveries marked failed`);
console.log(`channels: ${channels.map((c) => `${c.id} (${c.status?.().note ?? 'ready'})`).join(', ')}`);
const worker = startWorker(db, sources, { channels });
const server = createApp(db, { sources, channels }).listen(port, () => {
  console.log(`api: listening on http://localhost:${port} (database ${databasePath})`);
});

function shutdown() {
  worker.stop();
  server.close();
  db.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
