// Polyfill MessageChannel for Cloudflare Workers (React needs it)
if (typeof MessageChannel === 'undefined') {
  class PolyfillMessagePort {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    #closed = false;
    #listeners = new Set<(event: { data: unknown }) => void>();
    #target: PolyfillMessagePort | null = null;

    setTarget(target: PolyfillMessagePort) {
      this.#target = target;
    }

    postMessage(data: unknown) {
      const target = this.#target;
      if (!target || target.#closed) {
        return;
      }

      queueMicrotask(() => {
        if (target.#closed) {
          return;
        }

        const event = { data };
        target.onmessage?.(event);
        for (const listener of target.#listeners) {
          listener(event);
        }
      });
    }

    addEventListener(type: string, listener: (event: { data: unknown }) => void) {
      if (type === 'message') {
        this.#listeners.add(listener);
      }
    }

    removeEventListener(type: string, listener: (event: { data: unknown }) => void) {
      if (type === 'message') {
        this.#listeners.delete(listener);
      }
    }

    start() {}

    close() {
      this.#closed = true;
      this.#listeners.clear();
      this.onmessage = null;
    }
  }

  class PolyfillMessageChannel {
    port1 = new PolyfillMessagePort();
    port2 = new PolyfillMessagePort();

    constructor() {
      this.port1.setTarget(this.port2);
      this.port2.setTarget(this.port1);
    }
  }

  (globalThis as unknown as Record<string, unknown>).MessageChannel = PolyfillMessageChannel;
}

import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { routePartykitRequest } from 'partyserver';

import { Globe } from "./server/index";

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
        const partyResponse = await routePartykitRequest(request, env as Record<string, unknown>);
        if (partyResponse) {
          return partyResponse;
        }
        return handle(manifest, app, request, env, ctx);
      },
    },
    Globe,
  };
}
