import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { STATUS_LABEL, date, price } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import ProductImage from '../components/ProductImage.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Field, Spinner, Stars } from '../components/UI.jsx';

const ORDER_STATUSES = ['pending_payment', 'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => api(path).then(setData).catch((e) => setError(e.message)), [path]);
  useEffect(() => { reload(); }, [reload]);
  return [data, reload, setData, error];
}

function Head({ title, sub, children }) {
  return (
    <header className="a-head">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {children && <div className="a-head-tools">{children}</div>}
    </header>
  );
}

function Toast() {
  const { toast } = useStore();
  return toast ? <div className="toast-zone"><div className="toast" key={toast.key}><Icon name="check" size={16} />{toast.message}</div></div> : null;
}

// ============================================================ dashboard
function RevenueChart({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const W = 720, H = 220, pad = 28, bw = (W - pad) / days.length;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const total = days.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="a-chart">
      <div className="a-chart-head">
        <h3>Revenue, last 30 days</h3>
        <span className="muted small">{price(total)} total</span>
      </div>
      <div className="a-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Daily revenue for the last 30 days">
          {ticks.map((t) => {
            const y = H - (t / max) * (H - 10);
            return (
              <g key={t}>
                <line x1={pad} x2={W} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
                <text x={pad - 6} y={y + 4} textAnchor="end" className="a-tick">{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</text>
              </g>
            );
          })}
          {days.map((d, i) => {
            const h = d.revenue ? Math.max(3, (d.revenue / max) * (H - 10)) : 0;
            const x = pad + i * bw + 1;
            const w = bw - 2;
            const r = Math.min(4, w / 2, h);
            const y = H - h;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
                {h > 0 && (
                  <path d={`M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H} Z`}
                    fill={hover === i ? 'var(--accent)' : 'var(--ink)'} />
                )}
                {i % 5 === 0 && <text x={x + w / 2} y={H + 18} textAnchor="middle" className="a-tick">{date(d.date, { day: 'numeric', month: 'short' })}</text>}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="a-tip" style={{ left: `${((pad + hover * bw + bw / 2) / W) * 100}%` }}>
            <strong>{date(days[hover].date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
            <span>{price(days[hover].revenue)}</span>
            <span className="muted">{days[hover].orders} {days[hover].orders === 1 ? 'order' : 'orders'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [s] = useLoad('/admin/stats');
  if (!s) return <Spinner />;
  return (
    <>
      <Head title="Overview" sub="Counts exclude cancelled orders and orders awaiting payment." />
      <div className="a-tiles">
        <div className="a-tile"><span>Revenue</span><strong>{price(s.revenue)}</strong></div>
        <div className="a-tile"><span>Orders</span><strong>{s.orders}</strong></div>
        <div className="a-tile"><span>Average order</span><strong>{price(s.averageOrder)}</strong></div>
        <div className="a-tile"><span>Customers</span><strong>{s.customers}</strong></div>
        <Link to="/admin/orders" className="a-tile a-tile-link"><span>To fulfil</span><strong>{s.toFulfil}</strong></Link>
        <Link to="/admin/ideas" className="a-tile a-tile-link"><span>New custom requests</span><strong>{s.newIdeas}</strong></Link>
      </div>

      <div className="a-grid-2">
        <div className="a-card"><RevenueChart days={s.days} /></div>
        <div className="a-card">
          <h3>Orders by status</h3>
          <ul className="a-status-list">
            {ORDER_STATUSES.map((k) => (
              <li key={k}><span className={`status status-${k}`}>{STATUS_LABEL[k]}</span><strong>{s.byStatus[k]}</strong></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="a-grid-2">
        <div className="a-card">
          <h3>Top products</h3>
          {s.topProducts.length ? (
            <table className="a-table">
              <thead><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
              <tbody>{s.topProducts.map((p) => <tr key={p.productId}><td>{p.name}</td><td className="num">{p.units}</td><td className="num">{price(p.revenue)}</td></tr>)}</tbody>
            </table>
          ) : <p className="muted">Sales will show here after your first orders.</p>}
        </div>
        <div className="a-card">
          <h3>Low stock</h3>
          {s.lowStock.length ? (
            <ul className="a-low">
              {s.lowStock.map((p) => <li key={p.id}><Link to={`/admin/products/${p.id}`}>{p.name}</Link><span className={p.stock === 0 ? 'is-out' : ''}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span></li>)}
            </ul>
          ) : <p className="muted">All products have more than 5 in stock.</p>}
        </div>
      </div>

      <div className="a-card">
        <h3>Recent orders</h3>
        {s.recentOrders.length ? <OrdersTable orders={s.recentOrders} /> : <p className="muted">No orders yet.</p>}
      </div>
    </>
  );
}

// ============================================================ products
export function Products() {
  const [list, reload] = useLoad('/admin/products');
  const [q, setQ] = useState('');
  const { notify } = useStore();
  if (!list) return <Spinner />;
  const quick = async (p, patch) => { await api(`/admin/products/${p.id}`, { method: 'PATCH', body: patch }); notify('Saved.'); reload(); };
  const shown = list.filter((p) => !q || (p.name + p.category).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Head title="Products" sub={`${list.length} products`}>
        <input className="a-search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button to="/admin/products/new" icon="plus" size="sm">New product</Button>
      </Head>
      <div className="a-card a-card-flush">
        <table className="a-table a-products">
          <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Featured</th><th>New</th><th>Live</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={!p.active ? 'is-dim' : ''}>
                <td>
                  <Link to={`/admin/products/${p.id}`} className="a-prod">
                    <span className="a-thumb"><ProductImage product={p} /></span>
                    <span><strong>{p.name}</strong><small>/{p.slug}</small></span>
                  </Link>
                </td>
                <td className="cap">{p.category}</td>
                <td className="num">{price(p.price)}{p.compareAt ? <small className="muted"> <s>{price(p.compareAt)}</s></small> : null}</td>
                <td className={`num ${p.stock <= 5 ? 'warn' : ''}`}>{p.stock}</td>
                <td><Switch on={p.featured} onChange={(v) => quick(p, { featured: v })} label="Featured" /></td>
                <td><Switch on={p.isNew} onChange={(v) => quick(p, { isNew: v })} label="New" /></td>
                <td><Switch on={p.active} onChange={(v) => quick(p, { active: v })} label="Visible in store" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast />
    </>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <label className="toggle" title={label}>
      <input type="checkbox" checked={Boolean(on)} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="toggle-track" />
    </label>
  );
}

const EMPTY = {
  name: '', slug: '', tagline: '', category: 'fidget', price: '', compareAt: '', stock: 0,
  tone: '#D9D4CB', images: [], description: '', colors: [], sizes: [],
  features: [''], dimensions: '', material: 'PLA (plant-based plastic), 3D printed to order', weight: '', care: '', featured: false, isNew: true, active: true, sort: 100,
};

// Editable list of colour swatches or size options.
function OptionRows({ rows, onChange, fields, addLabel }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="a-opts">
      {rows.map((r, i) => (
        <div className="a-opt" key={i}>
          {fields.map((f) => f.type === 'color'
            ? <input key={f.key} type="color" className="a-color a-color-sm" value={/^#[0-9a-f]{6}$/i.test(r[f.key]) ? r[f.key] : '#888888'} onChange={(e) => set(i, f.key, e.target.value)} aria-label="Colour" />
            : <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder} value={r[f.key] ?? ''} onChange={(e) => set(i, f.key, e.target.value)} aria-label={f.placeholder} />)}
          <button type="button" className="icon-btn" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="close" size={16} /></button>
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, f.type === 'color' ? '#E8572A' : f.type === 'number' ? 0 : '']))])}><Icon name="plus" size={14} /> {addLabel}</button>
    </div>
  );
}

export function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useStore();
  const [p, setP] = useState(id ? null : EMPTY);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef();

  useEffect(() => {
    api('/admin/categories').then((c) => setCats(c.filter((x) => !x.virtual)));
    if (id) api(`/admin/products/${id}`).then((x) => setP({ ...EMPTY, ...x, compareAt: x.compareAt ?? '', features: x.features?.length ? x.features : [''] }));
  }, [id]);

  if (!p) return <Spinner />;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const off = p.compareAt && Number(p.compareAt) > Number(p.price) ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  const upload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    [...files].forEach((f) => form.append('images', f));
    try {
      const { urls } = await api('/admin/uploads', { method: 'POST', form });
      setP((x) => ({ ...x, images: [...x.images, ...urls] }));
    } catch (e) { setError(e.message); }
    setUploading(false);
  };
  const moveImage = (i, d) => {
    const imgs = [...p.images];
    const j = i + d;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    setP({ ...p, images: imgs });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { ...p, features: p.features.filter((f) => f.trim()) };
    delete body.id; delete body.createdAt; delete body.updatedAt; delete body.sold;
    try {
      const saved = await api(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PATCH' : 'POST', body });
      notify(id ? 'Product saved.' : 'Product created.');
      if (!id) navigate(`/admin/products/${saved.id}`, { replace: true });
      else setP({ ...EMPTY, ...saved, compareAt: saved.compareAt ?? '', features: saved.features?.length ? saved.features : [''] });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${p.name}? Products with past orders are hidden instead of deleted.`)) return;
    const r = await api(`/admin/products/${id}`, { method: 'DELETE' });
    notify(r.archived ? 'Product hidden from the store (it has past orders).' : 'Product deleted.');
    navigate('/admin/products');
  };

  return (
    <form onSubmit={save}>
      <Head title={id ? p.name || 'Product' : 'New product'} sub={id ? <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="link-btn">View in store <Icon name="external" size={14} /></a> : 'Add details, options and photos, then save.'}>
        {id && <button type="button" className="btn btn-ghost btn-sm" onClick={remove}><span className="btn-label">Delete</span></button>}
        <Button type="submit" size="sm" icon="check" loading={busy}>Save</Button>
      </Head>
      {error && <p className="field-error a-error">{error}</p>}

      <div className="a-form">
        <div className="a-form-main">
          <section className="a-card">
            <h3>Basics</h3>
            <div className="field-row">
              <Field label="Name"><input required value={p.name} onChange={set('name')} /></Field>
              <Field label="URL slug" hint="Leave empty to generate from the name"><input value={p.slug} onChange={set('slug')} /></Field>
            </div>
            <Field label="Tagline" hint="One line under the name"><input value={p.tagline} onChange={set('tagline')} maxLength={200} /></Field>
            <Field label="Short description"><textarea rows={3} value={p.description} onChange={set('description')} /></Field>
          </section>

          <section className="a-card">
            <h3>Options customers can choose</h3>
            <div className="field">
              <span className="field-label">Colours</span>
              <OptionRows rows={p.colors} onChange={(colors) => setP({ ...p, colors })} addLabel="Add colour"
                fields={[{ key: 'hex', type: 'color' }, { key: 'name', placeholder: 'Colour name' }]} />
            </div>
            <div className="field">
              <span className="field-label">Sizes</span>
              <OptionRows rows={p.sizes} onChange={(sizes) => setP({ ...p, sizes })} addLabel="Add size"
                fields={[{ key: 'label', placeholder: 'Size name' }, { key: 'priceDelta', type: 'number', placeholder: 'Extra ₹' }]} />
              <span className="field-hint">Extra ₹ is added to the base price. Leave sizes empty if the toy comes in one size.</span>
            </div>
            <div className="field">
              <span className="field-label">Features</span>
              {p.features.map((f, i) => (
                <div className="a-feature" key={i}>
                  <input value={f} onChange={(e) => setP({ ...p, features: p.features.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={`Feature ${i + 1}`} />
                  <button type="button" className="icon-btn" onClick={() => setP({ ...p, features: p.features.filter((_, k) => k !== i) })} aria-label="Remove feature"><Icon name="close" size={16} /></button>
                </div>
              ))}
              <button type="button" className="link-btn" onClick={() => setP({ ...p, features: [...p.features, ''] })}><Icon name="plus" size={14} /> Add feature</button>
            </div>
          </section>

          <section className="a-card">
            <h3>Photos</h3>
            <p className="muted small">The first photo is the main image. Square photos on a plain background work best.</p>
            <div className="a-images">
              {p.images.map((src, i) => (
                <div className="a-image" key={src}>
                  <img src={src} alt="" />
                  <div className="a-image-tools">
                    <button type="button" onClick={() => moveImage(i, -1)} aria-label="Move left"><Icon name="arrowLeft" size={14} /></button>
                    <button type="button" onClick={() => moveImage(i, 1)} aria-label="Move right"><Icon name="arrow" size={14} /></button>
                    <button type="button" onClick={() => setP({ ...p, images: p.images.filter((x) => x !== src) })} aria-label="Remove"><Icon name="trash" size={14} /></button>
                  </div>
                  {i === 0 && <span className="a-image-main">Main</span>}
                </div>
              ))}
              <button type="button" className="a-image-add" onClick={() => fileInput.current.click()} disabled={uploading}>
                <Icon name="image" size={22} />{uploading ? 'Uploading...' : 'Add photos'}
              </button>
              <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </div>
          </section>

          <section className="a-card">
            <h3>Details</h3>
            <div className="field-row">
              <Field label="Size"><input value={p.dimensions} onChange={set('dimensions')} placeholder="e.g. Small 10 cm, Large 20 cm" /></Field>
              <Field label="Weight"><input value={p.weight} onChange={set('weight')} /></Field>
            </div>
            <Field label="Material"><input value={p.material} onChange={set('material')} /></Field>
            <Field label="Care"><input value={p.care} onChange={set('care')} /></Field>
          </section>
        </div>

        <aside className="a-form-side">
          <section className="a-card">
            <h3>Visibility</h3>
            <label className="toggle a-toggle-row"><input type="checkbox" checked={p.active} onChange={set('active')} /><span className="toggle-track" /> Visible in store</label>
            <label className="toggle a-toggle-row"><input type="checkbox" checked={p.featured} onChange={set('featured')} /><span className="toggle-track" /> Featured on homepage</label>
            <label className="toggle a-toggle-row"><input type="checkbox" checked={p.isNew} onChange={set('isNew')} /><span className="toggle-track" /> Show in New</label>
            <Field label="Category">
              <select value={p.category} onChange={set('category')}>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
            </Field>
            <Field label="Sort order" hint="Lower numbers show first"><input type="number" value={p.sort} onChange={set('sort')} /></Field>
          </section>

          <section className="a-card">
            <h3>Price and stock</h3>
            <Field label="Price (₹)"><input type="number" min="1" step="1" required value={p.price} onChange={set('price')} /></Field>
            <Field label="Compare-at price (₹)" hint={off ? `Shows as ${off}% off` : 'Set higher than the price to show a discount'}><input type="number" min="0" step="1" value={p.compareAt} onChange={set('compareAt')} /></Field>
            <Field label="Stock"><input type="number" min="0" value={p.stock} onChange={set('stock')} /></Field>
          </section>

          <section className="a-card">
            <h3>Placeholder colour</h3>
            <p className="muted small">Used for the tile shown until you upload photos.</p>
            <div className="a-art-preview"><ProductImage product={{ ...p, images: [] }} /></div>
            <input type="color" value={p.tone} onChange={set('tone')} className="a-color" aria-label="Placeholder colour" />
          </section>
        </aside>
      </div>
      <Toast />
    </form>
  );
}

// ============================================================ orders
function OrdersTable({ orders, onOpen }) {
  return (
    <table className="a-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th className="num">Total</th></tr></thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} onClick={onOpen ? () => onOpen(o) : undefined} className={onOpen ? 'is-click' : ''}>
            <td><strong>{o.number}</strong></td>
            <td>{o.customer.name}<small className="muted block">{o.email}</small></td>
            <td>{date(o.createdAt)}</td>
            <td><span className={`status status-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
            <td>{o.payment.method === 'cod' ? 'COD' : 'Online'}{o.payment.status === 'paid' ? ', paid' : ''}</td>
            <td className="num">{price(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderPanel({ order, onClose, onSaved }) {
  const { notify } = useStore();
  const [o, setO] = useState(order);
  const [ship, setShip] = useState({ courier: order.shipment?.courier || '', trackingNumber: order.shipment?.trackingNumber || '' });
  const [notes, setNotes] = useState(order.notes || '');
  const [error, setError] = useState('');
  const patch = async (body) => {
    setError('');
    try {
      const u = await api(`/admin/orders/${o.id}`, { method: 'PATCH', body });
      setO(u); onSaved(u); notify('Order updated.');
    } catch (e) { setError(e.message); }
  };
  return (
    <div className="a-panel">
      <div className="a-panel-scrim" onClick={onClose} />
      <aside className="a-panel-body">
        <header className="a-panel-head">
          <div><h2>{o.number}</h2><p className="muted small">{date(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="a-panel-content">
          <Field label="Status">
            <select value={o.status} onChange={(e) => {
              if (e.target.value === 'cancelled' && !window.confirm('Cancel this order? Stock will be returned.')) return;
              patch({ status: e.target.value });
            }} disabled={o.status === 'cancelled'}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <ol className="a-timeline">{o.timeline.map((t, i) => <li key={i}><span>{STATUS_LABEL[t.status]}</span><small>{date(t.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></li>)}</ol>

          <h4>Items</h4>
          <ul className="a-items">{o.items.map((i) => <li key={i.productId + i.color + i.size}><span>{i.qty} × {i.name}{(i.color || i.size) && <small className="muted"> ({[i.color, i.size].filter(Boolean).join(', ')})</small>}</span><span>{price(i.qty * i.price)}</span></li>)}</ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{price(o.subtotal)}</dd></div>
            {o.discount > 0 && <div><dt>Discount ({o.coupon})</dt><dd>−{price(o.discount)}</dd></div>}
            <div><dt>Delivery</dt><dd>{price(o.shipping)}</dd></div>
            <div className="totals-grand"><dt>Total</dt><dd>{price(o.total)}</dd></div>
          </dl>

          <h4>Customer</h4>
          <p>{o.customer.name}<br />{o.email}<br />{o.customer.phone}</p>
          <h4>Ship to</h4>
          <p>{o.address.line1}{o.address.line2 && <>, {o.address.line2}</>}{o.address.landmark && <><br />Near {o.address.landmark}</>}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
          {o.notes && !notes && <p className="muted">Customer note: {o.notes}</p>}
          <h4>Payment</h4>
          <p>{o.payment.method === 'cod' ? 'Cash on delivery' : 'Razorpay'} · {o.payment.status || 'pending'}{o.payment.paymentId && <><br /><small className="muted">{o.payment.paymentId}</small></>}</p>

          <h4>Shipment</h4>
          <div className="field-row">
            <Field label="Courier"><input value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} /></Field>
            <Field label="Tracking number"><input value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} /></Field>
          </div>
          <Field label="Internal notes"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          {error && <p className="field-error">{error}</p>}
          <Button size="sm" icon="check" onClick={() => patch({ ...ship, notes })}>Save shipment and notes</Button>
        </div>
      </aside>
    </div>
  );
}

export function Orders() {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [orders, , setOrders] = useLoad('/admin/orders' + qs({ status, q }));
  const [open, setOpen] = useState(null);
  return (
    <>
      <Head title="Orders">
        <input className="a-search" placeholder="Number, name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </Head>
      <div className="chips a-filter">
        {['all', ...ORDER_STATUSES].map((s) => <button key={s} className={`chip ${status === s ? 'is-active' : ''}`} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : STATUS_LABEL[s]}</button>)}
      </div>
      <div className="a-card a-card-flush">
        {!orders ? <Spinner /> : orders.length ? <OrdersTable orders={orders} onOpen={setOpen} /> : <p className="muted a-pad">No orders match.</p>}
      </div>
      {open && <OrderPanel order={open} onClose={() => setOpen(null)} onSaved={(u) => setOrders((list) => list.map((x) => (x.id === u.id ? u : x)))} />}
      <Toast />
    </>
  );
}

// ============================================================ customers
export function Customers() {
  const [list] = useLoad('/admin/customers');
  if (!list) return <Spinner />;
  return (
    <>
      <Head title="Customers" sub={`${list.length} registered customers. Guest checkouts appear in Orders.`} />
      <div className="a-card a-card-flush">
        {list.length ? (
          <table className="a-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th className="num">Orders</th><th className="num">Spent</th></tr></thead>
            <tbody>{list.map((c) => <tr key={c.id}><td>{c.name || '-'}</td><td>{c.email}</td><td>{c.phone || '-'}</td><td>{date(c.createdAt)}</td><td className="num">{c.orders}</td><td className="num">{price(c.spent)}</td></tr>)}</tbody>
          </table>
        ) : <p className="muted a-pad">No customers yet.</p>}
      </div>
    </>
  );
}

// ============================================================ categories
export function Categories() {
  const [list, reload] = useLoad('/admin/categories');
  const { notify } = useStore();
  const [form, setForm] = useState({ name: '', blurb: '' });
  const [error, setError] = useState('');
  if (!list) return <Spinner />;
  const run = async (fn, msg) => { setError(''); try { await fn(); notify(msg); reload(); return true; } catch (e) { setError(e.message); return false; } };
  return (
    <>
      <Head title="Categories" />
      <div className="a-grid-2">
        <div className="a-card a-card-flush">
          <table className="a-table">
            <thead><tr><th>Name</th><th>Description</th><th className="num">Order</th><th /></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && run(() => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { name: e.target.value } }), 'Saved.')} /></td>
                  <td><input defaultValue={c.blurb} onBlur={(e) => e.target.value !== c.blurb && run(() => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { blurb: e.target.value } }), 'Saved.')} /></td>
                  <td className="num"><input type="number" className="a-num" defaultValue={c.sort} onBlur={(e) => Number(e.target.value) !== c.sort && run(() => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { sort: e.target.value } }), 'Saved.')} /></td>
                  <td>{c.virtual ? <small className="muted">Automatic</small> : <button className="icon-btn" aria-label="Delete" onClick={() => window.confirm(`Delete ${c.name}?`) && run(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }), 'Deleted.')}><Icon name="trash" size={16} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="a-card" onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/categories', { method: 'POST', body: form }), 'Category added.').then((ok) => ok && setForm({ name: '', blurb: '' })); }}>
          <h3>Add a category</h3>
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Short description"><input value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} /></Field>
          {error && <p className="field-error">{error}</p>}
          <Button type="submit" size="sm" icon="plus">Add category</Button>
          <p className="muted small a-note">"New" fills itself with products marked as new.</p>
        </form>
      </div>
      <Toast />
    </>
  );
}

// ============================================================ coupons
export function Coupons() {
  const [list, reload] = useLoad('/admin/coupons');
  const { notify } = useStore();
  const blank = { code: '', type: 'percent', value: '', minOrder: '', maxUses: '', expiresAt: '' };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  if (!list) return <Spinner />;
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const create = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/admin/coupons', { method: 'POST', body: form }); setForm(blank); notify('Coupon created.'); reload(); } catch (err) { setError(err.message); }
  };
  return (
    <>
      <Head title="Coupons" />
      <div className="a-grid-2">
        <div className="a-card a-card-flush">
          <table className="a-table">
            <thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Used</th><th>Expires</th><th>Active</th><th /></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.type === 'percent' ? `${c.value}%` : price(c.value)}</td>
                  <td>{c.minOrder ? price(c.minOrder) : '-'}</td>
                  <td>{c.used}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td>{c.expiresAt ? date(c.expiresAt) : 'Never'}</td>
                  <td><Switch on={c.active} label="Active" onChange={async (v) => { await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { active: v } }); reload(); }} /></td>
                  <td><button className="icon-btn" aria-label="Delete" onClick={async () => { if (window.confirm(`Delete ${c.code}?`)) { await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }); reload(); } }}><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="a-card" onSubmit={create}>
          <h3>New coupon</h3>
          <div className="field-row">
            <Field label="Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="Type"><select value={form.type} onChange={f('type')}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></Field>
          </div>
          <div className="field-row">
            <Field label={form.type === 'percent' ? 'Percent' : 'Amount (₹)'}><input type="number" min="1" required value={form.value} onChange={f('value')} /></Field>
            <Field label="Minimum order (₹)"><input type="number" min="0" value={form.minOrder} onChange={f('minOrder')} /></Field>
          </div>
          <div className="field-row">
            <Field label="Max uses" hint="Empty for unlimited"><input type="number" min="1" value={form.maxUses} onChange={f('maxUses')} /></Field>
            <Field label="Expires on"><input type="date" value={form.expiresAt} onChange={f('expiresAt')} /></Field>
          </div>
          {error && <p className="field-error">{error}</p>}
          <Button type="submit" size="sm" icon="plus">Create coupon</Button>
        </form>
      </div>
      <Toast />
    </>
  );
}

// ============================================================ reviews
export function Reviews() {
  const [list, reload] = useLoad('/admin/reviews');
  if (!list) return <Spinner />;
  return (
    <>
      <Head title="Reviews" sub="Reviews are published immediately. Hide anything abusive or off topic." />
      {list.length ? (
        <div className="a-reviews">
          {list.map((r) => (
            <article key={r.id} className={`a-card a-review ${r.status === 'hidden' ? 'is-dim' : ''}`}>
              <div className="row-between"><strong>{r.productName}</strong><Stars value={r.rating} /></div>
              {r.title && <h4>{r.title}</h4>}
              <p>{r.body}</p>
              <p className="muted small">{r.name} · {date(r.createdAt)}{r.verified ? ' · Verified purchase' : ''}</p>
              <div className="row-gap">
                <button className="link-btn" onClick={async () => { await api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: { status: r.status === 'hidden' ? 'published' : 'hidden' } }); reload(); }}>{r.status === 'hidden' ? 'Publish' : 'Hide'}</button>
                <button className="link-btn" onClick={async () => { if (window.confirm('Delete this review permanently?')) { await api(`/admin/reviews/${r.id}`, { method: 'DELETE' }); reload(); } }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="a-card"><p className="muted">No reviews yet. They will appear here as customers write them.</p></div>}
    </>
  );
}

// ============================================================ ideas
const IDEA_STATUSES = ['new', 'quoted', 'accepted', 'in-production', 'done', 'declined'];
export function Ideas() {
  const [list, reload] = useLoad('/admin/ideas');
  const [filter, setFilter] = useState('all');
  if (!list) return <Spinner />;
  const shown = list.filter((i) => filter === 'all' || i.status === filter);
  const update = async (i, body) => { await api(`/admin/ideas/${i.id}`, { method: 'PATCH', body }); reload(); };
  return (
    <>
      <Head title="Custom requests" sub="Requests from the Make it yours page. Reply by email with a quote." />
      <div className="chips a-filter">
        {['all', ...IDEA_STATUSES].map((s) => <button key={s} className={`chip ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>{s} {s !== 'all' && `(${list.filter((i) => i.status === s).length})`}</button>)}
      </div>
      {shown.length ? (
        <div className="a-ideas">
          {shown.map((i) => (
            <article key={i.id} className="a-card a-idea">
              {i.image && <a href={i.image} target="_blank" rel="noreferrer"><img src={i.image} alt="Submitted" /></a>}
              <p className="a-idea-text">"{i.problem}"</p>
              <p className="muted small">{i.name || 'No name'}{i.email && <> · <a href={`mailto:${i.email}`}>{i.email}</a></>}{i.phone && <> · {i.phone}</>} · {date(i.createdAt)}</p>
              <select value={i.status} onChange={(e) => update(i, { status: e.target.value })}>
                {IDEA_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea rows={2} placeholder="Notes (quote, colours, deadline)" defaultValue={i.notes} onBlur={(e) => e.target.value !== i.notes && update(i, { notes: e.target.value })} />
            </article>
          ))}
        </div>
      ) : <div className="a-card"><p className="muted">No requests here yet.</p></div>}
    </>
  );
}

// ============================================================ subscribers
export function Subscribers() {
  const [list, reload] = useLoad('/admin/subscribers');
  if (!list) return <Spinner />;
  const csv = () => {
    const blob = new Blob(['email,subscribed\n' + list.map((s) => `${s.email},${s.createdAt}`).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'formo-subscribers.csv'; a.click();
  };
  return (
    <>
      <Head title="Subscribers" sub={`${list.length} newsletter subscribers`}>
        {list.length > 0 && <Button size="sm" variant="ghost" icon="arrow" onClick={csv}>Export CSV</Button>}
      </Head>
      <div className="a-card a-card-flush">
        {list.length ? (
          <table className="a-table">
            <thead><tr><th>Email</th><th>Subscribed</th><th /></tr></thead>
            <tbody>{list.map((s) => <tr key={s.id}><td>{s.email}</td><td>{date(s.createdAt)}</td><td><button className="link-btn" onClick={async () => { if (window.confirm(`Unsubscribe ${s.email}?`)) { await api(`/admin/subscribers/${s.id}`, { method: 'DELETE' }); reload(); } }}>Unsubscribe</button></td></tr>)}</tbody>
          </table>
        ) : <p className="muted a-pad">No subscribers yet.</p>}
      </div>
    </>
  );
}
