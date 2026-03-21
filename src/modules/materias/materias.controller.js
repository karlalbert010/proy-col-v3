const materiasService = require('./materias.service');

async function getMaterias(req, res, next) {
  try {
    const materias = await materiasService.getMaterias({
      activa: req.query.activa,
      anio: req.query.anio
    });
    return res.status(200).json({ success: true, data: materias });
  } catch (error) {
    return next(error);
  }
}

async function getMateriaById(req, res, next) {
  try {
    const materia = await materiasService.getMateriaById(req.params.id);
    return res.status(200).json({ success: true, data: materia });
  } catch (error) {
    return next(error);
  }
}

async function createMateria(req, res, next) {
  try {
    const materia = await materiasService.createMateria(req.body);
    return res.status(201).json({ success: true, data: materia });
  } catch (error) {
    return next(error);
  }
}

async function updateMateria(req, res, next) {
  try {
    const materia = await materiasService.updateMateria({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data: materia });
  } catch (error) {
    return next(error);
  }
}

async function deleteMateria(req, res, next) {
  try {
    await materiasService.deleteMateria({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMaterias,
  getMateriaById,
  createMateria,
  updateMateria,
  deleteMateria
};
