import { Router } from 'express';
import { db } from '../db/index.js';
import { h, fail, id, now, str, num, requireAuth } from '../lib.js';

const r = Router();

// Attaches review aggregates. Ratings only exist when real customers leave reviews.
export async function withRatings(products) {
  const reviews = (await db.list('reviews')).filter((x) => x.status === 'published');
  const agg = {};
  for (const rv of reviews) {
    agg[rv.productId] ||= { sum: 0, count: 0 };
    agg[rv.productId].sum += rv.rating;
    agg[rv.productId].count += 1;
  }
  return products.map((p) => {
    const a = agg[p.id];
    return { ...p, rating: a ? Math.round((a.sum / a.count) * 10) / 10 : null, reviewCount: a ? a.count : 0 };
  });
}

const SORTS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || a.sort - b.sort,
  newest: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  popular: (a, b) => b.sold - a.sold,
  rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount,
};

r.get('/categories', h(async (_req, res) => {
  const [cats, products] = await Promise.all([db.list('categories'), db.list('products', { active: true })]);
  const counts = cats.map((c) => ({
    ...c,
    count: products.filter((p) => (c.virtual ? p.isNew : p.category === c.slug)).length,
  }));
  res.json(counts.sort((a, b) => a.sort - b.sort));
}));

r.get('/products', h(async (req, res) => {
  const { q = '', category, sort = 'featured', min, max, inStock, featured, isNew, limit } = req.query;
  let list = await withRatings(await db.list('products', { active: true }));

  if (category && category !== 'all') {
    const cat = await db.findOne('categories', { slug: category });
    list = list.filter((p) => (cat?.virtual ? p.isNew : p.category === category));
  }
  if (q) {
    const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = [p.name, p.tagline, p.description, p.category, ...(p.colors || []).map((c) => c.name)].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  if (min) list = list.filter((p) => p.price >= num(min));
  if (max) list = list.filter((p) => p.price <= num(max, Infinity));
  if (inStock === '1') list = list.filter((p) => p.stock > 0);
  if (featured === '1') list = list.filter((p) => p.featured);
  if (isNew === '1') list = list.filter((p) => p.isNew);

  list.sort(SORTS[sort] || SORTS.featured);
  if (limit) list = list.slice(0, num(limit, 24));
  res.json(list);
}));

r.get('/products/:slug', h(async (req, res) => {
  const product = await db.findOne('products', { slug: req.params.slug });
  if (!product || !product.active) fail(404, 'Product not found.');
  const [withRating] = await withRatings([product]);

  const reviews = (await db.list('reviews', { productId: product.id }))
    .filter((x) => x.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ userId, ...rest }) => rest);

  const others = (await withRatings(await db.list('products', { active: true }))).filter((p) => p.id !== product.id);
  const related = [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category).sort((a, b) => b.sold - a.sold),
  ].slice(0, 4);

  res.json({ product: withRating, reviews, related });
}));

// Customers can review a product once. Purchases are flagged as verified.
r.post('/products/:id/reviews', requireAuth, h(async (req, res) => {
  const product = await db.get('products', req.params.id);
  if (!product) fail(404, 'Product not found.');
  const rating = Math.round(num(req.body.rating));
  const body = str(req.body.body, 2000);
  if (rating < 1 || rating > 5) fail(400, 'Choose a rating from 1 to 5.');
  if (body.length < 10) fail(400, 'Tell us a little more (at least 10 characters).');

  const existing = await db.findOne('reviews', { productId: product.id, userId: req.user.id });
  if (existing) fail(409, 'You have already reviewed this product.');

  const orders = await db.list('orders', { userId: req.user.id });
  const verified = orders.some(
    (o) => o.status !== 'cancelled' && o.items.some((i) => i.productId === product.id),
  );

  const review = await db.insert('reviews', {
    id: id('rv_'),
    productId: product.id,
    userId: req.user.id,
    name: req.user.name || req.user.email.split('@')[0],
    rating,
    title: str(req.body.title, 120),
    body,
    verified,
    status: 'published',
    createdAt: now(),
  });
  const { userId, ...publicReview } = review;
  res.status(201).json(publicReview);
}));

// ---------- wishlist ----------
r.get('/wishlist', requireAuth, h(async (req, res) => {
  const rows = await db.list('wishlist', { userId: req.user.id });
  const products = await withRatings(await db.list('products', { active: true }));
  const ids = new Set(rows.map((w) => w.productId));
  res.json(products.filter((p) => ids.has(p.id)));
}));

r.post('/wishlist/:productId', requireAuth, h(async (req, res) => {
  const filter = { userId: req.user.id, productId: req.params.productId };
  const existing = await db.findOne('wishlist', filter);
  if (existing) {
    await db.remove('wishlist', existing.id);
    return res.json({ saved: false });
  }
  if (!(await db.get('products', req.params.productId))) fail(404, 'Product not found.');
  await db.insert('wishlist', { id: id('wl_'), ...filter, createdAt: now() });
  res.json({ saved: true });
}));

export default r;
