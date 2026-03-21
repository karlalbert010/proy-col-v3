const alumnosService = require('./alumnos.service');

async function getAlumnos(req, res, next) {
  try {
    const alumnos = await alumnosService.getAlumnos({
      cursoId: req.query.cursoId,
      curso: req.query.curso
    });
    return res.status(200).json({ success: true, data: alumnos });
  } catch (error) {
    return next(error);
  }
}

async function getAlumnoById(req, res, next) {
  try {
    const alumno = await alumnosService.getAlumnoById(req.params.id);
    return res.status(200).json({ success: true, data: alumno });
  } catch (error) {
    return next(error);
  }
}

async function createAlumno(req, res, next) {
  try {
    const alumno = await alumnosService.createAlumno(req.body);
    return res.status(201).json({ success: true, data: alumno });
  } catch (error) {
    return next(error);
  }
}

async function updateAlumno(req, res, next) {
  try {
    const alumno = await alumnosService.updateAlumno({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data: alumno });
  } catch (error) {
    return next(error);
  }
}

async function deleteAlumno(req, res, next) {
  try {
    await alumnosService.deleteAlumno({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno
};
