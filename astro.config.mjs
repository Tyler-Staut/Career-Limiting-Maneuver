import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    runtime: 'advanced',
    entrypoint: './src/worker-entry.ts',
  }),
  integrations: [react()],
});
