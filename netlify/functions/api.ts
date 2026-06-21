import serverless from 'serverless-http';
import { app } from '../../server-app.js';

const serverlessHandler = serverless(app);

// Netlify rewrites "/api/*" to "/.netlify/functions/api/*" (see netlify.toml).
// Our Express routes are all defined as "/api/..." (unchanged from local dev),
// so we translate the path back to "/api/..." before handing it to Express.
const FUNCTION_PREFIX = '/.netlify/functions/api';

export const handler = async (event: any, context: any) => {
  if (typeof event.path === 'string' && event.path.startsWith(FUNCTION_PREFIX)) {
    const rest = event.path.slice(FUNCTION_PREFIX.length); // e.g. "/candidates" or ""
    event.path = '/api' + rest;
  }
  return serverlessHandler(event, context);
};
