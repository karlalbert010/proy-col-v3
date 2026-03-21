const periodosService = require('./periodos.service');

async function getPeriodos(req, res, next) {
  try {
    const data = await periodosService.getPeriodos({ anio: req.query.anio });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getPeriodoById(req, res, next) {
  try {
    const data = await periodosService.getPeriodoById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createPeriodo(req, res, next) {
  try {
    const data = await periodosService.createPeriodo(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updatePeriodo(req, res, next) {
  try {
    const data = await periodosService.updatePeriodo({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deletePeriodo(req, res, next) {
  try {
    await periodosService.deletePeriodo({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPeriodos,
  getPeriodoById,
  createPeriodo,
  updatePeriodo,
  deletePeriodo
};
