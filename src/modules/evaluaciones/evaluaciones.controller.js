const evaluacionesService = require('./evaluaciones.service');

async function getEvaluaciones(req, res, next) {
  try {
    const data = await evaluacionesService.getEvaluaciones(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getEvaluacionById(req, res, next) {
  try {
    const data = await evaluacionesService.getEvaluacionById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createEvaluacion(req, res, next) {
  try {
    const data = await evaluacionesService.createEvaluacion(req.body, req.user);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateEvaluacion(req, res, next) {
  try {
    const data = await evaluacionesService.updateEvaluacion({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteEvaluacion(req, res, next) {
  try {
    await evaluacionesService.deleteEvaluacion({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getEvaluaciones,
  getEvaluacionById,
  createEvaluacion,
  updateEvaluacion,
  deleteEvaluacion
};

