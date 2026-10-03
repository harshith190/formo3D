import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db/index.js';

export const id = (prefix = '') => prefix + crypto.randomBytes(8).toString('hex');
export const now = () => new Date().toISOString();
export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new HttpError(status, message);
};

// Wraps async route handlers so thrown errors reach the error middleware.
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : fallback);
export const money = (n) => Math.round(Number(n) * 100) / 100;

// ---------- auth ----------
export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });

export const publicUser = (u) =>
  u && { id: u.id, email: u.email, name: u.name, phone: u.phone || '', role: u.role, addresses: u.addresses || [] };

async function readUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return await db.get('users', payload.sub);
  } catch {
    return null;
  }
}

export const optionalAuth = h(async (req, _res, next) => {
  req.user = await readUser(req);
  next();
});

export const requireAuth = h(async (req, _res, next) => {
  req.user = await readUser(req);
  if (!req.user) fail(401, 'Please sign in.');
  next();
});

export const requireAdmin = h(async (req, _res, next) => {
  req.user = await readUser(req);
  if (!req.user) fail(401, 'Please sign in.');
  if (req.user.role !== 'admin') fail(403, 'Admin access only.');
  next();
});
