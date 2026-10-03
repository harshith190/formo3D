// Supabase / PostgreSQL adapter. Tables are defined in /supabase/schema.sql.
// Application code uses camelCase, Postgres uses snake_case; keys are converted at this boundary.
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const client = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { persistSession: false },
});

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapKeys = (obj, fn) => (obj ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v])) : obj);
const out = (row) => mapKeys(row, toCamel);
const into = (row) => mapKeys(row, toSnake);

function check({ data, error }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

export const supabaseStore = {
  kind: 'supabase',
  client,
  async list(table, filter) {
    let q = client.from(table).select('*');
    if (filter) q = q.match(into(filter));
    return check(await q).map(out);
  },
  async get(table, id) {
    return out(check(await client.from(table).select('*').eq('id', id).maybeSingle()));
  },
  async findOne(table, filter) {
    const rows = check(await client.from(table).select('*').match(into(filter)).limit(1));
    return rows[0] ? out(rows[0]) : null;
  },
  async insert(table, row) {
    return out(check(await client.from(table).insert(into(row)).select().single()));
  },
  async update(table, id, patch) {
    return out(check(await client.from(table).update(into(patch)).eq('id', id).select().maybeSingle()));
  },
  async remove(table, id) {
    check(await client.from(table).delete().eq('id', id));
    return true;
  },
  async reset() {
    for (const t of ['wishlist', 'reviews', 'orders', 'ideas', 'subscribers', 'coupons', 'products', 'categories', 'users']) {
      check(await client.from(t).delete().neq('id', ''));
    }
  },
};
