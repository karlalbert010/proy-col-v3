const actasPeriodoService = require('./actasPeriodo.service');

async function getActasPeriodo(req, res, next) {
  try {
    const data = await actasPeriodoService.getActasPeriodo(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getActaPeriodoById(req, res, next) {
  try {
    const data = await actasPeriodoService.getActaPeriodoById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createActaPeriodo(req, res, next) {
  try {
    const data = await actasPeriodoService.createActaPeriodo(req.body, req.user);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateActaPeriodo(req, res, next) {
  try {
    const data = await actasPeriodoService.updateActaPeriodo({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteActaPeriodo(req, res, next) {
  try {
    await actasPeriodoService.deleteActaPeriodo({
      id: req.params.id,
      user: req.user
    });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getActasPeriodo,
  getActaPeriodoById,
  createActaPeriodo,
  updateActaPeriodo,
  deleteActaPeriodo
};

