jest.mock('../../config/prisma', () => {
  const mockPrisma = {
    anioLectivo: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    matricula: {
      findUnique: jest.fn()
    },
    materiaAnual: {
      findUnique: jest.fn()
    },
    periodo: {
      findUnique: jest.fn()
    },
    calificacion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    logCambio: {
      create: jest.fn()
    }
  };

  mockPrisma.$transaction = jest.fn(async (fn) => fn(mockPrisma));
  return mockPrisma;
});

const prisma = require('../../config/prisma');
const aniosService = require('../anios/anios.service');
const calificacionesService = require('../calificaciones/calificaciones.service');
const usuariosService = require('../usuarios/usuarios.service');

describe('Business rules in services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AniosLectivos rules', () => {
    test('createAnio blocks creating ACTIVO when another ACTIVO exists', async () => {
      prisma.anioLectivo.findFirst.mockResolvedValue({
        id: 10,
        anio: 2025,
        estado: 'ACTIVO'
      });

      await expect(aniosService.createAnio({ anio: 2026, estado: 'ACTIVO' })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Solo puede existir un anio lectivo con estado ACTIVO.'
      });
    });

    test('updateEstado blocks moving to ACTIVO when another ACTIVO exists', async () => {
      prisma.anioLectivo.findUnique.mockResolvedValueOnce({
        id: 1,
        anio: 2026,
        estado: 'BORRADOR'
      });
      prisma.anioLectivo.findFirst.mockResolvedValue({
        id: 2,
        anio: 2025,
        estado: 'ACTIVO'
      });

      await expect(
        aniosService.updateEstado({
          id: 1,
          estado: 'ACTIVO',
          user: { id: 7 }
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Solo puede existir un anio lectivo con estado ACTIVO.'
      });
    });
  });

  describe('Calificaciones rules', () => {
    test('createCalificacion blocks when year is not ACTIVO', async () => {
      prisma.matricula.findUnique.mockResolvedValue({
        id: 1,
        curso: { id: 1, anioId: 5 }
      });
      prisma.materiaAnual.findUnique.mockResolvedValue({
        id: 2,
        anioId: 5
      });
      prisma.periodo.findUnique.mockResolvedValue({
        id: 3,
        anioId: 5
      });
      prisma.anioLectivo.findUnique.mockResolvedValue({
        id: 5,
        anio: 2026,
        estado: 'BORRADOR'
      });

      await expect(
        calificacionesService.createCalificacion({
          matriculaId: 1,
          materiaAnualId: 2,
          periodoId: 3,
          nota: 9
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Solo se permite cargar/modificar calificaciones cuando el anio esta ACTIVO.'
      });
    });

    test('createCalificacion blocks duplicated matricula+materiaAnual+periodo', async () => {
      prisma.matricula.findUnique.mockResolvedValue({
        id: 1,
        curso: { id: 1, anioId: 5 }
      });
      prisma.materiaAnual.findUnique.mockResolvedValue({
        id: 2,
        anioId: 5
      });
      prisma.periodo.findUnique.mockResolvedValue({
        id: 3,
        anioId: 5
      });
      prisma.anioLectivo.findUnique.mockResolvedValue({
        id: 5,
        anio: 2026,
        estado: 'ACTIVO'
      });
      prisma.calificacion.findFirst.mockResolvedValue({
        id: 99,
        matriculaId: 1,
        materiaAnualId: 2,
        periodoId: 3
      });

      await expect(
        calificacionesService.createCalificacion({
          matriculaId: 1,
          materiaAnualId: 2,
          periodoId: 3,
          nota: 7
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No se puede duplicar la combinacion matriculaId + materiaAnualId + periodoId.'
      });
    });
  });

  describe('Audit rules', () => {
    test('updateUsuario writes UPDATE entry to LogCambio', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 4,
        username: 'docente1',
        password: 'hash',
        rol: 'DOCENTE',
        activo: true
      });
      prisma.usuario.update.mockResolvedValue({
        id: 4,
        username: 'docente1',
        password: 'hash',
        rol: 'DOCENTE',
        activo: false
      });
      prisma.logCambio.create.mockResolvedValue({ id: 1000 });

      const updated = await usuariosService.updateUsuario({
        id: 4,
        payload: { activo: false },
        user: { id: 1 }
      });

      expect(updated).toEqual({
        id: 4,
        username: 'docente1',
        rol: 'DOCENTE',
        activo: false
      });
      expect(prisma.logCambio.create).toHaveBeenCalledTimes(1);
      expect(prisma.logCambio.create.mock.calls[0][0].data.tipoOperacion).toBe('UPDATE');
    });

    test('deleteUsuario writes DELETE entry to LogCambio', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 5,
        username: 'directivo1',
        password: 'hash',
        rol: 'DIRECTIVO',
        activo: true
      });
      prisma.usuario.delete.mockResolvedValue({ id: 5 });
      prisma.logCambio.create.mockResolvedValue({ id: 1001 });

      await usuariosService.deleteUsuario({
        id: 5,
        user: { id: 1 }
      });

      expect(prisma.logCambio.create).toHaveBeenCalledTimes(1);
      expect(prisma.logCambio.create.mock.calls[0][0].data.tipoOperacion).toBe('DELETE');
    });
  });
});
