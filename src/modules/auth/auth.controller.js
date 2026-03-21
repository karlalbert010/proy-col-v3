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

    const token = await authService.login({ username, password });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login
};
