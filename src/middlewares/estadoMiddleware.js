const prisma = require('../config/prisma');

const VALID_SCOPE = new Set(['estructura', 'calificaciones']);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveAnioLookup(req) {
  const anioIdCandidate =
    req.params.anioId ?? req.body.anioId ?? req.query.anioId ?? null;

  const anioCandidate =
    req.params.anio ?? req.body.anio ?? req.query.anio ?? null;

  const anioId = parsePositiveInteger(anioIdCandidate);

  if (anioId) {
    return { by: 'id', value: anioId };
  }

  const anio = parsePositiveInteger(anioCandidate);

  if (anio) {
    return { by: 'anio', value: anio };
  }

  throw createHttpError(
    'Debe informar anioId o anio para validar el estado del anio lectivo.',
    400
  );
}

function isAllowedByScope(scope, estado) {
  if (estado === 'CERRADO') {
    return false;
  }

  if (scope === 'estructura') {
    return estado === 'BORRADOR';
  }

  if (scope === 'calificaciones') {
    return estado === 'ACTIVO';
  }

  return false;
}

function buildDeniedMessage(scope, estado) {
  if (estado === 'CERRADO') {
    return 'El anio lectivo esta CERRADO. Operacion bloqueada.';
  }

  if (scope === 'estructura') {
    return 'Solo se permite modificar estructura cuando el anio esta en BORRADOR.';
  }

  return 'Solo se permite cargar/modificar calificaciones cuando el anio esta ACTIVO.';
}

function estadoMiddleware(scope) {
  if (!VALID_SCOPE.has(scope)) {
    throw createHttpError('Configuracion invalida de estadoMiddleware.', 500);
  }

  return async (req, _res, next) => {
    try {
      const lookup = resolveAnioLookup(req);

      const anioLectivo = await prisma.anioLectivo.findUnique({
        where: lookup.by === 'id' ? { id: lookup.value } : { anio: lookup.value }
      });

      if (!anioLectivo) {
        throw createHttpError('Anio lectivo no encontrado.', 404);
      }

      if (!isAllowedByScope(scope, anioLectivo.estado)) {
        throw createHttpError(buildDeniedMessage(scope, anioLectivo.estado), 403);
      }

      req.anioLectivo = anioLectivo;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = estadoMiddleware;
