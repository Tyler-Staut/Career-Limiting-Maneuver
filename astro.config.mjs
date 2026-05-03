import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    runtime: 'advanced',
    workerEntryPoint: {
      path: './src/worker-entry.ts',
      namedExports: ['Globe'],
    },
  }),
  integrations: [react()],
  vite: {
    resolve: {
      alias: import.meta.env.PROD ? {
        'react-dom/server': 'react-dom/server.edge',
      } : undefined,
    },
  },
});
