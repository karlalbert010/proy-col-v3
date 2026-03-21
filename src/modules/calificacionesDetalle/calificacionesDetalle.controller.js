const calificacionesDetalleService = require('./calificacionesDetalle.service');

async function getCalificacionesDetalle(req, res, next) {
  try {
    const data = await calificacionesDetalleService.getCalificacionesDetalle({
      calificacionId: req.query.calificacionId
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getCalificacionDetalleById(req, res, next) {
  try {
    const data = await calificacionesDetalleService.getCalificacionDetalleById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function compareCalificacionWithView(req, res, next) {
  try {
    const data = await calificacionesDetalleService.compareCalificacionWithView(
      req.query.calificacionId
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createCalificacionDetalle(req, res, next) {
  try {
    const data = await calificacionesDetalleService.createCalificacionDetalle(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateCalificacionDetalle(req, res, next) {
  try {
    const data = await calificacionesDetalleService.updateCalificacionDetalle({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteCalificacionDetalle(req, res, next) {
  try {
    await calificacionesDetalleService.deleteCalificacionDetalle({
      id: req.params.id,
      user: req.user
    });

    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCalificacionesDetalle,
  getCalificacionDetalleById,
  compareCalificacionWithView,
  createCalificacionDetalle,
  updateCalificacionDetalle,
  deleteCalificacionDetalle
};
