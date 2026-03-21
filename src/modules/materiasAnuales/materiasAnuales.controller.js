const materiasAnualesService = require('./materiasAnuales.service');

async function getMateriasAnuales(req, res, next) {
  try {
    const data = await materiasAnualesService.getMateriasAnuales({ anio: req.query.anio });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getMateriaAnualById(req, res, next) {
  try {
    const data = await materiasAnualesService.getMateriaAnualById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createMateriaAnual(req, res, next) {
  try {
    const data = await materiasAnualesService.createMateriaAnual(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateMateriaAnual(req, res, next) {
  try {
    const data = await materiasAnualesService.updateMateriaAnual({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteMateriaAnual(req, res, next) {
  try {
    await materiasAnualesService.deleteMateriaAnual({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMateriasAnuales,
  getMateriaAnualById,
  createMateriaAnual,
  updateMateriaAnual,
  deleteMateriaAnual
};
