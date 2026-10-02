import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// Load the repo-root .env if there is one. The app must start without it (D-009),
// so a missing file is not an error. process.loadEnvFile exists since Node 20.12.
export function loadEnv(): void {
  const file = path.join(repoRoot, '.env');
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

export function config() {
  return {
    port: Number(process.env.PORT) || 3001,
    databasePath: process.env.DATABASE_PATH || path.join(repoRoot, 'app', 'server', 'data', 'sonrisa.db'),
  };
}
