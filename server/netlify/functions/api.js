import serverless from 'serverless-http';
import { app } from '../../src/app.js';
import { config } from '../../src/config.js';
import { db } from '../../src/db/index.js';

if (db.kind !== 'supabase') {
  throw new Error('Configure Supabase before deploying the Netlify backend.');
}

if (config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('Set JWT_SECRET before deploying the Netlify backend.');
}

const handle = serverless(app);
const functionPrefix = '/.netlify/functions/api';

export async function handler(event, context) {
  if (event.path.startsWith(functionPrefix)) {
    const route = event.path.slice(functionPrefix.length);
    event.path = `/api${route}`;
  }
  return handle(event, context);
}
