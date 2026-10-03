import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { upload, saveImage } from '../storage.js';
import { h, fail, id, now, str, isEmail } from '../lib.js';

const r = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

// Custom toy requests: a new design, a special colour, a name added, a bulk order.
r.post('/ideas', limiter, upload.single('image'), h(async (req, res) => {
  const problem = str(req.body.problem, 1500);
  const email = str(req.body.email, 200).toLowerCase();
  if (problem.length < 12) fail(400, 'Tell us a little more about what you would like.');
  const phone = str(req.body.phone, 20);
  if (!isEmail(email)) fail(400, 'Enter your email so we can reply with a quote.');
  const image = await saveImage(req.file, 'ideas');
  await db.insert('ideas', {
    id: id('id_'),
    problem,
    name: str(req.body.name, 100),
    email,
    phone,
    image,
    status: 'new',
    notes: '',
    createdAt: now(),
  });
  res.status(201).json({ ok: true });
}));

r.post('/newsletter', limiter, h(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  if (!isEmail(email)) fail(400, 'Enter a valid email address.');
  if (!(await db.findOne('subscribers', { email }))) {
    await db.insert('subscribers', { id: id('s_'), email, createdAt: now() });
  }
  res.status(201).json({ ok: true });
}));

export default r;
