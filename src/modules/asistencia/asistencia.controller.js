const asistenciaService = require('./asistencia.service');

async function getContexto(req, res, next) {
  try {
    const data = await asistenciaService.getContexto({
      anio: req.query.anio,
      cursoId: req.query.cursoId,
      fecha: req.query.fecha
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function guardarAsistencia(req, res, next) {
  try {
    const data = await asistenciaService.guardarAsistencia({ payload: req.body, user: req.user });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getContexto,
  guardarAsistencia
};

