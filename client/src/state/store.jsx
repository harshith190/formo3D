import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, token } from '../lib/api.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function StoreProvider({ children }) {
  // ---------- toast ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  const notify = useCallback((message, opts = {}) => {
    clearTimeout(toastTimer.current);
    setToast({ message, ...opts, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), opts.duration || 3200);
  }, []);

  // ---------- auth ----------
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!token.get()) return setAuthReady(true);
    api('/auth/me').then(setUser).catch(() => token.set(null)).finally(() => setAuthReady(true));
  }, []);

  const signIn = useCallback(async (mode, payload) => {
    const { token: t, user: u } = await api(`/auth/${mode}`, { method: 'POST', body: payload });
    token.set(t);
    setUser(u);
    return u;
  }, []);
  const signOut = useCallback(() => { token.set(null); setUser(null); }, []);

  // ---------- cart ----------
  const [cart, setCart] = useState(() => load('formo.cart', []).filter((i) => i.key));
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => save('formo.cart', cart), [cart]);

  // A bag line is one product in one colour and size. Defaults to the first option of each.
  const addToCart = useCallback((p, qty = 1, { open = true, color, size } = {}) => {
    if (p.stock <= 0) return notify(`${p.name} is out of stock right now.`);
    const c = color ?? p.colors?.[0]?.name ?? null;
    const s = p.sizes?.find((x) => x.label === (size ?? p.sizes?.[0]?.label)) || null;
    const key = [p.id, c, s?.label].join('|');
    const max = p.stock ?? 20;
    setCart((cart) => {
      const existing = cart.find((i) => i.key === key);
      if (existing) return cart.map((i) => (i.key === key ? { ...i, qty: Math.min(max, i.qty + qty), stock: max } : i));
      return [...cart, {
        key, productId: p.id, slug: p.slug, name: p.name, tone: p.tone, image: p.images?.[0] || null,
        color: c, size: s?.label || null, price: p.price + (s?.priceDelta || 0), stock: max, qty: Math.min(max, qty),
      }];
    });
    if (open) setCartOpen(true);
  }, [notify]);
  const setQty = useCallback((key, qty) =>
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.stock || 20, qty)) } : i))), []);
  const removeFromCart = useCallback((key) => setCart((c) => c.filter((i) => i.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  // ---------- wishlist ----------
  // Guests keep a local list; it is merged into their account when they sign in.
  const [wish, setWish] = useState(() => new Set(load('formo.wish', [])));
  useEffect(() => { if (!user) save('formo.wish', [...wish]); }, [wish, user]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const server = await api('/wishlist').catch(() => []);
      const ids = new Set(server.map((p) => p.id));
      for (const local of load('formo.wish', [])) {
        if (!ids.has(local)) { await api(`/wishlist/${local}`, { method: 'POST' }).catch(() => {}); ids.add(local); }
      }
      save('formo.wish', []);
      setWish(ids);
    })();
  }, [user]);

  const toggleWish = useCallback(async (p) => {
    const has = wish.has(p.id);
    setWish((w) => { const n = new Set(w); has ? n.delete(p.id) : n.add(p.id); return n; });
    notify(has ? `Removed ${p.name} from your wishlist.` : `Saved ${p.name} to your wishlist.`);
    if (user) await api(`/wishlist/${p.id}`, { method: 'POST' }).catch(() => notify('Could not update your wishlist.'));
  }, [wish, user, notify]);

  const value = useMemo(() => ({
    toast, notify,
    user, setUser, authReady, signIn, signOut,
    cart, cartOpen, setCartOpen, addToCart, setQty, removeFromCart, clearCart, cartCount, cartSubtotal,
    wish, toggleWish,
  }), [toast, notify, user, authReady, signIn, signOut, cart, cartOpen, addToCart, setQty, removeFromCart, clearCart, cartCount, cartSubtotal, wish, toggleWish]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
