import { api } from './api.js';

export async function login(username, password) {
  const out = await api('/auth/login', { method: 'POST', body: { username, password } });
  const token = typeof out?.data?.token === 'string' ? out.data.token : null;
  const user = out?.data?.user || null;
  return { token, user, raw: out };
}

export async function me() {
  const out = await api('/auth/me');
  return out?.data || null;
}
