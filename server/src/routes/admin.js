import { Router } from 'express';
import { db } from '../db/index.js';
import { upload, saveImage } from '../storage.js';
import { ORDER_STATUSES } from './orders.js';
import { h, fail, id, now, str, num, money, slugify, requireAdmin } from '../lib.js';

const r = Router();
r.use(requireAdmin);

const COUNTED = (o) => !['cancelled', 'pending_payment'].includes(o.status);
const byNewest = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

// ---------- analytics ----------
r.get('/stats', h(async (_req, res) => {
  const [orders, products, users, ideas] = await Promise.all([
    db.list('orders'), db.list('products'), db.list('users', { role: 'customer' }), db.list('ideas'),
  ]);
  const valid = orders.filter(COUNTED);
  const revenue = money(valid.reduce((s, o) => s + o.total, 0));

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 });
  }
  const dayIndex = Object.fromEntries(days.map((d, i) => [d.date, i]));
  for (const o of valid) {
    const k = new Date(o.createdAt);
    k.setHours(0, 0, 0, 0);
    const i = dayIndex[k.toISOString().slice(0, 10)];
    if (i !== undefined) {
      days[i].revenue = money(days[i].revenue + o.total);
      days[i].orders += 1;
    }
  }

  const productSales = {};
  for (const o of valid) for (const l of o.items) {
    productSales[l.productId] ||= { productId: l.productId, name: l.name, units: 0, revenue: 0 };
    productSales[l.productId].units += l.qty;
    productSales[l.productId].revenue = money(productSales[l.productId].revenue + l.qty * l.price);
  }

  res.json({
    revenue,
    orders: valid.length,
    averageOrder: valid.length ? money(revenue / valid.length) : 0,
    customers: users.length,
    toFulfil: orders.filter((o) => ['placed', 'confirmed', 'packed'].includes(o.status)).length,
    newIdeas: ideas.filter((i) => i.status === 'new').length,
    byStatus: Object.fromEntries(ORDER_STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length])),
    days,
    topProducts: Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    lowStock: products.filter((p) => p.active && p.stock <= 5).map(({ id, name, stock }) => ({ id, name, stock })),
    recentOrders: orders.sort(byNewest).slice(0, 6).map(({ accessKey, ...o }) => o),
  });
}));

// ---------- uploads ----------
r.post('/uploads', upload.array('images', 8), h(async (req, res) => {
  const urls = [];
  for (const f of req.files || []) urls.push(await saveImage(f, 'products'));
  res.status(201).json({ urls });
}));

// ---------- products ----------
function productInput(body, existing = {}) {
  const p = {};
  const text = { name: 120, tagline: 200, category: 60, art: 40, tone: 20, problem: 2000, solution: 3000, description: 4000, dimensions: 200, material: 200, weight: 60, care: 500 };
  for (const [k, max] of Object.entries(text)) if (k in body) p[k] = str(body[k], max);
  for (const k of ['featured', 'isNew', 'active']) if (k in body) p[k] = Boolean(body[k]);
  if ('price' in body) p.price = money(num(body.price));
  if ('compareAt' in body) p.compareAt = body.compareAt === '' || body.compareAt == null ? null : money(num(body.compareAt));
  if ('stock' in body) p.stock = Math.max(0, Math.round(num(body.stock)));
  if ('sort' in body) p.sort = Math.round(num(body.sort));
  if ('features' in body) p.features = (Array.isArray(body.features) ? body.features : []).map((f) => str(f, 200)).filter(Boolean).slice(0, 12);
  if ('colors' in body) p.colors = (Array.isArray(body.colors) ? body.colors : []).map((c) => ({ name: str(c.name, 40), hex: str(c.hex, 120) })).filter((c) => c.name).slice(0, 20);
  if ('sizes' in body) p.sizes = (Array.isArray(body.sizes) ? body.sizes : []).map((x) => ({ label: str(x.label, 40), priceDelta: money(num(x.priceDelta)) })).filter((x) => x.label).slice(0, 10);
  if ('images' in body) p.images = (Array.isArray(body.images) ? body.images : []).map((u) => str(u, 500)).filter(Boolean).slice(0, 10);
  if ('slug' in body || (p.name && !existing.slug)) p.slug = slugify(body.slug || p.name);
  if (p.price !== undefined && p.price <= 0) fail(400, 'Price must be more than zero.');
  if (p.compareAt && p.compareAt <= (p.price ?? existing.price)) p.compareAt = null;
  return p;
}

r.get('/products', h(async (_req, res) => {
  res.json((await db.list('products')).sort((a, b) => a.sort - b.sort || byNewest(a, b)));
}));

r.get('/products/:id', h(async (req, res) => {
  const p = await db.get('products', req.params.id);
  if (!p) fail(404, 'Product not found.');
  res.json(p);
}));

r.post('/products', h(async (req, res) => {
  const input = productInput(req.body);
  if (!input.name) fail(400, 'Give the product a name.');
  if (!input.price) fail(400, 'Set a price.');
  if (await db.findOne('products', { slug: input.slug })) fail(409, 'Another product already uses this URL slug.');
  const product = await db.insert('products', {
    id: id('p_'), tagline: '', category: 'fidget', compareAt: null, stock: 0, tone: '#d8d2c8',
    images: [], colors: [], sizes: [], description: '', features: [], dimensions: '', material: '', weight: '', care: '',
    featured: false, isNew: true, active: true, sort: 100, sold: 0,
    ...input, createdAt: now(), updatedAt: now(),
  });
  res.status(201).json(product);
}));

r.patch('/products/:id', h(async (req, res) => {
  const existing = await db.get('products', req.params.id);
  if (!existing) fail(404, 'Product not found.');
  const input = productInput(req.body, existing);
  if (input.slug && input.slug !== existing.slug && (await db.findOne('products', { slug: input.slug }))) {
    fail(409, 'Another product already uses this URL slug.');
  }
  res.json(await db.update('products', existing.id, { ...input, updatedAt: now() }));
}));

r.delete('/products/:id', h(async (req, res) => {
  // Products with orders are archived instead of deleted so order history stays intact.
  const orders = await db.list('orders');
  if (orders.some((o) => o.items.some((i) => i.productId === req.params.id))) {
    await db.update('products', req.params.id, { active: false });
    return res.json({ archived: true });
  }
  await db.remove('products', req.params.id);
  res.json({ deleted: true });
}));

// ---------- categories ----------
r.get('/categories', h(async (_req, res) => res.json((await db.list('categories')).sort((a, b) => a.sort - b.sort))));

r.post('/categories', h(async (req, res) => {
  const name = str(req.body.name, 60);
  if (!name) fail(400, 'Name the category.');
  const slug = slugify(req.body.slug || name);
  if (await db.findOne('categories', { slug })) fail(409, 'That category already exists.');
  res.status(201).json(await db.insert('categories', {
    id: id('c_'), slug, name, blurb: str(req.body.blurb, 300), virtual: false, sort: Math.round(num(req.body.sort, 50)), createdAt: now(),
  }));
}));

r.patch('/categories/:id', h(async (req, res) => {
  const patch = {};
  if ('name' in req.body) patch.name = str(req.body.name, 60);
  if ('blurb' in req.body) patch.blurb = str(req.body.blurb, 300);
  if ('sort' in req.body) patch.sort = Math.round(num(req.body.sort));
  res.json(await db.update('categories', req.params.id, patch));
}));

r.delete('/categories/:id', h(async (req, res) => {
  const cat = await db.get('categories', req.params.id);
  if (!cat) fail(404, 'Category not found.');
  if (cat.virtual) fail(400, 'This collection is automatic and cannot be deleted.');
  if ((await db.list('products', { category: cat.slug })).length) fail(400, 'Move the products in this category first.');
  await db.remove('categories', cat.id);
  res.json({ deleted: true });
}));

// ---------- orders ----------
r.get('/orders', h(async (req, res) => {
  const { status, q } = req.query;
  let list = (await db.list('orders')).sort(byNewest);
  if (status && status !== 'all') list = list.filter((o) => o.status === status);
  if (q) {
    const t = String(q).toLowerCase();
    list = list.filter((o) => [o.number, o.email, o.customer.name, o.customer.phone].join(' ').toLowerCase().includes(t));
  }
  res.json(list.map(({ accessKey, ...o }) => o));
}));

r.patch('/orders/:id', h(async (req, res) => {
  const order = await db.get('orders', req.params.id);
  if (!order) fail(404, 'Order not found.');
  const patch = {};
  if ('notes' in req.body) patch.notes = str(req.body.notes, 1000);
  if ('courier' in req.body) patch.shipment = { ...order.shipment, courier: str(req.body.courier, 60) };
  if ('trackingNumber' in req.body) patch.shipment = { ...(patch.shipment || order.shipment), trackingNumber: str(req.body.trackingNumber, 60) };
  if (req.body.status && req.body.status !== order.status) {
    if (!ORDER_STATUSES.includes(req.body.status)) fail(400, 'Unknown status.');
    if (order.status === 'cancelled') fail(400, 'Cancelled orders cannot be reopened.');
    patch.status = req.body.status;
    patch.timeline = [...order.timeline, { status: req.body.status, at: now() }];
    if (req.body.status === 'cancelled') {
      for (const l of order.items) {
        const p = await db.get('products', l.productId);
        if (p) await db.update('products', p.id, { stock: p.stock + l.qty, sold: Math.max(0, (p.sold || 0) - l.qty) });
      }
    }
    if (req.body.status === 'delivered' && order.payment.method === 'cod') {
      patch.payment = { ...order.payment, status: 'paid', paidAt: now() };
    }
  }
  const { accessKey, ...updated } = await db.update('orders', order.id, patch);
  res.json(updated);
}));

// ---------- customers ----------
r.get('/customers', h(async (_req, res) => {
  const [users, orders] = await Promise.all([db.list('users', { role: 'customer' }), db.list('orders')]);
  res.json(users.sort(byNewest).map((u) => {
    const mine = orders.filter((o) => (o.userId === u.id || o.email === u.email) && COUNTED(o));
    return {
      id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt,
      orders: mine.length, spent: money(mine.reduce((s, o) => s + o.total, 0)),
    };
  }));
}));

// ---------- reviews ----------
r.get('/reviews', h(async (_req, res) => {
  const [reviews, products] = await Promise.all([db.list('reviews'), db.list('products')]);
  const names = Object.fromEntries(products.map((p) => [p.id, p.name]));
  res.json(reviews.sort(byNewest).map((rv) => ({ ...rv, productName: names[rv.productId] || 'Deleted product' })));
}));
r.patch('/reviews/:id', h(async (req, res) => {
  const status = req.body.status === 'hidden' ? 'hidden' : 'published';
  res.json(await db.update('reviews', req.params.id, { status }));
}));
r.delete('/reviews/:id', h(async (req, res) => res.json({ deleted: await db.remove('reviews', req.params.id) })));

// ---------- coupons ----------
function couponInput(body) {
  const c = {};
  if ('code' in body) c.code = str(body.code, 30).toUpperCase().replace(/\s+/g, '');
  if ('type' in body) c.type = body.type === 'flat' ? 'flat' : 'percent';
  if ('value' in body) c.value = money(num(body.value));
  if ('minOrder' in body) c.minOrder = money(num(body.minOrder));
  if ('maxUses' in body) c.maxUses = body.maxUses ? Math.round(num(body.maxUses)) : null;
  if ('expiresAt' in body) c.expiresAt = body.expiresAt || null;
  if ('active' in body) c.active = Boolean(body.active);
  if (c.type === 'percent' && c.value > 90) fail(400, 'Percentage discounts are capped at 90%.');
  return c;
}
r.get('/coupons', h(async (_req, res) => res.json((await db.list('coupons')).sort(byNewest))));
r.post('/coupons', h(async (req, res) => {
  const c = couponInput(req.body);
  if (!c.code || !c.value) fail(400, 'A code and a value are required.');
  if (await db.findOne('coupons', { code: c.code })) fail(409, 'That code already exists.');
  res.status(201).json(await db.insert('coupons', {
    id: id('cp_'), type: 'percent', minOrder: 0, maxUses: null, expiresAt: null, active: true, used: 0, ...c, createdAt: now(),
  }));
}));
r.patch('/coupons/:id', h(async (req, res) => res.json(await db.update('coupons', req.params.id, couponInput(req.body)))));
r.delete('/coupons/:id', h(async (req, res) => res.json({ deleted: await db.remove('coupons', req.params.id) })));

// ---------- ideas & subscribers ----------
r.get('/ideas', h(async (_req, res) => res.json((await db.list('ideas')).sort(byNewest))));
r.patch('/ideas/:id', h(async (req, res) => {
  const patch = {};
  if ('status' in req.body) patch.status = str(req.body.status, 30);
  if ('notes' in req.body) patch.notes = str(req.body.notes, 2000);
  res.json(await db.update('ideas', req.params.id, patch));
}));
r.get('/subscribers', h(async (_req, res) => res.json((await db.list('subscribers')).sort(byNewest))));
r.delete('/subscribers/:id', h(async (req, res) => res.json({ deleted: await db.remove('subscribers', req.params.id) })));

export default r;
