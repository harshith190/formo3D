import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { INDIAN_STATES, price } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { LineThumb, useShopConfig } from '../components/CartDrawer.jsx';
import { lineLabel } from '../components/Options.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Empty, Field } from '../components/UI.jsx';

const blankAddress = { line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' };

export const orderKeys = {
  set(number, key) { try { sessionStorage.setItem('formo.order.' + number, key); } catch {} },
  get(number) { try { return sessionStorage.getItem('formo.order.' + number); } catch { return null; } },
};

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { cart, user, clearCart, notify } = useStore();
  const { methods } = useShopConfig();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ email: '', name: '', phone: '' });
  const [address, setAddress] = useState(blankAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [payment, setPayment] = useState('cod');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Checkout | FORMO'; }, []);

  useEffect(() => {
    if (!user) return;
    setCustomer((c) => ({ email: user.email, name: c.name || user.name || '', phone: c.phone || user.phone || '' }));
    if (user.addresses?.[0]) setAddress({ ...blankAddress, ...user.addresses[0] });
  }, [user]);

  const items = cart.map((i) => ({ productId: i.productId, qty: i.qty, color: i.color, size: i.size }));
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (!items.length) return;
    api('/orders/quote', { method: 'POST', body: { items, coupon } })
      .then((q) => { setQuote(q); if (coupon) setQuoteError(''); })
      .catch((e) => {
        setQuoteError(e.message);
        // An invalid code should not block checkout: drop it and re-quote without it.
        if (coupon) setCoupon('');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, coupon]);

  if (!cart.length) {
    return <div className="wrap page-pad"><Empty title="Your bag is empty." action={<Button to="/shop">Browse products</Button>} /></div>;
  }

  const c = (k) => (e) => setCustomer({ ...customer, [k]: e.target.value });
  const a = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  const finish = (order, accessKey) => {
    orderKeys.set(order.number, accessKey);
    clearCart();
    navigate(`/order/${order.number}`);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { order, accessKey } = await api('/orders', {
        method: 'POST',
        body: { items, coupon, customer, address, paymentMethod: payment, notes, saveAddress },
      });
      if (order.payment.provider !== 'razorpay') return finish(order, accessKey);

      await loadRazorpay();
      const rz = new window.Razorpay({
        key: order.payment.keyId,
        order_id: order.payment.razorpayOrderId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        name: 'FORMO',
        description: `Order ${order.number}`,
        prefill: { name: customer.name, email: order.email, contact: customer.phone },
        theme: { color: '#1C1B19' },
        handler: async (resp) => {
          try {
            await api(`/orders/${order.number}/verify-payment`, { method: 'POST', body: { ...resp, accessKey } });
            finish(order, accessKey);
          } catch (err) { setError(err.message); setBusy(false); }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            notify('Payment was not completed. Your order is saved as awaiting payment.');
            finish(order, accessKey);
          },
        },
      });
      rz.open();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="checkout wrap">
      <header className="checkout-head">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title">Almost yours.</h1>
        {!user && <p className="muted">Have an account? <Link to="/login?next=/checkout" className="link-arrow">Sign in</Link> for faster checkout and order history.</p>}
      </header>

      <form className="checkout-grid" onSubmit={submit}>
        <div className="checkout-form">
          <fieldset className="panel">
            <legend><span>01</span> Contact</legend>
            <Field label="Email"><input type="email" required value={customer.email} onChange={c('email')} disabled={Boolean(user)} autoComplete="email" /></Field>
            <div className="field-row">
              <Field label="Full name"><input required value={customer.name} onChange={c('name')} autoComplete="name" /></Field>
              <Field label="Mobile number" hint="For delivery updates"><input required inputMode="tel" pattern="[0-9 +\-]{10,15}" value={customer.phone} onChange={c('phone')} autoComplete="tel" /></Field>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend><span>02</span> Delivery address</legend>
            {user?.addresses?.length > 1 && (
              <div className="chips saved-addr">
                {user.addresses.map((ad, i) => (
                  <button type="button" key={i} className={`chip ${ad.line1 === address.line1 ? 'is-active' : ''}`} onClick={() => setAddress({ ...blankAddress, ...ad })}>
                    {ad.line1.slice(0, 24)}, {ad.city}
                  </button>
                ))}
              </div>
            )}
            <Field label="House / flat, building, street"><input required value={address.line1} onChange={a('line1')} autoComplete="address-line1" /></Field>
            <Field label="Area, locality (optional)"><input value={address.line2} onChange={a('line2')} autoComplete="address-line2" /></Field>
            <Field label="Landmark (optional)"><input value={address.landmark} onChange={a('landmark')} /></Field>
            <div className="field-row field-row-3">
              <Field label="City"><input required value={address.city} onChange={a('city')} autoComplete="address-level2" /></Field>
              <Field label="State">
                <select required value={address.state} onChange={a('state')} autoComplete="address-level1">
                  <option value="">Select</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="PIN code"><input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={address.pincode} onChange={a('pincode')} autoComplete="postal-code" /></Field>
            </div>
            {user && (
              <label className="check"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account</label>
            )}
          </fieldset>

          <fieldset className="panel">
            <legend><span>03</span> Payment</legend>
            <div className="pay-options">
              {methods.map((m) => (
                <label key={m.key} className={`pay-option ${payment === m.key ? 'is-active' : ''}`}>
                  <input type="radio" name="payment" value={m.key} checked={payment === m.key} onChange={() => setPayment(m.key)} />
                  <span className="pay-radio" />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
            <Field label="Delivery notes (optional)"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></Field>
          </fieldset>
        </div>

        <aside className="checkout-summary panel">
          <h2>Order summary</h2>
          <ul className="summary-lines">
            {cart.map((i) => (
              <li key={i.key}>
                <LineThumb item={i} />
                <span className="summary-name">{i.name}<small>{[lineLabel(i), `Qty ${i.qty}`].filter(Boolean).join(' · ')}</small></span>
                <span>{price(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="coupon">
            {coupon ? (
              <p className="coupon-applied"><Icon name="tag" size={16} /> <strong>{coupon}</strong> applied <button type="button" className="link-btn" onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</button></p>
            ) : (
              <div className="coupon-row">
                <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setQuoteError(''); }} placeholder="Discount code" aria-label="Discount code" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => couponInput && setCoupon(couponInput)}><span className="btn-label">Apply</span></button>
              </div>
            )}
            {quoteError && <p className="field-error">{quoteError}</p>}
          </div>

          {quote && (
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>{price(quote.subtotal)}</dd></div>
              {quote.discount > 0 && <div className="is-discount"><dt>Discount</dt><dd>−{price(quote.discount)}</dd></div>}
              <div><dt>Delivery</dt><dd>{quote.shipping ? price(quote.shipping) : 'Free'}</dd></div>
              <div className="totals-grand"><dt>Total</dt><dd>{price(quote.total)}</dd></div>
            </dl>
          )}
          {error && <p className="field-error form-error">{error}</p>}
          <Button type="submit" className="btn-block" loading={busy} disabled={!quote}>
            {payment === 'cod' ? 'Place order' : `Pay ${quote ? price(quote.total) : ''}`}
          </Button>
          <p className="muted small center">By placing an order you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
        </aside>
      </form>
    </div>
  );
}
