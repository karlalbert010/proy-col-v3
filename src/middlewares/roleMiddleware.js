const VALID_ROLES = new Set(['ADMIN', 'DOCENTE', 'DIRECTIVO']);

function roleMiddleware(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.filter((role) => VALID_ROLES.has(role));

  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado.'
      });
    }

    if (!VALID_ROLES.has(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Rol de usuario invalido.'
      });
    }

    if (normalizedAllowedRoles.length === 0 || normalizedAllowedRoles.includes(req.user.rol)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'No tiene permisos para este recurso.'
    });
  };
}

module.exports = roleMiddleware;
