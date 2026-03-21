import { api } from './api.js';

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, value);
    }
  });
  return query.toString();
}

export const calificacionesService = {
  getVista(q) {
    return api(`/calificaciones-detalle/vista-trimestral?${toQuery(q)}`);
  },
  getCursos({ anio }) {
    const query = toQuery({ anio });
    return api(`/cursos${query ? `?${query}` : ''}`);
  },
  getAsignaciones({ anio, cursoId }) {
    const query = toQuery({ anio, cursoId, activo: true });
    return api(`/curso-materia-docente${query ? `?${query}` : ''}`);
  },
  getMatriculas({ anio }) {
    const query = toQuery({ anio });
    return api(`/matriculas${query ? `?${query}` : ''}`);
  },
  getPeriodos({ anio }) {
    const query = toQuery({ anio });
    return api(`/periodos${query ? `?${query}` : ''}`);
  },
  getCalificaciones({ anio, curso, materia }) {
    const query = toQuery({ anio, curso, materia });
    return api(`/calificaciones${query ? `?${query}` : ''}`);
  },
  createCalificacion(body) {
    return api('/calificaciones', { method: 'POST', body });
  },
  createDetalle(body) {
    return api('/calificaciones-detalle', { method: 'POST', body });
  },
  updateDetalle(id, body) {
    return api(`/calificaciones-detalle/${id}`, { method: 'PUT', body });
  },
  deleteDetalle(id) {
    return api(`/calificaciones-detalle/${id}`, { method: 'DELETE' });
  }
};
