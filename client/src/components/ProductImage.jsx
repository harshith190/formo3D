// Shows a product photo, or a clean placeholder tile until photos are uploaded in the admin.
export default function ProductImage({ product, index = 0, className = '' }) {
  const src = product.images?.[index] ?? product.image;
  if (src) {
    return <img className={`pimg ${className}`} src={src} alt={product.name} loading="lazy" decoding="async" />;
  }
  return (
    <div className={`pimg pimg-ph ${className}`} style={{ '--tone': product.tone || '#d8d2c8' }} role="img" aria-label={`${product.name}, photo coming soon`}>
      <span className="pimg-letter" aria-hidden="true">{product.name?.[0]}</span>
      <span className="pimg-note">Photo coming soon</span>
    </div>
  );
}
