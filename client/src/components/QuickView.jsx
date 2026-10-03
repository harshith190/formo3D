import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { price } from '../lib/format.js';
import ProductImage from './ProductImage.jsx';
import Options, { optionPrice } from './Options.jsx';
import { Qty } from './CartDrawer.jsx';
import Icon from './Icons.jsx';
import { Button } from './UI.jsx';

export default function QuickView({ product: p, onClose }) {
  const { addToCart } = useStore();
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    setQty(1);
    if (!p) return;
    setColor(p.colors?.[0]?.name ?? null);
    setSize(p.sizes?.[0]?.label ?? null);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [p, onClose]);

  if (!p) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={p.name}>
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-panel qv">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <div className="qv-stage"><ProductImage product={p} /></div>
        <div className="qv-info">
          <h2>{p.name}</h2>
          <p className="qv-price">{price(optionPrice(p, size))}</p>
          <Options product={p} color={color} setColor={setColor} size={size} setSize={setSize} />
          <div className="qv-buy">
            <Qty value={qty} max={p.stock} onChange={setQty} />
            <Button icon="plus" onClick={() => { addToCart(p, qty, { color, size }); onClose(); }}>Add to bag</Button>
          </div>
          <Link to={`/product/${p.slug}`} className="link-arrow" onClick={onClose}>View details <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    </div>
  );
}
