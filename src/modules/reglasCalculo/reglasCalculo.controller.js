const reglasCalculoService = require('./reglasCalculo.service');

async function getReglasCalculo(req, res, next) {
  try {
    const reglas = await reglasCalculoService.getReglasCalculo(req.query);
    return res.status(200).json({ success: true, data: reglas });
  } catch (error) {
    return next(error);
  }
}

async function getReglaCalculoById(req, res, next) {
  try {
    const regla = await reglasCalculoService.getReglaCalculoById(req.params.id);
    return res.status(200).json({ success: true, data: regla });
  } catch (error) {
    return next(error);
  }
}

async function createReglaCalculo(req, res, next) {
  try {
    const regla = await reglasCalculoService.createReglaCalculo(req.body, req.user);
    return res.status(201).json({ success: true, data: regla });
  } catch (error) {
    return next(error);
  }
}

async function updateReglaCalculo(req, res, next) {
  try {
    const regla = await reglasCalculoService.updateReglaCalculo({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });
    return res.status(200).json({ success: true, data: regla });
  } catch (error) {
    return next(error);
  }
}

async function deleteReglaCalculo(req, res, next) {
  try {
    await reglasCalculoService.deleteReglaCalculo({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReglasCalculo,
  getReglaCalculoById,
  createReglaCalculo,
  updateReglaCalculo,
  deleteReglaCalculo
};

