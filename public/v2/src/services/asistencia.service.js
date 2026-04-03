import { api } from './api.js';

export const asistenciaService = {
  getCursos: (q) => api(`/cursos?${new URLSearchParams(q).toString()}`),
  getContexto: (q) => api(`/asistencia/contexto?${new URLSearchParams(q).toString()}`),
  guardar: (body) => api('/asistencia/guardar', { method: 'POST', body })
};
