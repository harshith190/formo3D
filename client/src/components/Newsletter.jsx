import { useState } from 'react';
import { api } from '../lib/api.js';
import Icon from './Icons.jsx';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setState('loading');
    setError('');
    try {
      await api('/newsletter', { method: 'POST', body: { email } });
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  if (state === 'done') return <p className="news-done"><Icon name="check" size={18} /> You are on the list. See you when something new is ready.</p>;

  return (
    <form className="news-form" onSubmit={submit}>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email address" />
      <button className="btn btn-solid" disabled={state === 'loading'}>
        <span className="btn-label">Subscribe</span><Icon name="arrow" size={18} className="btn-icon" />
      </button>
      {error && <p className="field-error">{error}</p>}
    </form>
  );
}
