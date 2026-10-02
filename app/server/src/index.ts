import { config, loadEnv } from './env.js';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';
import { startWorker } from './worker.js';

loadEnv();
const { port, databasePath } = config();

const db = openDb(databasePath);
seed(db);
const worker = startWorker(db);
const server = createApp(db).listen(port, () => {
  console.log(`api: listening on http://localhost:${port} (database ${databasePath})`);
});

function shutdown() {
  worker.stop();
  server.close();
  db.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
