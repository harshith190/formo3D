const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'formo.token';

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} },
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== false)).toString();
  return s ? `?${s}` : '';
};
