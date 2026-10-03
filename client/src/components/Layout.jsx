import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { api, qs } from '../lib/api.js';
import { price } from '../lib/format.js';
import { gsap, ScrollTrigger, reducedMotion } from '../lib/motion.js';
import { site } from '../site.js';
import ProductImage from './ProductImage.jsx';
import CartDrawer from './CartDrawer.jsx';
import Icon from './Icons.jsx';
import Newsletter from './Newsletter.jsx';
import InkCursor from './InkCursor.jsx';

const NAV = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?category=fidget', label: 'Fidget & Flexi' },
  { to: '/shop?category=animals', label: 'Animals' },
  { to: '/custom', label: 'Make anything', highlight: true },
];

export function Logo({ className = '' }) {
  return (
    <span className={`logo ${className}`} aria-label="FORMO">
      FORM<span className="logo-o">O</span>
    </span>
  );
}

function Search({ open, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();
  const input = useRef();

  useEffect(() => {
    if (open) { setTimeout(() => input.current?.focus(), 60); } else { setQ(''); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => api('/products' + qs({ q, limit: 5 })).then(setResults).catch(() => {}), 180);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    onClose();
    navigate('/shop' + qs({ q }));
  };

  return (
    <div className={`search ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={open ? undefined : ''}>
      <div className="search-scrim" onClick={onClose} />
      <div className="search-panel" role="dialog" aria-label="Search">
        <form onSubmit={submit} className="search-form">
          <Icon name="search" size={22} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search toys, e.g. dragon" aria-label="Search" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search"><Icon name="close" /></button>
        </form>
        {results.length > 0 && (
          <ul className="search-results">
            {results.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.slug}`} onClick={onClose}>
                  <span className="search-thumb"><ProductImage product={p} /></span>
                  <span><strong>{p.name}</strong><small>{p.tagline}</small></span>
                  <span>{price(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {q && results.length === 0 && <p className="search-none">Nothing matches "{q}" yet. <Link to="/custom" onClick={onClose}>Ask us to make it</Link>.</p>}
      </div>
    </div>
  );
}

function Header() {
  const { cartCount, setCartOpen, user, wish } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const badge = useRef();
  const location = useLocation();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      setHidden(y > 300 && y > last + 4 ? true : y < last - 4 ? false : (h) => h);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenu(false); setSearch(false); }, [location.pathname, location.search]);
  useEffect(() => { document.body.classList.toggle('no-scroll', menu); }, [menu]);

  useEffect(() => {
    if (!badge.current || reducedMotion() || !cartCount) return;
    gsap.fromTo(badge.current, { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }, [cartCount]);

  return (
    <>
      <header className={`header ${scrolled ? 'is-scrolled' : ''} ${hidden && !menu ? 'is-hidden' : ''} ${menu ? 'menu-open' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="header-logo" aria-label="FORMO home"><Logo /></Link>
          <nav className="header-nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end className={`nav-link ${n.highlight ? 'nav-sticker' : ''}`}>{n.label}</NavLink>)}
          </nav>
          <div className="header-tools">
            <button className="icon-btn" onClick={() => setSearch(true)} aria-label="Search"><Icon name="search" /></button>
            <Link className="icon-btn hide-sm" to="/account/wishlist" aria-label={`Wishlist, ${wish.size} saved`}>
              <Icon name="heart" />{wish.size > 0 && <span className="dot" />}
            </Link>
            <Link className="icon-btn hide-sm" to={user ? '/account' : '/login'} aria-label="Account"><Icon name="user" /></Link>
            <button className="icon-btn bag-btn" onClick={() => setCartOpen(true)} aria-label={`Bag, ${cartCount} items`}>
              <Icon name="bag" />
              {cartCount > 0 && <span className="badge" ref={badge}>{cartCount}</span>}
            </button>
            <button className="icon-btn show-sm" onClick={() => setMenu((m) => !m)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
              <Icon name={menu ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${menu ? 'is-open' : ''}`} aria-hidden={!menu} inert={menu ? undefined : ''}>
        <nav aria-label="Mobile">
          {[...NAV, { to: '/shop?category=figurines', label: 'Figurines' }, { to: '/shop?category=new', label: 'New' }].map((n, i) => (
            <Link key={n.to} to={n.to} style={{ '--i': i }}>{n.label}</Link>
          ))}
        </nav>
        <div className="mobile-menu-foot">
          <Link to={user ? '/account' : '/login'}>{user ? 'Your account' : 'Sign in'}</Link>
          <Link to="/account/wishlist">Wishlist ({wish.size})</Link>
          <Link to="/track">Track an order</Link>
        </div>
      </div>

      <Search open={search} onClose={() => setSearch(false)} />
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-news">
            <h2 className="footer-title">New things,<br />once a month.</h2>
            <p className="muted">One short email when new designs drop.</p>
            <Newsletter />
          </div>
          <div className="footer-cols">
            <div>
              <h3>Shop</h3>
              <Link to="/shop">All products</Link>
              <Link to="/shop?category=fidget">Fidget & Flexi</Link>
              <Link to="/shop?category=animals">Animals</Link>
              <Link to="/shop?category=figurines">Figurines</Link>
              <Link to="/shop?category=new">New</Link>
            </div>
            <div>
              <h3>FORMO</h3>
              <Link to="/custom">Custom orders</Link>
              <a href={site.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </div>
            <div>
              <h3>Help</h3>
              <Link to="/track">Track an order</Link>
              <Link to="/account">Your account</Link>
              <a href={`mailto:${site.email}`}>{site.email}</a>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
        <div className="footer-mark" aria-hidden="true"><Logo /></div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {site.legalName}. {site.city}.</span>
          <span>Things, made your way.</span>
        </div>
      </div>
    </footer>
  );
}

function Toast() {
  const { toast } = useStore();
  return (
    <div className="toast-zone" aria-live="polite">
      {toast && <div className="toast" key={toast.key}><Icon name="check" size={16} />{toast.message}</div>}
    </div>
  );
}

// Each route enters with a short curtain wipe and a content rise.
function PageTransition({ children }) {
  const location = useLocation();
  const ref = useRef();
  const curtain = useRef();
  const prevPath = useRef(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // No curtain on the very first load (or a StrictMode re-run of it).
    const isFirst = prevPath.current === null || prevPath.current === location.pathname;
    prevPath.current = location.pathname;
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      if (!isFirst) {
        gsap.fromTo(curtain.current, { scaleY: 1, transformOrigin: '50% 0%' }, { scaleY: 0, duration: 0.7, ease: 'power4.inOut' });
      }
      gsap.from(ref.current, { y: 24, opacity: 0, duration: 0.8, delay: isFirst ? 0 : 0.25, clearProps: 'all' });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 900);
    return () => { ctx.revert(); clearTimeout(t); };
  }, [location.pathname]);

  return (
    <>
      <div className="curtain" ref={curtain} aria-hidden="true"><Logo /></div>
      <main ref={ref} id="main">{children}</main>
    </>
  );
}

export default function Layout() {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <PageTransition><Outlet /></PageTransition>
      <Footer />
      <CartDrawer />
      <Toast />
      <InkCursor />
    </>
  );
}
