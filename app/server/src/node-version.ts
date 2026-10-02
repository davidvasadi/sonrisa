// Imported first by index.ts, so it runs before better-sqlite3 is loaded. On Node 20 that load
// crashes the process with a segfault and no message (M9 review), so say why and stop (D-032).
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(
    `sonrisa needs Node 22.12 or newer; this is Node ${process.versions.node}. ` +
      'With nvm, run `nvm use` (see .nvmrc), then `npm install` again.',
  );
  process.exit(1);
}
