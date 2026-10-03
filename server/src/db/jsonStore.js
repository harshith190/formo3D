// Zero-setup file database used for local development.
// Implements the same interface as supabaseStore.js so services never know which one is active.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const TABLES = ['users', 'categories', 'products', 'reviews', 'orders', 'coupons', 'ideas', 'subscribers', 'wishlist'];
const file = path.join(config.dataDir, 'db.json');

let data = null;
let writeTimer = null;

function load() {
  if (data) return data;
  fs.mkdirSync(config.dataDir, { recursive: true });
  data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  for (const t of TABLES) data[t] ||= [];
  return data;
}

function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  }, 50);
}

const matches = (row, filter = {}) => Object.entries(filter).every(([k, v]) => row[k] === v);
const clone = (v) => (v == null ? v : structuredClone(v));

export const jsonStore = {
  kind: 'json',
  async list(table, filter) {
    return clone(load()[table].filter((r) => matches(r, filter)));
  },
  async get(table, id) {
    return clone(load()[table].find((r) => r.id === id) || null);
  },
  async findOne(table, filter) {
    return clone(load()[table].find((r) => matches(r, filter)) || null);
  },
  async insert(table, row) {
    load()[table].push(clone(row));
    persist();
    return clone(row);
  },
  async update(table, id, patch) {
    const rows = load()[table];
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...clone(patch) };
    persist();
    return clone(rows[i]);
  },
  async remove(table, id) {
    const rows = load()[table];
    const i = rows.findIndex((r) => r.id === id);
    if (i !== -1) rows.splice(i, 1);
    persist();
    return i !== -1;
  },
  async reset() {
    fs.mkdirSync(config.dataDir, { recursive: true });
    data =Object.fromEntries(TABLES.map((t) => [t, []]));
    persist();
  },
};
