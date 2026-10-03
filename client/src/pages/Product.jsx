import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { date, discountPct, price as fmt } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import Options, { optionPrice } from '../components/Options.jsx';
import { Qty, useShopConfig } from '../components/CartDrawer.jsx';
import Icon from '../components/Icons.jsx';
import { Button, Empty, Field, Spinner, Stars } from '../components/UI.jsx';

function Gallery({ p }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [p.id]);
  const count = Math.max(1, p.images?.length || 0);
  return (
    <div className="gallery">
      <div className="gallery-stage">
        <ProductImage product={p} index={i} key={i} className="gallery-img" />
        {discountPct(p) > 0 && <span className="flag flag-accent gallery-flag">{discountPct(p)}% off</span>}
      </div>
      {count > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Photos">
          {p.images.map((src, k) => (
            <button key={src} role="tab" aria-selected={k === i} className={k === i ? 'is-active' : ''} onClick={() => setI(k)}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ product, onAdded }) {
  const { user } = useStore();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <p className="muted"><Link to={`/login?next=/product/${product.slug}`} className="link-arrow">Sign in to write a review</Link></p>;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Choose a star rating.');
    setBusy(true); setError('');
    try { onAdded(await api(`/products/${product.id}/reviews`, { method: 'POST', body: { rating, body } })); }
    catch (err) { setError(err.message); }
    setBusy(false);
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <div className="star-input" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className={rating >= n ? 'is-on' : ''}>
            <Icon name="star" size={22} fill={rating >= n} />
          </button>
        ))}
      </div>
      <Field label="Your review"><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={2000} /></Field>
      {error && <p className="field-error">{error}</p>}
      <Button type="submit" loading={busy} size="sm">Post review</Button>
    </form>
  );
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWish, wish } = useStore();
  const { freeShippingOver } = useShopConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    setData(null); setError(''); setQty(1);
    api(`/products/${slug}`).then((d) => {
      setData(d);
      setColor(d.product.colors?.[0]?.name ?? null);
      setSize(d.product.sizes?.[0]?.label ?? null);
    }).catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => { if (data) document.title = `${data.product.name} | FORMO`; }, [data]);

  if (error) return <div className="wrap page-pad"><Empty title="We could not find that toy." action={<Button to="/shop">Back to shop</Button>} /></div>;
  if (!data) return <div className="page-pad"><Spinner /></div>;

  const { product: p, reviews, related } = data;
  const saved = wish.has(p.id);
  const soldOut = p.stock <= 0;
  const unit = optionPrice(p, size);
  const add = (open = true) => addToCart(p, qty, { color, size, open });

  return (
    <div className="pdp">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link><span>/</span>
          <Link to={`/shop?category=${p.category}`}>{p.category}</Link>
        </nav>

        <div className="pdp-top">
          <Gallery p={p} />

          <div className="pdp-info">
            <h1 className="pdp-name">{p.name}</h1>
            {p.reviewCount > 0 && <a href="#reviews" className="pdp-rating"><Stars value={p.rating} /> {p.rating} ({p.reviewCount})</a>}
            <p className="pdp-price">
              {fmt(unit)}
              {p.compareAt > p.price && <s className="price-was">{fmt(p.compareAt + (unit - p.price))}</s>}
            </p>
            <p className="pdp-desc">{p.description || p.tagline}</p>

            <Options product={p} color={color} setColor={setColor} size={size} setSize={setSize} />

            <p className={`stock ${soldOut ? 'is-out' : p.stock <= 5 ? 'is-low' : ''}`}>
              <span className="stock-dot" />
              {soldOut ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock. Made and shipped in 3 to 5 days.'}
            </p>

            <div className="pdp-buy">
              <Qty value={qty} max={p.stock} onChange={setQty} />
              <Button icon="plus" disabled={soldOut} onClick={() => add()} className="pdp-add">Add to bag</Button>
              <button className={`icon-btn icon-btn-line ${saved ? 'is-on' : ''}`} onClick={() => toggleWish(p)} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
                <Icon name="heart" fill={saved} />
              </button>
            </div>
            <Button variant="ghost" className="btn-block" icon={null} disabled={soldOut} onClick={() => { add(false); navigate('/checkout'); }}>Buy now</Button>

            <details className="pdp-details" open>
              <summary>Details</summary>
              <dl className="specs">
                {[['Size', p.dimensions], ['Material', p.material], ['Care', p.care]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              {p.features?.length > 0 && <ul className="pdp-features">{p.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>}
            </details>
            <p className="muted small"><Icon name="truck" size={16} /> Free delivery over {fmt(freeShippingOver)}. Want a different colour? <Link to="/custom" className="link-btn">Ask us</Link></p>
          </div>
        </div>

        <section className="pdp-reviews" id="reviews">
          <div className="sec-head"><h2>Reviews {p.reviewCount > 0 && <span className="muted">({p.reviewCount})</span>}</h2></div>
          <div className="reviews-grid">
            <div>
              {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
              <ul className="review-list">
                {reviews.map((r) => (
                  <li key={r.id} className="review">
                    <div className="review-top"><Stars value={r.rating} /><span className="muted small">{date(r.createdAt)}</span></div>
                    <p>{r.body}</p>
                    <p className="review-by">{r.name}{r.verified && <span className="verified"><Icon name="check" size={14} /> Verified purchase</span>}</p>
                  </li>
                ))}
              </ul>
            </div>
            <ReviewForm product={p} onAdded={(r) => setData((d) => ({
              ...d,
              reviews: [r, ...d.reviews],
              product: { ...d.product, reviewCount: d.product.reviewCount + 1, rating: Math.round((((d.product.rating || 0) * d.product.reviewCount + r.rating) / (d.product.reviewCount + 1)) * 10) / 10 },
            }))} />
          </div>
        </section>

        {related.length > 0 && (
          <section className="pdp-related">
            <div className="sec-head"><h2>You may also like</h2></div>
            <div className="grid grid-4">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
          </section>
        )}
      </div>

      <div className="buybar">
        <div><strong>{p.name}</strong><span>{fmt(unit)}</span></div>
        <Button icon="plus" size="sm" disabled={soldOut} onClick={() => add()}>Add to bag</Button>
      </div>
    </div>
  );
}
