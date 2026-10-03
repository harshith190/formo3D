import { price } from '../lib/format.js';

// Colour swatches and size buttons. Controlled: pass the chosen values and setters.
export default function Options({ product: p, color, setColor, size, setSize }) {
  return (
    <div className="opts">
      {p.colors?.length > 0 && (
        <fieldset className="opt">
          <legend>Colour <span>{color}</span></legend>
          <div className="swatches">
            {p.colors.map((c) => (
              <label key={c.name} className={`swatch ${color === c.name ? 'is-active' : ''}`} title={c.name}>
                <input type="radio" name={`color-${p.id}`} value={c.name} checked={color === c.name} onChange={() => setColor(c.name)} />
                <span style={{ background: c.hex }} />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {p.sizes?.length > 0 && (
        <fieldset className="opt">
          <legend>Size</legend>
          <div className="sizes">
            {p.sizes.map((s) => (
              <label key={s.label} className={`size ${size === s.label ? 'is-active' : ''}`}>
                <input type="radio" name={`size-${p.id}`} value={s.label} checked={size === s.label} onChange={() => setSize(s.label)} />
                {s.label}
                {s.priceDelta > 0 && <small>+{price(s.priceDelta)}</small>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export const optionPrice = (p, size) => p.price + (p.sizes?.find((s) => s.label === size)?.priceDelta || 0);
export const lineLabel = (i) => [i.color, i.size].filter(Boolean).join(', ');
