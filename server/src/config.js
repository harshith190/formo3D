import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const env = process.env;

export const config = {
  root,
  port: Number(env.PORT || 4000),
  isProd: env.NODE_ENV === 'production',
  // Comma separated list of allowed browser origins (your custom domain in production).
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  publicUrl: env.PUBLIC_URL || 'http://localhost:5173',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  admin: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME || 'FORMO Admin' },
  supabase: {
    url: env.SUPABASE_URL,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_BUCKET || 'formo-media',
  },
  razorpay: { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET },
  shop: {
    currency: 'INR',
    freeShippingOver: Number(env.FREE_SHIPPING_OVER || 999),
    shippingFee: Number(env.SHIPPING_FEE || 79),
  },
  dataDir: path.join(root, 'data'),
  uploadDir: path.join(root, 'uploads'),
};

export const useSupabase = Boolean(config.supabase.url && config.supabase.serviceKey);

if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('Set JWT_SECRET in production.');
}
