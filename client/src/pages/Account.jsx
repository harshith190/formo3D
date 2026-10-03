import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { STATUS_LABEL, date, price } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Empty, Field, Spinner } from '../components/UI.jsx';
import { OrderDetail } from './Orders.jsx';

export function Auth({ mode: initial = 'login' }) {
  const { signIn, user } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initial);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  useEffect(() => { document.title = `${mode === 'login' ? 'Sign in' : 'Create account'} | FORMO`; }, [mode]);
  if (user) return <Navigate to={safeNext} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await signIn(mode, form);
      navigate(safeNext, { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth">
      <div className="auth-art" aria-hidden="true">
        <span className="auth-mark">FORMO<i>.</i></span>
        <p>Keep track of orders, save the things you like, and check out faster.</p>
      </div>
      <div className="auth-panel">
        <h1 className="page-title">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <Field label="Name"><input value={form.name} onChange={f('name')} autoComplete="name" /></Field>}
          <Field label="Email"><input type="email" required value={form.email} onChange={f('email')} autoComplete="email" /></Field>
          <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
            <input type="password" required minLength={mode === 'register' ? 8 : undefined} value={form.password} onChange={f('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {error && <p className="field-error">{error}</p>}
          <Button type="submit" className="btn-block" loading={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        </form>
        <p className="muted center">
          {mode === 'login' ? 'New to FORMO? ' : 'Already have an account? '}
          <button className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { api('/orders/mine').then(setOrders).catch(() => setOrders([])); }, []);
  if (!orders) return <Spinner />;
  if (!orders.length) return <Empty title="No orders yet." action={<Button to="/shop">Start shopping</Button>}>When you place an order, it will show up here.</Empty>;
  return (
    <ul className="order-list">
      {orders.map((o) => (
        <li key={o.id} className={`order-row ${open === o.id ? 'is-open' : ''}`}>
          <button className="order-summary" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
            <span><strong>{o.number}</strong><small>{date(o.createdAt)}</small></span>
            <span className={`status status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
            <span>{o.items.reduce((s, i) => s + i.qty, 0)} items</span>
            <strong>{price(o.total)}</strong>
            <Icon name="plus" size={16} className="order-toggle" />
          </button>
          {open === o.id && <OrderDetail order={o} />}
        </li>
      ))}
    </ul>
  );
}

export function WishlistTab() {
  const { user, wish } = useStore();
  const [items, setItems] = useState(null);
  useEffect(() => {
    // Guests: resolve their saved ids against the catalogue.
    (user ? api('/wishlist') : api('/products').then((all) => all.filter((p) => wish.has(p.id))))
      .then(setItems).catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  if (!items) return <Spinner />;
  const visible = items.filter((p) => wish.has(p.id));
  if (!visible.length) return <Empty title="Nothing saved yet." action={<Button to="/shop">Browse products</Button>}>Tap the heart on any product to keep it here.</Empty>;
  return (
    <>
      {!user && <p className="muted note">Saved on this device. <Link to="/login?next=/account/wishlist" className="link-arrow">Sign in</Link> to keep your wishlist everywhere.</p>}
      <div className="grid">{visible.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </>
  );
}

function ProfileTab() {
  const { user, setUser, notify } = useStore();
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');

  const save = async (body, done) => {
    setError('');
    try { setUser(await api('/auth/me', { method: 'PATCH', body })); notify('Saved.'); done?.(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="profile">
      <form className="panel" onSubmit={(e) => { e.preventDefault(); save(form); }}>
        <h3>Details</h3>
        <Field label="Email"><input value={user.email} disabled /></Field>
        <div className="field-row">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mobile"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Button type="submit" size="sm">Save details</Button>
      </form>

      <div className="panel">
        <h3>Saved addresses</h3>
        {user.addresses?.length ? (
          <ul className="addr-list">
            {user.addresses.map((a, i) => (
              <li key={i}>
                <p>{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.pincode}</p>
                <button className="link-btn" onClick={() => save({ addresses: user.addresses.filter((_, k) => k !== i) })}>Remove</button>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Addresses you use at checkout are saved here.</p>}
      </div>

      <form className="panel" onSubmit={(e) => { e.preventDefault(); save(pw, () => setPw({ currentPassword: '', newPassword: '' })); }}>
        <h3>Change password</h3>
        <div className="field-row">
          <Field label="Current password"><input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
          <Field label="New password"><input type="password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        <Button type="submit" size="sm" variant="ghost">Update password</Button>
      </form>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function Account() {
  const { user, authReady, signOut } = useStore();
  const { pathname } = useLocation();
  const tab = pathname.split('/')[2] || 'orders';

  useEffect(() => { document.title = 'Your account | FORMO'; }, []);
  if (!authReady) return <div className="page-pad"><Spinner /></div>;
  if (!user && tab !== 'wishlist') return <Navigate to={`/login?next=${pathname}`} replace />;

  return (
    <div className="wrap page-pad account">
      <header className="account-head">
        <div>
          <p className="eyebrow">{user ? user.email : 'Guest'}</p>
          <h1 className="page-title">{user ? `Hello${user.name ? ', ' + user.name.split(' ')[0] : ''}.` : 'Your wishlist'}</h1>
        </div>
        {user && <button className="link-btn" onClick={signOut}><Icon name="logout" size={16} /> Sign out</button>}
      </header>
      {user && (
        <nav className="tabs">
          <NavLink to="/account" end>Orders</NavLink>
          <NavLink to="/account/wishlist">Wishlist</NavLink>
          <NavLink to="/account/profile">Profile</NavLink>
          {user.role === 'admin' && <NavLink to="/admin">Admin <Icon name="external" size={14} /></NavLink>}
        </nav>
      )}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'wishlist' && <WishlistTab />}
      {tab === 'profile' && user && <ProfileTab />}
    </div>
  );
}

