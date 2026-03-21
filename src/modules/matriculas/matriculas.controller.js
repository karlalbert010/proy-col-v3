const matriculasService = require('./matriculas.service');

async function getMatriculas(req, res, next) {
  try {
    const matriculas = await matriculasService.getMatriculas({ anio: req.query.anio });
    return res.status(200).json({ success: true, data: matriculas });
  } catch (error) {
    return next(error);
  }
}

async function getMatriculaById(req, res, next) {
  try {
    const matricula = await matriculasService.getMatriculaById(req.params.id);
    return res.status(200).json({ success: true, data: matricula });
  } catch (error) {
    return next(error);
  }
}

async function createMatricula(req, res, next) {
  try {
    const matricula = await matriculasService.createMatricula(req.body);
    return res.status(201).json({ success: true, data: matricula });
  } catch (error) {
    return next(error);
  }
}

async function updateMatricula(req, res, next) {
  try {
    const matricula = await matriculasService.updateMatricula({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data: matricula });
  } catch (error) {
    return next(error);
  }
}

async function deleteMatricula(req, res, next) {
  try {
    await matriculasService.deleteMatricula({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMatriculas,
  getMatriculaById,
  createMatricula,
  updateMatricula,
  deleteMatricula
};
