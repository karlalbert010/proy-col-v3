const calificacionesService = require('./calificaciones.service');

async function getCalificaciones(req, res, next) {
  try {
    const data = await calificacionesService.getCalificaciones({
      anio: req.query.anio,
      curso: req.query.curso,
      alumno: req.query.alumno,
      materia: req.query.materia
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getCalificacionesResumen(req, res, next) {
  try {
    const data = await calificacionesService.getCalificacionesResumen({
      anio: req.query.anio,
      curso: req.query.curso,
      alumno: req.query.alumno,
      materia: req.query.materia
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getCalificacionById(req, res, next) {
  try {
    const data = await calificacionesService.getCalificacionById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function importFromCalifAlum(req, res, next) {
  try {
    const data = await calificacionesService.importFromCalifAlum({
      anioId: req.body.anioId,
      sourceSchema: req.body.sourceSchema,
      sourceTable: req.body.sourceTable,
      dryRun: Boolean(req.body.dryRun),
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createCalificacion(req, res, next) {
  try {
    const data = await calificacionesService.createCalificacion(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateCalificacion(req, res, next) {
  try {
    const data = await calificacionesService.updateCalificacion({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteCalificacion(req, res, next) {
  try {
    await calificacionesService.deleteCalificacion({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCalificaciones,
  getCalificacionesResumen,
  getCalificacionById,
  importFromCalifAlum,
  createCalificacion,
  updateCalificacion,
  deleteCalificacion
};
