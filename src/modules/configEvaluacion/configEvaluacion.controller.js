const configEvaluacionService = require('./configEvaluacion.service');

async function getConfigsEvaluacion(req, res, next) {
  try {
    const data = await configEvaluacionService.getConfigsEvaluacion(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getConfigEvaluacionById(req, res, next) {
  try {
    const data = await configEvaluacionService.getConfigEvaluacionById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createConfigEvaluacion(req, res, next) {
  try {
    const data = await configEvaluacionService.createConfigEvaluacion(req.body, req.user);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateConfigEvaluacion(req, res, next) {
  try {
    const data = await configEvaluacionService.updateConfigEvaluacion({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteConfigEvaluacion(req, res, next) {
  try {
    await configEvaluacionService.deleteConfigEvaluacion({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getConfigsEvaluacion,
  getConfigEvaluacionById,
  createConfigEvaluacion,
  updateConfigEvaluacion,
  deleteConfigEvaluacion
};

