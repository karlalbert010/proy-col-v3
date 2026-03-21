const logCambiosService = require('./logCambios.service');

async function getLogCambios(req, res, next) {
  try {
    const data = await logCambiosService.getLogCambios({
      tablaAfectada: req.query.tablaAfectada,
      tipoOperacion: req.query.tipoOperacion,
      usuario: req.query.usuario
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getLogCambioById(req, res, next) {
  try {
    const data = await logCambiosService.getLogCambioById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createLogCambio(req, res, next) {
  try {
    const data = await logCambiosService.createLogCambio(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateLogCambio(req, res, next) {
  try {
    const data = await logCambiosService.updateLogCambio({
      id: req.params.id,
      payload: req.body
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteLogCambio(req, res, next) {
  try {
    await logCambiosService.deleteLogCambio(req.params.id);
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getLogCambios,
  getLogCambioById,
  createLogCambio,
  updateLogCambio,
  deleteLogCambio
};
