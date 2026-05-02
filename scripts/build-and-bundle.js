import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Step 1: Run Astro build
console.log('Building Astro project...');
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} catch (e) {
  console.error('Astro build failed');
  process.exit(1);
}

// Step 2: Create combined worker entry
const combinedWorker = `
// Polyfill MessageChannel for Cloudflare Workers runtime
if (typeof MessageChannel === 'undefined') {
  class MessageChannel {
    constructor() {
      this.port1 = { onmessage: null, postMessage: (msg) => {
        setTimeout(() => this.port2.onmessage?.({ data: msg }), 0);
      }};
      this.port2 = { onmessage: null, postMessage: (msg) => {
        setTimeout(() => this.port1.onmessage?.({ data: msg }), 0);
      }};
    }
  }
  globalThis.MessageChannel = MessageChannel;
}

import { Server, routePartykitRequest } from 'partyserver';

// Globe Server class
export class Globe extends Server {
  onConnect(conn, ctx) {
    const latitude = ctx.request.cf?.latitude;
    const longitude = ctx.request.cf?.longitude;
    if (!latitude || !longitude) {
      console.warn(\`Missing position for \${conn.id}\`);
      return;
    }
    const position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      id: conn.id,
    };
    conn.setState({ position });

    for (const connection of this.getConnections()) {
      try {
        conn.send(JSON.stringify({
          type: "add-marker",
          position: connection.state?.position,
        }));
        if (connection.id !== conn.id) {
          connection.send(JSON.stringify({
            type: "add-marker",
            position,
          }));
        }
      } catch {
        // ignore
      }
    }
  }

  onClose(connection) {
    this.broadcast(JSON.stringify({
      type: "remove-marker",
      id: connection.id,
    }), [connection.id]);
  }

  onError(connection) {
    this.onClose(connection);
  }
}

// Import Astro handler
const { default: astroHandler } = await import('./_worker.js/index.js');

export default {
  async fetch(request, env, ctx) {
    const partyResponse = await routePartykitRequest(request, { ...env });
    if (partyResponse) return partyResponse;
    return astroHandler.fetch(request, env, ctx);
  }
};
`;

writeFileSync(resolve(root, 'dist/worker.js'), combinedWorker);
console.log('Combined worker written to dist/worker.js');
