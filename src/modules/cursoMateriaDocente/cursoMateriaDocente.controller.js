const cursoMateriaDocenteService = require('./cursoMateriaDocente.service');

async function getAsignaciones(req, res, next) {
  try {
    const raw = await cursoMateriaDocenteService.getAsignaciones({
      anio: req.query.anio,
      cursoId: req.query.cursoId,
      materiaAnualId: req.query.materiaAnualId,
      docenteId: req.query.docenteId,
      activo: req.query.activo
    });

    // Mantiene forma plana usada por el frontend v3 y conserva estructura normalizada.
    const data = raw.map((row) => ({
      ...row,
      curso: row.cursoMateria?.curso || null,
      materiaAnual: row.cursoMateria?.materiaAnual || null
    }));

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
