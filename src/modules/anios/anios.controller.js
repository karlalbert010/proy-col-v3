const aniosService = require('./anios.service');

async function getAnios(req, res, next) {
  try {
    const anios = await aniosService.getAnios({
      anio: req.query.anio,
      estado: req.query.estado
    });

    return res.status(200).json({
      success: true,
      data: anios
    });
  } catch (error) {
    return next(error);
  }
}

async function getAnioActual(_req, res, next) {
  try {
    const anio = await aniosService.getAnioActual();

    return res.status(200).json({
      success: true,
      data: anio
    });
  } catch (error) {
    return next(error);
  }
}

async function getAnioById(req, res, next) {
  try {
    const anio = await aniosService.getAnioById(req.params.id);

    return res.status(200).json({
      success: true,
      data: anio
    });
  } catch (error) {
    return next(error);
  }
}

async function createAnio(req, res, next) {
  try {
    const created = await aniosService.createAnio(req.body);

    return res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAnio(req, res, next) {
  try {
    const updated = await aniosService.updateAnio({
      id: req.params.id,
      anio: req.body.anio,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

async function updateEstado(req, res, next) {
  try {
    const updated = await aniosService.updateEstado({
      id: req.params.id,
      estado: req.body.estado,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAnio(req, res, next) {
  try {
    await aniosService.deleteAnio({
      id: req.params.id,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAnios,
  getAnioActual,
  getAnioById,
  createAnio,
  updateAnio,
  updateEstado,
  deleteAnio
};
