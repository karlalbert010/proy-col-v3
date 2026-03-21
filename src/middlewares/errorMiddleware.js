function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorMiddleware;
