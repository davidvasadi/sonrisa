import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// The API runs on PORT (default 3001); the browser only talks to Vite, which proxies /api.
// HTTPS=1 serves the app on https://localhost:5173 with a self-signed certificate. Only needed for
// the Connect Slack button: Slack requires an HTTPS redirect URI (Q5). Off by default.
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.HTTPS === '1' ? [basicSsl()] : [])],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    strictPort: true, // SLACK_REDIRECT_URI assumes :5173; fail loudly rather than move to another port
    proxy: { '/api': `http://localhost:${process.env.PORT || 3001}` },
  },
});
