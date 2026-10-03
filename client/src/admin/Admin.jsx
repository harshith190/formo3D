import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { Logo } from '../components/Layout.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Field, Spinner } from '../components/UI.jsx';
import { Categories, Coupons, Customers, Dashboard, Ideas, Orders, ProductForm, Products, Reviews, Subscribers } from './pages.jsx';
import './admin.css';

const NAV = [
  ['', 'Overview', 'chart'],
  ['products', 'Products', 'box'],
  ['orders', 'Orders', 'bag'],
  ['customers', 'Customers', 'users'],
  ['categories', 'Categories', 'grid'],
  ['coupons', 'Coupons', 'tag'],
  ['reviews', 'Reviews', 'star'],
  ['ideas', 'Custom requests', 'bulb'],
  ['subscribers', 'Subscribers', 'mail'],
];

function AdminLogin() {
  const { signIn, signOut, user } = useStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await signIn('login', { ...form, admin: true }); } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="admin-login-card">
        <Logo />
        <h1>Studio admin</h1>
        {user && user.role !== 'admin' && (
          <p className="field-error">You are signed in as {user.email}, which is not an admin account. <button type="button" className="link-btn" onClick={signOut}>Sign out</button></p>
        )}
        <Field label="Email"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" /></Field>
        <Field label="Password"><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" /></Field>
        {error && <p className="field-error">{error}</p>}
        <Button type="submit" className="btn-block" loading={busy}>Sign in</Button>
        <Link to="/" className="link-btn">Back to the store</Link>
      </form>
    </div>
  );
}

export default function Admin() {
  const { user, authReady, signOut } = useStore();
  useEffect(() => {
    document.title = 'Admin | FORMO';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!authReady) return <Spinner />;
  if (!user || user.role !== 'admin') return <AdminLogin />;

  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/admin" className="admin-brand"><Logo /><span>Admin</span></Link>
        <nav>
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={`/admin/${to}`} end={to === ''}><Icon name={icon} size={18} />{label}</NavLink>
          ))}
        </nav>
        <div className="admin-side-foot">
          <a href="/" target="_blank" rel="noreferrer"><Icon name="external" size={16} />View store</a>
          <button onClick={signOut}><Icon name="logout" size={16} />Sign out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
