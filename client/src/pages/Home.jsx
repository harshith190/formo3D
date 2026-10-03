import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { gsap, lightMotion, reducedMotion, useReveal } from '../lib/motion.js';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import QuickView from '../components/QuickView.jsx';
import Icon from '../components/Icons.jsx';
import { Button } from '../components/UI.jsx';

const HERO_NAV = [
  ['Fidget & Flexi', '/shop?category=fidget'],
  ['Animals', '/shop?category=animals'],
  ['Figurines', '/shop?category=figurines'],
  ['New', '/shop?category=new'],
];

function Hero({ products }) {
  const ref = useRef();

  // Entrance: headline lines rise out of a mask, then the nav row and side notes.
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.hero-title .ln > span', { yPercent: 115, duration: 1.2, stagger: 0.09 })
        .from('.hero-meta > *', { y: 12, opacity: 0, duration: 0.7, stagger: 0.06 }, '-=0.9')
        .from('.hero-nav li', { y: 24, opacity: 0, duration: 0.8, stagger: 0.06 }, '-=0.7')
        .from('.hero-row > p, .hero-row .hero-ctas', { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, '-=0.6');
    }, ref);
    return () => ctx.revert();
  }, []);

  // The center image widens to full screen as you scroll, revealing the side tiles.
  useLayoutEffect(() => {
    if (!products.length || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-media', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.5 });
      if (lightMotion()) return;
      gsap.fromTo('.hero-media',
        { clipPath: 'inset(0% 33% 0% 33% round 10px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
          scrollTrigger: { trigger: '.hero-media', start: 'top 80%', end: 'top 10%', scrub: 0.6 } });
      gsap.fromTo('.hero-media .hero-tile', { scale: 1.15 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.hero-media', start: 'top 80%', end: 'top 10%', scrub: 0.6 },
      });
    }, ref);
    return () => ctx.revert();
  }, [products.length]);

  return (
    <section className="hero" ref={ref}>
      <div className="wrap">
        <div className="hero-meta">
          <span>Made to order in India</span>
          <span>Your colour. Your size.</span>
        </div>
        <h1 className="hero-title">
          <span className="ln"><span>Things, made</span></span>
          <span className="ln"><span>your way<i className="hero-dot">.</i></span></span>
        </h1>
        <ul className="hero-nav">
          {HERO_NAV.map(([label, to]) => (
            <li key={to}><Link to={to}>{label}</Link></li>
          ))}
          <li><Link to="/custom" className="sticker">Make anything</Link></li>
        </ul>
        <div className="hero-row">
          <p>Flexi toys, fidget toys and figurines, in your colour and size.</p>
          <div className="hero-ctas">
            <Button to="/shop">Shop toys</Button>
          </div>
          <p>Something else in mind? <Link to="/custom" className="link-btn">We'll make it for you</Link></p>
        </div>
      </div>
      {products.length > 0 && (
        <div className="hero-media">
          {products.slice(0, 3).map((p, i) => (
            <Link to={`/product/${p.slug}`} key={p.id} className={`hero-tile hero-tile-${i}`}>
              <ProductImage product={p} />
              <span className="hero-tile-label">{p.name}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Section({ title, link, ready, children }) {
  const ref = useRef();
  useReveal(ref, [ready]);
  return (
    <section className="home-sec wrap" ref={ref}>
      <div className="sec-head">
        <h2>{title}</h2>
        {link && <Link to={link.to} className="link-arrow">{link.label} <Icon name="arrow" size={16} /></Link>}
      </div>
      <div data-reveal>{children}</div>
    </section>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [qv, setQv] = useState(null);

  useEffect(() => {
    document.title = 'FORMO | Fun things & toys, made your way';
    api('/products').then(setProducts).catch(() => {});
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  const featured = products.filter((p) => p.featured);
  const best = [...products].sort((a, b) => b.sold - a.sold || Number(b.featured) - Number(a.featured)).slice(0, 4);
  const fresh = products.filter((p) => p.isNew).slice(0, 4);
  const cover = (c) => products.find((p) => (c.virtual ? p.isNew : p.category === c.slug));

  return (
    <div className="home">
      <Hero products={featured.length >= 3 ? featured : products} />

      <Section ready={products.length} title="Best sellers" link={{ to: '/shop?sort=popular', label: 'Shop all' }}>
        <div className="grid grid-4">{best.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQv} />)}</div>
      </Section>

      <Section ready={categories.length && products.length} title="Shop by category">
        <div className="cat-tiles">
          {categories.map((c) => {
            const p = cover(c);
            return (
              <Link key={c.slug} to={`/shop${qs({ category: c.slug })}`} className="cat-tile">
                {p && <ProductImage product={p} />}
                <span className="cat-tile-label"><strong>{c.name}</strong><small>{c.count} {c.count === 1 ? 'toy' : 'toys'}</small></span>
              </Link>
            );
          })}
        </div>
      </Section>

      {fresh.length > 0 && (
        <Section ready={fresh.length} title="New arrivals" link={{ to: '/shop?category=new', label: 'See all new' }}>
          <div className="grid grid-4">{fresh.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQv} />)}</div>
        </Section>
      )}

      <section className="custom-strip">
        <div className="wrap custom-strip-inner">
          <div>
            <h2>Want it your way?</h2>
            <p>A special colour, a name on it, a bulk order for a party, or something we don't make yet. Tell us and we'll send a quote.</p>
          </div>
          <Button to="/custom" variant="light">Make something custom</Button>
        </div>
      </section>

      <QuickView product={qv} onClose={() => setQv(null)} />
    </div>
  );
}
