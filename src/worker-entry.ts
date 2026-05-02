export { Globe } from './server/Globe.js';

import { onRequest } from './_worker.js';

export const fetch = onRequest;