const express = require('express');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const aniosRoutes = require('./modules/anios/anios.routes');
const alumnosRoutes = require('./modules/alumnos/alumnos.routes');
const cursosRoutes = require('./modules/cursos/cursos.routes');
const materiasRoutes = require('./modules/materias/materias.routes');
const materiasAnualesRoutes = require('./modules/materiasAnuales/materiasAnuales.routes');
const periodosRoutes = require('./modules/periodos/periodos.routes');
const calificacionesRoutes = require('./modules/calificaciones/calificaciones.routes');
const calificacionesDetalleRoutes = require('./modules/calificacionesDetalle/calificacionesDetalle.routes');
const matriculasRoutes = require('./modules/matriculas/matriculas.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const logCambiosRoutes = require('./modules/logCambios/logCambios.routes');
const demoRoutes = require('./modules/demo/demo.routes');
const cursoMateriaDocenteRoutes = require('./modules/cursoMateriaDocente/cursoMateriaDocente.routes');
const reglasCalculoRoutes = require('./modules/reglasCalculo/reglasCalculo.routes');
const actasPeriodoRoutes = require('./modules/actasPeriodo/actasPeriodo.routes');
const configEvaluacionRoutes = require('./modules/configEvaluacion/configEvaluacion.routes');
const evaluacionesRoutes = require('./modules/evaluaciones/evaluaciones.routes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    data: { status: 'ok' }
  });
});

app.use('/auth', authRoutes);
app.use('/anios', aniosRoutes);
app.use('/alumnos', alumnosRoutes);
app.use('/cursos', cursosRoutes);
app.use('/materias', materiasRoutes);
app.use('/materias-anuales', materiasAnualesRoutes);
app.use('/periodos', periodosRoutes);
app.use('/calificaciones', calificacionesRoutes);
app.use('/calificaciones-detalle', calificacionesDetalleRoutes);
app.use('/matriculas', matriculasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/log-cambios', logCambiosRoutes);
app.use('/demo', demoRoutes);
app.use('/curso-materia-docente', cursoMateriaDocenteRoutes);
app.use('/reglas-calculo', reglasCalculoRoutes);
app.use('/actas-periodo', actasPeriodoRoutes);
app.use('/config-evaluacion', configEvaluacionRoutes);
app.use('/evaluaciones', evaluacionesRoutes);

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Recurso no encontrado.'
  });
});

app.use(errorMiddleware);

module.exports = app;
