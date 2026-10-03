import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { STATUS_LABEL, TRACK_STEPS, date, price } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { LineThumb } from '../components/CartDrawer.jsx';
import { lineLabel } from '../components/Options.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Empty, Field, Spinner } from '../components/UI.jsx';
import { orderKeys } from './Checkout.jsx';
import { site } from '../site.js';

export function Timeline({ order }) {
  if (order.status === 'cancelled') return <p className="status-pill is-cancelled">This order was cancelled.</p>;
  if (order.status === 'pending_payment') return <p className="status-pill is-pending">Awaiting payment. If money was deducted, write to us at {site.email} with your order number and we will sort it out.</p>;
  const reached = TRACK_STEPS.indexOf(order.status);
  const when = Object.fromEntries(order.timeline.map((t) => [t.status, t.at]));
  return (
    <ol className="timeline">
      {TRACK_STEPS.map((s, i) => (
        <li key={s} className={i <= reached ? 'is-done' : ''}>
          <span className="tl-dot">{i <= reached && <Icon name="check" size={12} />}</span>
          <span className="tl-label">{STATUS_LABEL[s]}</span>
          <span className="tl-date">{when[s] ? date(when[s], { day: 'numeric', month: 'short' }) : ''}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({ order }) {
  return (
    <div className="order-detail">
      <Timeline order={order} />
      {order.shipment?.trackingNumber && (
        <p className="muted">Shipped with {order.shipment.courier || 'our courier partner'}, tracking number <strong>{order.shipment.trackingNumber}</strong>.</p>
      )}
      <div className="order-cols">
        <ul className="summary-lines">
          {order.items.map((i, k) => (
            <li key={k}>
              <LineThumb item={i} />
              <span className="summary-name"><Link to={`/product/${i.slug}`}>{i.name}</Link><small>{[lineLabel(i), `Qty ${i.qty}`].filter(Boolean).join(' · ')}</small></span>
              <span>{price(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{price(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="is-discount"><dt>Discount {order.coupon && `(${order.coupon})`}</dt><dd>−{price(order.discount)}</dd></div>}
            <div><dt>Delivery</dt><dd>{order.shipping ? price(order.shipping) : 'Free'}</dd></div>
            <div className="totals-grand"><dt>Total</dt><dd>{price(order.total)}</dd></div>
          </dl>
          <div className="order-addr">
            <h4>Delivering to</h4>
            <p>{order.customer.name}<br />{order.address.line1}{order.address.line2 && <>, {order.address.line2}</>}<br />{order.address.city}, {order.address.state} {order.address.pincode}<br />{order.customer.phone}</p>
            <h4>Payment</h4>
            <p>{order.payment.method === 'cod' ? 'Cash on delivery' : 'Online'}{order.payment.status === 'paid' ? ', paid' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderPlaced() {
  const { number } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Order placed | FORMO';
    const key = orderKeys.get(number);
    api('/orders/lookup' + qs({ number, key })).then(setOrder).catch((e) => setError(e.message));
  }, [number]);

  if (error) return <div className="wrap page-pad"><Empty title="We could not open this order here." action={<Button to="/track">Track it with your email</Button>}>{error}</Empty></div>;
  if (!order) return <div className="page-pad"><Spinner /></div>;

  return (
    <div className="wrap page-pad confirm">
      <div className="confirm-head">
        <span className="confirm-check"><Icon name="check" size={28} /></span>
        <p className="eyebrow">Order {order.number}</p>
        <h1 className="page-title">{order.status === 'pending_payment' ? 'Order saved.' : 'Thank you. It is on its way soon.'}</h1>
        <p className="muted">Save your order number. You can track this order any time with it and {order.email}.</p>
      </div>
      <OrderDetail order={order} />
      <div className="confirm-actions">
        <Button to="/shop" variant="ghost">Keep browsing</Button>
        <Button to={`/track?number=${order.number}`}>Track this order</Button>
      </div>
    </div>
  );
}

export function Track() {
  const { user } = useStore();
  const params = new URLSearchParams(window.location.search);
  const [number, setNumber] = useState(params.get('number') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Track your order | FORMO'; }, []);
  useEffect(() => { if (user && !email) setEmail(user.email); }, [user, email]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setOrder(null);
    try {
      setOrder(await api('/orders/lookup' + qs({ number: number.trim(), email: email.trim(), key: orderKeys.get(number.trim()) })));
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="wrap page-pad track">
      <p className="eyebrow">Order tracking</p>
      <h1 className="page-title">Where is my order?</h1>
      <form className="track-form" onSubmit={submit}>
        <Field label="Order number"><input required value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="FM..." /></Field>
        <Field label="Email used for the order"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Button type="submit" loading={busy}>Track</Button>
      </form>
      {error && <p className="field-error">{error}</p>}
      {order && (
        <div className="track-result">
          <h2>Order {order.number} <span className="muted">placed {date(order.createdAt)}</span></h2>
          <OrderDetail order={order} />
        </div>
      )}
    </div>
  );
}
