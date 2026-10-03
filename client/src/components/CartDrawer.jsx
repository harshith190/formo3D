import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { api } from '../lib/api.js';
import { price } from '../lib/format.js';
import ProductImage from './ProductImage.jsx';
import { lineLabel } from './Options.jsx';
import Icon from './Icons.jsx';
import { Button } from './UI.jsx';

let shopConfig = null;
export function useShopConfig() {
  const [cfg, setCfg] = useState(shopConfig || { freeShippingOver: 999, shippingFee: 79, methods: [{ key: 'cod', label: 'Cash on delivery' }] });
  useEffect(() => {
    if (shopConfig) return;
    api('/orders/payment-methods').then((c) => { shopConfig = c; setCfg(c); }).catch(() => {});
  }, []);
  return cfg;
}

export function Qty({ value, onChange, max }) {
  return (
    <div className="qty">
      <button onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity"><Icon name="minus" size={14} /></button>
      <span aria-live="polite">{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={max && value >= max} aria-label="Increase quantity"><Icon name="plus" size={14} /></button>
    </div>
  );
}

export function LineThumb({ item }) {
  return (
    <div className="line-thumb"><ProductImage product={item} /></div>
  );
}

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, removeFromCart, cartSubtotal, cartCount } = useStore();
  const { freeShippingOver } = useShopConfig();
  const navigate = useNavigate();
  const remaining = Math.max(0, freeShippingOver - cartSubtotal);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [cartOpen, setCartOpen]);

  return (
    <div className={`drawer ${cartOpen ? 'is-open' : ''}`} aria-hidden={!cartOpen}>
      <div className="drawer-scrim" onClick={() => setCartOpen(false)} />
      <aside className="drawer-panel" role="dialog" aria-label="Shopping bag" aria-modal="true">
        <header className="drawer-head">
          <h2>Your bag <sup>{cartCount}</sup></h2>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag"><Icon name="close" /></button>
        </header>

        {cart.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty.</p>
            <Button to="/shop" onClick={() => setCartOpen(false)}>Browse products</Button>
          </div>
        ) : (
          <>
            <div className="ship-meter">
              <p>{remaining > 0 ? <>Add <strong>{price(remaining)}</strong> more for free delivery.</> : <>Your order ships free.</>}</p>
              <div className="ship-bar"><span style={{ transform: `scaleX(${Math.min(1, cartSubtotal / freeShippingOver)})` }} /></div>
            </div>
            <ul className="drawer-lines">
              {cart.map((i) => (
                <li key={i.key} className="line">
                  <LineThumb item={i} />
                  <div className="line-body">
                    <div className="line-top">
                      <span><Link to={`/product/${i.slug}`} onClick={() => setCartOpen(false)} className="line-name">{i.name}</Link><small className="line-opts">{lineLabel(i)}</small></span>
                      <span>{price(i.price * i.qty)}</span>
                    </div>
                    <div className="line-bottom">
                      <Qty value={i.qty} max={i.stock} onChange={(q) => setQty(i.key, q)} />
                      <button className="link-btn" onClick={() => removeFromCart(i.key)}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="drawer-foot">
              <div className="row-between"><span>Subtotal</span><strong>{price(cartSubtotal)}</strong></div>
              <p className="muted small">Delivery and any discount codes are applied at checkout.</p>
              <Button className="btn-block" onClick={() => { setCartOpen(false); navigate('/checkout'); }}>Checkout</Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
