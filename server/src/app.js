import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { db } from './db/index.js';
import { HttpError } from './lib.js';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import orders from './routes/orders.js';
import community from './routes/community.js';
import admin from './routes/admin.js';

export const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://checkout.razorpay.com'],
      'frame-src': ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
      'connect-src': ["'self'", 'https://*.razorpay.com', 'https://*.supabase.co'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
    },
  },
}));
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, db: db.kind }));
app.use('/api/auth', auth);
app.use('/api', catalog);
app.use('/api/orders', orders);
app.use('/api', community);
app.use('/api/admin', admin);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// In production the API also serves the built storefront, so one deployment = one domain.
const dist = path.join(config.root, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1y', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on our side.' : err.message });
});
