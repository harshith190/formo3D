import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { h, fail, id, now, str, isEmail, signToken, publicUser, requireAuth } from '../lib.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

r.post('/register', limiter, h(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const name = str(req.body.name, 100);
  if (!isEmail(email)) fail(400, 'Enter a valid email address.');
  if (password.length < 8) fail(400, 'Use at least 8 characters for your password.');
  if (await db.findOne('users', { email })) fail(409, 'An account with this email already exists.');

  const user = await db.insert('users', {
    id: id('u_'),
    email,
    name,
    phone: '',
    role: 'customer',
    addresses: [],
    passwordHash: await bcrypt.hash(password, 11),
    createdAt: now(),
  });

  // Attach earlier guest orders placed with the same email.
  for (const o of await db.list('orders', { email })) {
    if (!o.userId) await db.update('orders', o.id, { userId: user.id });
  }
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

r.post('/login', limiter, h(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const user = await db.findOne('users', { email });
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
  if (!ok) fail(401, 'Email or password is incorrect.');
  if (req.body.admin && user.role !== 'admin') fail(403, 'This account does not have admin access.');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

r.get('/me', requireAuth, h(async (req, res) => res.json(publicUser(req.user))));

r.patch('/me', requireAuth, h(async (req, res) => {
  const patch = {};
  if ('name' in req.body) patch.name = str(req.body.name, 100);
  if ('phone' in req.body) patch.phone = str(req.body.phone, 20);
  if (Array.isArray(req.body.addresses)) patch.addresses = req.body.addresses.slice(0, 5);
  if (req.body.newPassword) {
    const valid = await bcrypt.compare(String(req.body.currentPassword || ''), req.user.passwordHash);
    if (!valid) fail(400, 'Your current password is incorrect.');
    if (String(req.body.newPassword).length < 8) fail(400, 'Use at least 8 characters for your password.');
    patch.passwordHash = await bcrypt.hash(String(req.body.newPassword), 11);
  }
  res.json(publicUser(await db.update('users', req.user.id, patch)));
}));

export default r;
