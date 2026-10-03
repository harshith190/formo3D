import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { discountPct } from '../lib/format.js';
import ProductImage from './ProductImage.jsx';
import Icon from './Icons.jsx';
import { Price, Stars } from './UI.jsx';

function ProductCard({ product: p, onQuickView, size = '' }) {
  const { toggleWish, wish } = useStore();
  const saved = wish.has(p.id);
  const off = discountPct(p);
  const soldOut = p.stock <= 0;

  return (
    <article className={`card ${size} ${soldOut ? 'is-soldout' : ''}`}>
      <div className="card-media">
        <Link to={`/product/${p.slug}`} className="card-stage" aria-label={p.name}>
          <ProductImage product={p} />
        </Link>
        <div className="card-flags">
          {p.isNew && <span className="flag">New</span>}
          {off > 0 && <span className="flag flag-accent">{off}% off</span>}
          {soldOut && <span className="flag flag-muted">Sold out</span>}
        </div>
        <button className={`card-wish ${saved ? 'is-on' : ''}`} onClick={() => toggleWish(p)} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
          <Icon name="heart" size={18} fill={saved} />
        </button>
        {onQuickView && !soldOut && (
          <button className="card-quick" onClick={() => onQuickView(p)}>
            <Icon name="plus" size={16} /> Quick add
          </button>
        )}
      </div>

      <div className="card-info">
        <h3 className="card-name"><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <Price product={p} />
      </div>
      <div className="card-sub">
        {p.colors?.length > 0 && (
          <span className="card-dots" aria-label={`${p.colors.length} colours`}>
            {p.colors.slice(0, 5).map((c) => <i key={c.name} style={{ background: c.hex }} />)}
            {p.colors.length > 5 && <small>+{p.colors.length - 5}</small>}
          </span>
        )}
        {p.reviewCount > 0 && <span className="card-rating"><Stars value={p.rating} size={12} /> ({p.reviewCount})</span>}
      </div>
    </article>
  );
}

export default memo(ProductCard);
