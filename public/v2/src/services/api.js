import { store } from '../store/index.js';

const base = '';

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = store.get().token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_error) {
    data = { success: false, message: 'Respuesta no JSON' };
  }

  if (!res.ok) {
    if (res.status === 401) {
      store.setToken('');
      store.setUser(null);
      if (path !== '/auth/login') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
}
