const cursosService = require('./cursos.service');

async function getCursos(req, res, next) {
  try {
    const cursos = await cursosService.getCursos({
      anio: req.query.anio,
      estado: req.query.estado
    });
    return res.status(200).json({ success: true, data: cursos });
  } catch (error) {
    return next(error);
  }
}

async function getCursoById(req, res, next) {
  try {
    const curso = await cursosService.getCursoById(req.params.id);
    return res.status(200).json({ success: true, data: curso });
  } catch (error) {
    return next(error);
  }
}

async function createCurso(req, res, next) {
  try {
    const curso = await cursosService.createCurso(req.body);
    return res.status(201).json({ success: true, data: curso });
  } catch (error) {
    return next(error);
  }
}

async function updateCurso(req, res, next) {
  try {
    const curso = await cursosService.updateCurso({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data: curso });
  } catch (error) {
    return next(error);
  }
}

async function deleteCurso(req, res, next) {
  try {
    await cursosService.deleteCurso({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCursos,
  getCursoById,
  createCurso,
  updateCurso,
  deleteCurso
};
