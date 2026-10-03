import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import Icon from './Icons.jsx';
import { Button, Field } from './UI.jsx';

// Custom toy request form. Submissions appear under "Custom requests" in the admin.
export default function IdeaForm() {
  const [form, setForm] = useState({ problem: '', name: '', email: '', phone: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const fileInput = useRef();

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) return setError('Please choose a JPG, PNG or WEBP image.');
    if (f.size > 6 * 1024 * 1024) return setError('Please choose an image under 6 MB.');
    setError('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setState('loading');
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append('image', file);
    try {
      await api('/ideas', { method: 'POST', form: data });
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (state === 'done') {
    return (
      <div className="request-card request-done">
        <span className="confirm-check"><Icon name="check" size={24} /></span>
        <h3>Request sent.</h3>
        <p className="muted">We'll email {form.email} with a quote, usually within two working days.</p>
        <button className="link-btn" onClick={() => { setForm({ ...form, problem: '' }); setFile(null); setState('idle'); }}>Send another request</button>
      </div>
    );
  }

  return (
    <form className="request-card" onSubmit={submit}>
      <Field label="What would you like?">
        <textarea rows={4} value={form.problem} onChange={f('problem')} required maxLength={1500}
          placeholder="e.g. A Flexi Dragon in purple and gold, large size, with the name 'Aarav' on the tail." />
      </Field>
      <div className="request-photo">
        {preview ? (
          <div className="request-preview">
            <img src={preview} alt="Your upload" />
            <button type="button" className="link-btn" onClick={() => setFile(null)}>Remove photo</button>
          </div>
        ) : (
          <button type="button" className="request-upload" onClick={() => fileInput.current.click()}>
            <Icon name="upload" size={18} /> Add a reference photo <small>(optional)</small>
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => pick(e.target.files[0])} />
      </div>
      <div className="field-row">
        <Field label="Name"><input value={form.name} onChange={f('name')} autoComplete="name" /></Field>
        <Field label="Mobile (optional)"><input value={form.phone} onChange={f('phone')} inputMode="tel" autoComplete="tel" /></Field>
      </div>
      <Field label="Email"><input type="email" required value={form.email} onChange={f('email')} autoComplete="email" /></Field>
      {error && <p className="field-error">{error}</p>}
      <Button loading={state === 'loading'} type="submit">Send request</Button>
    </form>
  );
}
