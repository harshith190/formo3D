// Payment providers. Each provider exposes the same small interface so adding
// another gateway (Cashfree, PhonePe, Stripe) means adding one object here.
import crypto from 'node:crypto';
import { config } from './config.js';
import { fail } from './lib.js';

const razorpayEnabled = Boolean(config.razorpay.keyId && config.razorpay.keySecret);

const providers = {
  cod: {
    label: 'Cash on delivery',
    enabled: true,
    async start() {
      return { provider: 'cod', status: 'pending' };
    },
  },

  razorpay: {
    label: 'UPI, cards, netbanking (Razorpay)',
    enabled: razorpayEnabled,
    // Creates a Razorpay order. The browser then opens Razorpay Checkout with the returned id.
    async start(order) {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(order.total * 100), // paise
          currency: config.shop.currency,
          receipt: order.number,
          notes: { orderId: order.id },
        }),
      });
      if (!res.ok) fail(502, 'Could not start online payment. Please try again or choose cash on delivery.');
      const rz = await res.json();
      return { provider: 'razorpay', status: 'awaiting', razorpayOrderId: rz.id, keyId: config.razorpay.keyId };
    },
    // Verifies the signature Razorpay Checkout returns to the browser.
    verify(order, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
      if (razorpay_order_id !== order.payment.razorpayOrderId) return false;
      const expected = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(String(razorpay_signature || ''));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  },
};

export const paymentMethods = () =>
  Object.entries(providers)
    .filter(([, p]) => p.enabled)
    .map(([key, p]) => ({ key, label: p.label }));

export function provider(key) {
  const p = providers[key];
  if (!p || !p.enabled) fail(400, 'That payment method is not available.');
  return p;
}
