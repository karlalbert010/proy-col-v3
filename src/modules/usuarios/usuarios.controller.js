const usuariosService = require('./usuarios.service');

async function getUsuarios(_req, res, next) {
  try {
    const data = await usuariosService.getUsuarios();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getUsuarioById(req, res, next) {
  try {
    const data = await usuariosService.getUsuarioById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createUsuario(req, res, next) {
  try {
    const data = await usuariosService.createUsuario(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateUsuario(req, res, next) {
  try {
    const data = await usuariosService.updateUsuario({
      id: req.params.id,
      payload: req.body,
      user: req.user
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteUsuario(req, res, next) {
  try {
    await usuariosService.deleteUsuario({ id: req.params.id, user: req.user });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};
