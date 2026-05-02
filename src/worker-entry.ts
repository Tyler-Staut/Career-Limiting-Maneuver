export { Globe } from "./server/index";

type WorkerModule = {
  default?: { fetch: (request: Request, env: unknown, ctx: ExecutionContext) => Response | Promise<Response> };
  fetch?: (request: Request, env: unknown, ctx: ExecutionContext) => Response | Promise<Response>;
};

let astroWorkerModulePromise: Promise<WorkerModule> | undefined;

function getAstroWorkerModule() {
  if (!astroWorkerModulePromise) {
    astroWorkerModulePromise = import("../dist/_worker.js/index.js");
  }
  return astroWorkerModulePromise;
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const astroWorkerModule = await getAstroWorkerModule();
    const handler = astroWorkerModule.default?.fetch ?? astroWorkerModule.fetch;

    if (!handler) {
      throw new Error("Astro worker fetch handler not found in dist/_worker.js/index.js");
    }

    return handler(request, env, ctx);
  },
};