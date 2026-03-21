import { dashboardView } from '../views/dashboard/index.js';
import { asistenciaView } from '../views/asistencia/index.js';
import { calificacionesView } from '../views/calificaciones/index.js';
import { misCursosView } from '../views/mis-cursos/index.js';
import { controlView } from '../views/control/index.js';
import { alumnosView } from '../views/alumnos/index.js';
import { cursosView } from '../views/cursos/index.js';
import { configuracionView } from '../views/configuracion/index.js';

const map={dashboard:dashboardView,asistencia:asistenciaView,calificaciones:calificacionesView,'mis-cursos':misCursosView,control:controlView,alumnos:alumnosView,cursos:cursosView,configuracion:configuracionView};
export function renderView(view){ const fn=map[view]||dashboardView; return fn(); }
