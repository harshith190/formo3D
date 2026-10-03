const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const price = (n) => inr.format(Number(n) || 0);

export const date = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('en-IN', opts);

export const STATUS_LABEL = {
  pending_payment: 'Awaiting payment',
  placed: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const TRACK_STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

export const discountPct = (p) => (p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0);

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
