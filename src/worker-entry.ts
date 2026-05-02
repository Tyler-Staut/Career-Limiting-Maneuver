import astroWorker from "../dist/_worker.js/index.js";

export { Globe } from "./server/index";

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return astroWorker.fetch(request, env as any, ctx);
  },
};