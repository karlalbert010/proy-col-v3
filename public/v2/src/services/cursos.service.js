import { api } from './api.js';
export const cursosService={
  getAll:()=>api('/cursos')
};
