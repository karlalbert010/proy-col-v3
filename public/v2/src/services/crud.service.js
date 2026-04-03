import { api } from './api.js';

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, v);
  });
  return q.toString();
}

export const crudService = {
  list(resource, query = {}) {
    const qs = toQuery(query);
    return api(`/${resource}${qs ? `?${qs}` : ''}`);
  },
  create(resource, body) {
    return api(`/${resource}`, { method: 'POST', body });
  },
  update(resource, id, body) {
    return api(`/${resource}/${id}`, { method: 'PUT', body });
  },
  remove(resource, id) {
    return api(`/${resource}/${id}`, { method: 'DELETE' });
  },
  patch(resource, id, suffix, body) {
    return api(`/${resource}/${id}/${suffix}`, { method: 'PATCH', body });
  }
};
