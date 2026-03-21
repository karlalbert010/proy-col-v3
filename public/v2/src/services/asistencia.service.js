import { api } from './api.js';
export const asistenciaService={
  getContexto:(q)=>api(`/asistencia/contexto?${new URLSearchParams(q).toString()}`),
  guardar:(body)=>api('/asistencia/guardar',{method:'POST',body})
};
