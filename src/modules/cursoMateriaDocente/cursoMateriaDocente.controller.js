const cursoMateriaDocenteService = require('./cursoMateriaDocente.service');

async function getAsignaciones(req, res, next) {
  try {
    const data = await cursoMateriaDocenteService.getAsignaciones({
      anio: req.query.anio,
      cursoId: req.query.cursoId,
      materiaAnualId: req.query.materiaAnualId,
      docenteId: req.query.docenteId,
      activo: req.query.activo
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAsignaciones
};
