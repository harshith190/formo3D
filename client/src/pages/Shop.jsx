import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { gsap, reducedMotion } from '../lib/motion.js';
import ProductCard from '../components/ProductCard.jsx';
import QuickView from '../components/QuickView.jsx';
import Icon from '../components/Icons.jsx';
import { Empty, Spinner } from '../components/UI.jsx';

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['popular', 'Most popular'],
  ['rating', 'Top rated'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
];
const PRICES = [['', '', 'Any price'], ['', '400', 'Under ₹400'], ['400', '500', '₹400 to ₹500'], ['500', '', '₹500 and up']];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [qv, setQv] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');
  const grid = useRef();

  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'featured';
  const min = params.get('min') || '';
  const max = params.get('max') || '';
  const inStock = params.get('inStock') === '1';
  const query = params.get('q') || '';

  const set = (patch) => {
    const next = Object.fromEntries(params.entries());
    Object.assign(next, patch);
    for (const k of Object.keys(next)) if (!next[k] || next[k] === 'all' || (k === 'sort' && next[k] === 'featured')) delete next[k];
    setParams(next, { replace: true });
  };

  useEffect(() => { api('/categories').then(setCategories).catch(() => {}); }, []);
  useEffect(() => { setQ(query); }, [query]);

  // Debounce typing into the URL.
  useEffect(() => {
    if (q === query) return;
    const t = setTimeout(() => set({ q }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    let live = true;
    api('/products' + qs({ category, sort, min, max, q: query, inStock: inStock ? 1 : '' }))
      .then((list) => live && setProducts(list))
      .catch(() => live && setProducts([]));
    return () => { live = false; };
  }, [category, sort, min, max, query, inStock]);

  useLayoutEffect(() => {
    if (!products?.length || reducedMotion() || !grid.current) return;
    const ctx = gsap.context(() => {
      gsap.from(grid.current.children, { y: 30, opacity: 0, duration: 0.7, stagger: 0.05, clearProps: 'all' });
    }, grid);
    return () => ctx.revert();
  }, [products]);

  const current = categories.find((c) => c.slug === category);
  useEffect(() => { document.title = `${current ? current.name : 'Shop'} | FORMO`; }, [current]);
  const activeFilters = (min || max ? 1 : 0) + (inStock ? 1 : 0);

  return (
    <div className="shop wrap">
      <header className="shop-head">
        <div>
          <p className="eyebrow">Shop</p>
          <h1 className="page-title">{current ? current.name : 'Everything'}</h1>
          <p className="muted shop-blurb">{current ? current.blurb : 'Every toy, in your choice of colour.'}</p>
        </div>
        <label className="shop-search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search toys" aria-label="Search products" />
          {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear search"><Icon name="close" size={16} /></button>}
        </label>
      </header>

      <nav className="tabs" aria-label="Categories">
        <button className={category === 'all' ? 'is-active' : ''} onClick={() => set({ category: '' })}>All</button>
        {categories.map((c) => (
          <button key={c.slug} className={category === c.slug ? 'is-active' : ''} onClick={() => set({ category: c.slug })}>
            {c.name} <sup>{c.count}</sup>
          </button>
        ))}
      </nav>

      <div className="shop-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => setFiltersOpen((f) => !f)} aria-expanded={filtersOpen}>
          <Icon name="filter" size={16} /><span className="btn-label">Filters{activeFilters ? ` (${activeFilters})` : ''}</span>
        </button>
        <span className="muted small">{products ? `${products.length} ${products.length === 1 ? 'product' : 'products'}` : ''}</span>
        <label className="select-wrap">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => set({ sort: e.target.value })}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <div className={`filters ${filtersOpen ? 'is-open' : ''}`}>
        <fieldset>
          <legend>Price</legend>
          <div className="chips">
            {PRICES.map(([lo, hi, label]) => (
              <button key={label} className={`chip ${min === lo && max === hi ? 'is-active' : ''}`} onClick={() => set({ min: lo, max: hi })}>{label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Availability</legend>
          <label className="toggle">
            <input type="checkbox" checked={inStock} onChange={(e) => set({ inStock: e.target.checked ? '1' : '' })} />
            <span className="toggle-track" /> In stock only
          </label>
        </fieldset>
        {activeFilters > 0 && <button className="link-btn" onClick={() => set({ min: '', max: '', inStock: '' })}>Clear filters</button>}
      </div>

      {!products ? <Spinner /> : products.length === 0 ? (
        <Empty
          title={query ? `Nothing matches "${query}" yet.` : 'Nothing here yet.'}
          action={<p>Can't find it? <Link to="/custom" className="link-arrow">Ask us to make it <Icon name="arrow" size={16} /></Link></p>}
        />
      ) : (
        <div className="grid" ref={grid}>
          {products.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQv} />)}
        </div>
      )}

      <QuickView product={qv} onClose={() => setQv(null)} />
    </div>
  );
}
