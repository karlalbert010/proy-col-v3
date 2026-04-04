const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username y password son obligatorios.'
      });
    }

    const session = await authService.login({ username, password });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        token: session.token,
        user: session.user
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Sesion invalida.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  me
};
