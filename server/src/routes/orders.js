import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { paymentMethods, provider } from '../payments.js';
import { h, fail, id, now, str, num, money, isEmail, optionalAuth, requireAuth } from '../lib.js';

const r = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

export const ORDER_STATUSES = ['pending_payment', 'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export async function findCoupon(code, subtotal) {
  if (!code) return { coupon: null, discount: 0 };
  const coupon = await db.findOne('coupons', { code: String(code).trim().toUpperCase() });
  const expired = coupon?.expiresAt && new Date(coupon.expiresAt) < new Date();
  const usedUp = coupon?.maxUses && coupon.used >= coupon.maxUses;
  if (!coupon || !coupon.active || expired || usedUp) fail(400, 'This code is not valid.');
  if (subtotal < coupon.minOrder) fail(400, `This code needs an order of at least ₹${coupon.minOrder}.`);
  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  return { coupon, discount: Math.round(Math.min(raw, subtotal)) };
}

// Prices always come from the database, never from the browser.
async function quote(items, couponCode) {
  if (!Array.isArray(items) || !items.length) fail(400, 'Your bag is empty.');
  const lines = [];
  const reserved = {};
  for (const { productId, qty, color, size } of items.slice(0, 50)) {
    const p = await db.get('products', productId);
    const q = Math.max(1, Math.min(20, Math.round(num(qty, 1))));
    if (!p || !p.active) fail(400, 'One of the items in your bag is no longer available.');
    reserved[p.id] = (reserved[p.id] || 0) + q;
    if (p.stock < reserved[p.id]) fail(400, `Only ${p.stock} of ${p.name} left in stock.`);

    // Customer choices are checked against the product's own options.
    const colors = p.colors || [];
    const sizes = p.sizes || [];
    const c = colors.length ? colors.find((x) => x.name === color) : null;
    const s = sizes.length ? sizes.find((x) => x.label === size) : null;
    if (colors.length && !c) fail(400, `Choose a colour for ${p.name}.`);
    if (sizes.length && !s) fail(400, `Choose a size for ${p.name}.`);

    lines.push({
      productId: p.id, slug: p.slug, name: p.name, tone: p.tone, image: p.images?.[0] || null,
      color: c?.name || null, size: s?.label || null,
      price: money(p.price + (s?.priceDelta || 0)), qty: q,
    });
  }
  const subtotal = money(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const { coupon, discount } = await findCoupon(couponCode, subtotal);
  // Free delivery is based on the bag value, so a discount code never adds a delivery fee.
  const shipping = subtotal >= config.shop.freeShippingOver ? 0 : config.shop.shippingFee;
  return { lines, subtotal, discount, shipping, total: money(subtotal - discount + shipping), coupon };
}

const orderNumber = () => 'FM' + Date.now().toString(36).toUpperCase().slice(-5) + crypto.randomInt(100, 999);

const publicOrder = ({ accessKey, ...o }) => o;

r.get('/payment-methods', (_req, res) =>
  res.json({ methods: paymentMethods(), freeShippingOver: config.shop.freeShippingOver, shippingFee: config.shop.shippingFee }));

r.post('/quote', h(async (req, res) => {
  const q = await quote(req.body.items, req.body.coupon);
  res.json({ ...q, coupon: q.coupon?.code || null });
}));

r.post('/', limiter, optionalAuth, h(async (req, res) => {
  const { customer = {}, address = {}, paymentMethod = 'cod' } = req.body;
  const email = str(req.user?.email || customer.email, 200).toLowerCase();
  if (!isEmail(email)) fail(400, 'Enter a valid email address.');
  if (str(customer.name).length < 2) fail(400, 'Enter your full name.');
  if (!/^[6-9]\d{9}$/.test(str(customer.phone).replace(/\D/g, '').slice(-10))) fail(400, 'Enter a valid 10 digit mobile number.');
  for (const f of ['line1', 'city', 'state']) if (!str(address[f])) fail(400, 'Please complete your delivery address.');
  if (!/^\d{6}$/.test(str(address.pincode))) fail(400, 'Enter a valid 6 digit PIN code.');

  const pay = provider(paymentMethod);
  const q = await quote(req.body.items, req.body.coupon);

  const order = {
    id: id('o_'),
    number: orderNumber(),
    userId: req.user?.id || null,
    email,
    customer: { name: str(customer.name, 100), phone: str(customer.phone, 20) },
    address: {
      line1: str(address.line1, 200), line2: str(address.line2, 200), landmark: str(address.landmark, 120),
      city: str(address.city, 80), state: str(address.state, 80), pincode: str(address.pincode, 6),
    },
    items: q.lines,
    subtotal: q.subtotal,
    discount: q.discount,
    shipping: q.shipping,
    total: q.total,
    coupon: q.coupon?.code || null,
    payment: { method: paymentMethod },
    status: 'placed',
    timeline: [],
    accessKey: crypto.randomBytes(16).toString('hex'),
    notes: str(req.body.notes, 500),
    createdAt: now(),
  };
  order.payment = { method: paymentMethod, ...(await pay.start(order)) };
  if (order.payment.status === 'awaiting') order.status = 'pending_payment';
  order.timeline.push({ status: order.status, at: now() });

  // Reserve stock and count the coupon use.
  for (const l of q.lines) {
    const p = await db.get('products', l.productId);
    await db.update('products', p.id, { stock: Math.max(0, p.stock - l.qty), sold: (p.sold || 0) + l.qty });
  }
  if (q.coupon) await db.update('coupons', q.coupon.id, { used: (q.coupon.used || 0) + 1 });

  // Save the address on the account for next time.
  if (req.user && req.body.saveAddress) {
    const addresses = [order.address, ...(req.user.addresses || []).filter((a) => a.line1 !== order.address.line1)].slice(0, 5);
    await db.update('users', req.user.id, { addresses, phone: req.user.phone || order.customer.phone, name: req.user.name || order.customer.name });
  }

  const saved = await db.insert('orders', order);
  res.status(201).json({ order: publicOrder(saved), accessKey: saved.accessKey });
}));

r.post('/:number/verify-payment', h(async (req, res) => {
  const order = await db.findOne('orders', { number: req.params.number });
  if (!order || order.accessKey !== req.body.accessKey) fail(404, 'Order not found.');
  if (order.payment.status === 'paid') return res.json(publicOrder(order));
  const ok = provider(order.payment.method).verify?.(order, req.body);
  if (!ok) fail(400, 'Payment could not be verified. If money was deducted, it will be refunded automatically.');
  const updated = await db.update('orders', order.id, {
    status: 'placed',
    payment: { ...order.payment, status: 'paid', paymentId: req.body.razorpay_payment_id, paidAt: now() },
    timeline: [...order.timeline, { status: 'placed', at: now() }],
  });
  res.json(publicOrder(updated));
}));

r.get('/mine', requireAuth, h(async (req, res) => {
  const orders = await db.list('orders', { userId: req.user.id });
  res.json(orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicOrder));
}));

// Lookup for the confirmation page (access key) and public tracking (number + email).
r.get('/lookup', limiter, optionalAuth, h(async (req, res) => {
  const order = await db.findOne('orders', { number: str(req.query.number, 20).toUpperCase() });
  const allowed =
    order &&
    ((req.query.key && req.query.key === order.accessKey) ||
      (req.query.email && str(req.query.email).toLowerCase() === order.email) ||
      (req.user && req.user.id === order.userId));
  if (!allowed) fail(404, 'We could not find an order with those details.');
  res.json(publicOrder(order));
}));

export default r;
