import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../site.js';
import IdeaForm from '../components/IdeaForm.jsx';
import { Button } from '../components/UI.jsx';

const useTitle = (t) => useEffect(() => { document.title = `${t} | FORMO`; }, [t]);

export function Custom() {
  useTitle('Custom orders');
  return (
    <div className="wrap page-pad custom-page">
      <div className="custom-grid">
        <div>
          <p className="eyebrow">Custom orders</p>
          <h1 className="page-title">Make anything yours.</h1>
          <p className="custom-lead">Tell us what you want and we'll reply with a quote, usually within two working days.</p>
          <ul className="custom-list">
            <li>Any of our designs in a colour we don't list</li>
            <li>A name or short text added</li>
            <li>Bigger or smaller sizes</li>
            <li>Party favours and bulk orders</li>
            <li>Something completely new from your photo or sketch</li>
          </ul>
        </div>
        <IdeaForm />
      </div>
    </div>
  );
}

function Legal({ title, children }) {
  useTitle(title);
  return (
    <div className="wrap page-pad legal">
      <p className="eyebrow">Last updated {site.lastUpdated}</p>
      <h1 className="page-title">{title}</h1>
      <div className="legal-body">{children}</div>
    </div>
  );
}

export function Privacy() {
  return (
    <Legal title="Privacy Policy">
      <p>This policy explains what personal data {site.legalName} ("FORMO", "we") collects when you use {site.domain}, why, and the choices you have. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email, mobile number and password (stored only as a secure hash).</li>
        <li><strong>Orders:</strong> delivery address, the products and options you choose, and payment status.</li>
        <li><strong>Payments:</strong> online payments are handled by our payment partner (Razorpay). We never see or store your card, UPI or bank details.</li>
        <li><strong>Custom requests and reviews:</strong> what you write and any photos you upload.</li>
        <li><strong>Newsletter:</strong> your email, if you subscribe.</li>
        <li><strong>On your device:</strong> your browser stores your bag, wishlist and sign-in. We do not use advertising or tracking cookies.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>To make and deliver your order, reply to custom requests, run your account, send the newsletter if you asked for it, prevent fraud and meet tax and legal obligations.</p>
      <h2>Who we share it with</h2>
      <p>Only what is needed: courier partners (name, phone, address), our payment partner, and our hosting providers. We do not sell your data.</p>
      <h2>How long we keep it</h2>
      <p>Order records are kept as long as tax law requires. Other data is kept while your account is active or until you ask us to delete it.</p>
      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your data, or withdraw consent, by writing to <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
      <h2>Grievance officer</h2>
      <p>{site.grievanceOfficer}<br />Email: <a href={`mailto:${site.email}`}>{site.email}</a><br />{site.city}</p>
    </Legal>
  );
}

export function Terms() {
  return (
    <Legal title="Terms and Conditions">
      <p>These terms apply when you buy from {site.legalName} ("FORMO", "we") on {site.domain}. By placing an order you agree to them.</p>
      <h2>Our toys</h2>
      <p>Our toys are 3D printed to order. Fine layer lines and small differences in colour between batches are normal and are not defects. Photos and colour swatches are as accurate as we can make them, but screens vary.</p>
      <h2>Safety</h2>
      <p>Our toys contain small parts and are not suitable for children under 3 years. Adult supervision is recommended for young children. Keep away from heat, as the material can soften above 50°C.</p>
      <h2>Prices and payment</h2>
      <p>Prices are in Indian Rupees and include applicable taxes. Delivery charges, if any, are shown before you pay. We may cancel an order in case of a pricing error or suspected fraud, with a full refund.</p>
      <h2>Making and delivery</h2>
      <p>Most orders are made and shipped within 3 to 5 working days. We deliver within India. You can follow your order on the <Link to="/track">tracking page</Link>.</p>
      <h2>Cancellations</h2>
      <p>You can cancel any time before your order is shipped by emailing <a href={`mailto:${site.email}`}>{site.email}</a> with your order number.</p>
      <h2>Returns and refunds</h2>
      <p>Standard items can be returned unused within 7 days of delivery. Custom and personalised items cannot be returned unless they arrive damaged or faulty. If anything arrives broken, tell us within 48 hours with a photo and we will replace or refund it. Refunds are made within 7 working days of approval.</p>
      <h2>Custom requests</h2>
      <p>When you send a custom request, you confirm you have the right to use any design, image or name you share. We may decline requests that copy someone else's characters or brands. A custom order starts once you accept our quote.</p>
      <h2>Reviews</h2>
      <p>Reviews must be honest and about your own experience. We remove reviews that are abusive or contain personal information, but never because they are negative.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of India. Nothing here limits your rights under the Consumer Protection Act, 2019. For complaints, contact our grievance officer at <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
    </Legal>
  );
}

export function NotFound() {
  useTitle('Not found');
  return (
    <div className="wrap page-pad notfound">
      <h1 className="page-title">Page not found.</h1>
      <p className="muted">It may have moved, or never existed.</p>
      <Button to="/shop">Shop toys</Button>
    </div>
  );
}
