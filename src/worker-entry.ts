import { routePartykitRequest } from "partyserver";

export { Globe } from "./server/index";

type MessageListener = (event: { data: unknown }) => void;

const runtimeGlobal = globalThis as typeof globalThis & {
  MessageChannel?: new () => {
    port1: unknown;
    port2: unknown;
  };
};

if (typeof runtimeGlobal.MessageChannel === "undefined") {
  class PolyfillMessagePort {
    onmessage: MessageListener | null = null;
    #closed = false;
    #listeners = new Set<MessageListener>();
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

    addEventListener(type: string, listener: MessageListener) {
      if (type === "message") {
        this.#listeners.add(listener);
      }
    }

    removeEventListener(type: string, listener: MessageListener) {
      if (type === "message") {
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

  runtimeGlobal.MessageChannel = class PolyfillMessageChannel {
    port1 = new PolyfillMessagePort();
    port2 = new PolyfillMessagePort();

    constructor() {
      this.port1.setTarget(this.port2);
      this.port2.setTarget(this.port1);
    }
  };
}

type WorkerModule = {
  default?: { fetch: (request: Request, env: unknown, ctx: ExecutionContext) => Response | Promise<Response> };
  fetch?: (request: Request, env: unknown, ctx: ExecutionContext) => Response | Promise<Response>;
};

type PartyServerEnv = Parameters<typeof routePartykitRequest>[1];

let astroWorkerModulePromise: Promise<WorkerModule> | undefined;

function getAstroWorkerModule() {
  if (!astroWorkerModulePromise) {
    astroWorkerModulePromise = import("../dist/_worker.js/index.js");
  }
  return astroWorkerModulePromise;
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const partyResponse = await routePartykitRequest(request, env as PartyServerEnv);
    if (partyResponse) {
      return partyResponse;
    }

    const astroWorkerModule = await getAstroWorkerModule();
    const handler = astroWorkerModule.default?.fetch ?? astroWorkerModule.fetch;

    if (!handler) {
      throw new Error("Astro worker fetch handler not found in dist/_worker.js/index.js");
    }

    return handler(request, env, ctx);
  },
};
