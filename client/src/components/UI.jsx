import { Link } from 'react-router-dom';
import Icon from './Icons.jsx';
import { price as fmt } from '../lib/format.js';

export function Button({ to, href, variant = 'solid', size, icon = 'arrow', children, className = '', loading, ...rest }) {
  const cls = `btn btn-${variant} ${size ? 'btn-' + size : ''} ${loading ? 'is-loading' : ''} ${className}`;
  const inner = (
    <>
      <span className="btn-label">{children}</span>
      {icon && <Icon name={icon} size={18} className="btn-icon" />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  return <button className={cls} disabled={loading || rest.disabled} {...rest}>{inner}</button>;
}

// Headline whose lines slide up from a mask when they scroll into view (see useReveal).
export function Lines({ as: Tag = 'h2', lines, className = '' }) {
  return (
    <Tag className={className} data-lines>
      {lines.map((l, i) => (
        <span className="ln" key={i}><span>{l}</span></span>
      ))}
    </Tag>
  );
}

export function Price({ product, className = '' }) {
  const off = product.compareAt && product.compareAt > product.price;
  return (
    <span className={`price ${className}`}>
      <span>{fmt(product.price)}</span>
      {off && <s className="price-was">{fmt(product.compareAt)}</s>}
    </span>
  );
}

export function Stars({ value, size = 14 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} fill={n <= Math.round(value)} />
      ))}
    </span>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Spinner({ label = 'Loading' }) {
  return <div className="spinner" role="status" aria-label={label}><span /></div>;
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Eyebrow({ children, num }) {
  return (
    <p className="eyebrow">
      {num && <span className="eyebrow-num">{num}</span>}
      {children}
    </p>
  );
}
