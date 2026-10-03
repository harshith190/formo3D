// Starter catalogue. Run `npm run seed` to reset the database to this state.
// No reviews, orders or customers are seeded: those only come from real people.
// Products have no photos yet; upload them from the admin.
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db } from './db/index.js';
import { id, now } from './lib.js';

const categories = [
  { slug: 'fidget', name: 'Fidget & Flexi', blurb: 'Bend it, click it, spin it.' },
  { slug: 'animals', name: 'Animals', blurb: 'Flexible creatures with moving joints.' },
  { slug: 'figurines', name: 'Figurines', blurb: 'Small characters for your desk or shelf.' },
  { slug: 'new', name: 'New', blurb: 'The latest designs.', virtual: true },
];

// Shared option sets. Every product can have its own in the admin.
const COLORS = [
  { name: 'Coral', hex: '#E8572A' },
  { name: 'Sky', hex: '#6FA8DC' },
  { name: 'Mint', hex: '#8CCFB0' },
  { name: 'Sunny', hex: '#F2C94C' },
  { name: 'Charcoal', hex: '#2B2A28' },
  { name: 'Rainbow', hex: 'linear-gradient(90deg,#E8572A,#F2C94C,#8CCFB0,#6FA8DC)' },
];
const SIZES = [
  { label: 'Small', priceDelta: 0 },
  { label: 'Medium', priceDelta: 150 },
  { label: 'Large', priceDelta: 350 },
];

const products = [
  { name: 'Flexi Dragon', slug: 'flexi-dragon', category: 'animals', tone: '#E8572A', price: 599, compareAt: 699, stock: 30, featured: true,
    tagline: 'A dragon that wiggles, curls and wraps around your wrist.',
    description: 'Fully jointed from nose to tail, printed in one piece with no assembly. Every segment moves.',
    features: ['Printed in one piece, no assembly', 'Every joint moves', 'Choose your colour and size'],
    dimensions: 'Small 18 cm, Medium 26 cm, Large 38 cm (nose to tail)' },
  { name: 'Flexi Octopus', slug: 'flexi-octopus', category: 'animals', tone: '#8CCFB0', price: 449, stock: 40, featured: true,
    tagline: 'Eight wiggly arms for busy hands.',
    description: 'Each arm is made of small linked segments, so it bends in every direction. Satisfying to hold, fun to pose.',
    features: ['Eight fully flexible arms', 'Smooth, rounded edges', 'Choose your colour and size'],
    dimensions: 'Small 9 cm, Medium 13 cm, Large 18 cm' },
  { name: 'Flexi Cat', slug: 'flexi-cat', category: 'animals', tone: '#F2C94C', price: 399, stock: 25,
    tagline: 'A bendy cat with a tail that swishes.',
    description: 'Moving neck, body and tail. Strike a pose, then strike another one.',
    features: ['Jointed neck, body and tail', 'Stands on its own', 'Choose your colour and size'],
    dimensions: 'Small 10 cm, Medium 15 cm, Large 21 cm' },
  { name: 'Flexi Shark', slug: 'flexi-shark', category: 'animals', tone: '#6FA8DC', price: 449, stock: 18, isNew: true,
    tagline: 'Swish the tail, snap the jaw.',
    description: 'A segmented shark with a moving jaw. Great for fidgeting at your desk.',
    features: ['Moving jaw', 'Segmented body', 'Choose your colour and size'],
    dimensions: 'Small 12 cm, Medium 18 cm, Large 25 cm' },
  { name: 'Axolotl Buddy', slug: 'axolotl-buddy', category: 'animals', tone: '#F4A7B9', price: 499, stock: 22, isNew: true, featured: true,
    tagline: 'The smiliest flexi creature we make.',
    description: 'Jointed body, wavy gills and a permanent smile. A favourite for gifting.',
    features: ['Jointed body and tail', 'Detailed gills', 'Choose your colour and size'],
    dimensions: 'Small 10 cm, Medium 15 cm, Large 21 cm' },
  { name: 'Gear Cube', slug: 'gear-cube', category: 'fidget', tone: '#2B2A28', price: 549, stock: 35, featured: true,
    tagline: 'Turn one gear and they all turn.',
    description: 'A cube of interlocking gears that spin together. Quiet, smooth and hard to put down.',
    features: ['All gears turn together', 'Printed assembled, ready to use', 'Quiet rotation'],
    dimensions: '6 × 6 × 6 cm', sizes: [] },
  { name: 'Infinity Flip', slug: 'infinity-flip', category: 'fidget', tone: '#6FA8DC', price: 349, stock: 50,
    tagline: 'Fold it over and over and over.',
    description: 'An endless folding fidget. Flip it with one hand while you think.',
    features: ['Endless folding motion', 'One-hand friendly', 'Pocket size'],
    dimensions: '7 × 3.5 × 3.5 cm', sizes: [] },
  { name: 'Click Slider', slug: 'click-slider', category: 'fidget', tone: '#F2C94C', price: 299, stock: 0,
    tagline: 'A satisfying click, every time.',
    description: 'Slide the two halves past each other for a soft, tactile click.',
    features: ['Tactile click', 'Fits in a pocket', 'Smooth sliding'],
    dimensions: '6 × 3 × 1.5 cm', sizes: [] },
  { name: 'Mini Dino', slug: 'mini-dino', category: 'figurines', tone: '#8CCFB0', price: 349, stock: 30, isNew: true,
    tagline: 'A tiny T-rex for your desk.',
    description: 'A small, detailed dinosaur figurine. Collect them in different colours.',
    features: ['Fine detail', 'Stable base', 'Choose your colour and size'],
    dimensions: 'Small 6 cm, Medium 9 cm, Large 13 cm' },
  { name: 'Desk Fox', slug: 'desk-fox', category: 'figurines', tone: '#E8572A', price: 399, stock: 4,
    tagline: 'A curled-up fox that keeps you company.',
    description: 'A calm little fox figurine with a geometric finish.',
    features: ['Low-poly geometric style', 'Sits flat on any surface', 'Choose your colour and size'],
    dimensions: 'Small 6 cm, Medium 9 cm, Large 12 cm' },
];

export async function seed() {
  await db.reset();
  for (const [i, c] of categories.entries()) {
    await db.insert('categories', { id: id('c_'), virtual: false, ...c, sort: i, createdAt: now() });
  }
  const start = Date.now();
  for (const [i, p] of products.entries()) {
    await db.insert('products', {
      id: id('p_'), compareAt: null, images: [], featured: false, isNew: false, active: true, sold: 0,
      colors: COLORS, sizes: SIZES, material: 'PLA (plant-based plastic), 3D printed to order', care: 'Wipe clean. Keep away from direct heat.', weight: '',
      ...p, sort: i, createdAt: new Date(start - (products.length - i) * 86400000).toISOString(), updatedAt: now(),
    });
  }
  await db.insert('coupons', {
    id: id('cp_'), code: 'WELCOME10', type: 'percent', value: 10, minOrder: 499, maxUses: null,
    used: 0, expiresAt: null, active: true, createdAt: now(),
  });

  if (config.admin.email && config.admin.password) {
    await db.insert('users', {
      id: id('u_'), email: config.admin.email.toLowerCase(), name: config.admin.name, phone: '', role: 'admin',
      addresses: [], passwordHash: await bcrypt.hash(config.admin.password, 11), createdAt: now(),
    });
    console.log(`Admin account ready: ${config.admin.email}`);
  } else {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set. No admin account was created.');
  }
  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--force')) {
  await seed();
  setTimeout(() => process.exit(0), 200);
}
