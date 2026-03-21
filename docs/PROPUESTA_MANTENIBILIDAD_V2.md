# Propuesta v2 de mantenibilidad (aplicada en `schema.prisma`)

Este documento resume los cambios de modelo aplicados para hacer la base mas mantenible en el flujo escolar.

## Puntos ejecutados

1. Se agregaron entidades de dominio docente:
- `Docente`
- `CursoMateriaDocente`

2. Se agrego capa de evaluaciones por instrumento:
- `Evaluacion`
- `NotaEvaluacion`

3. Se agrego capa de cierre administrativo:
- `ActaTrimestral`

4. Se reforzaron restricciones del modelo actual:
- `Matricula`: `@@unique([alumnoId, cursoId])`
- `Calificacion`: `@@unique([matriculaId, materiaAnualId, periodoId])`
- indices de consulta en `Calificacion`

## Motivo tecnico

- Permisos por rol mas robustos: ahora un docente puede vincularse formalmente a curso+materia.
- Trazabilidad real de notas: se separa evaluacion (instrumento) de nota por alumno.
- Cierre institucional formal: actas por periodo evitan modificaciones fuera de estado.
- Integridad de datos: se impide duplicidad funcional en matriculas y calificaciones.

## Modelos agregados (resumen)

### `Docente`
- `id`, `usuarioId` (UQ), `dni` (UQ), `apellido`, `nombre`, `email` (UQ), `activo`.
- Relacion 1:1 con `Usuario`.

### `CursoMateriaDocente`
- Relaciona `Curso` + `MateriaAnual` + `Docente`.
- `@@unique([cursoId, materiaAnualId])`.

### `Evaluacion`
- Cuelga de `CursoMateriaDocente` y `Periodo`.
- Campos: `tipo`, `fecha`, `titulo`, `descripcion`, `ponderacion`, `estado`.

### `NotaEvaluacion`
- Nota por `Evaluacion` + `Matricula`.
- `@@unique([evaluacionId, matriculaId])`.

### `ActaTrimestral`
- Cierre por `CursoMateriaDocente` + `Periodo`.
- `estado`: `ABIERTA`, `CERRADA`, `FIRMADA`.
- `@@unique([cursoMateriaDocenteId, periodoId])`.

## Enums agregados

- `TipoEvaluacion`: `PARCIAL`, `TRABAJO_PRACTICO`, `ORAL`, `TAREA`, `OTRO`
- `EstadoEvaluacion`: `ABIERTA`, `CERRADA`
- `EstadoActa`: `ABIERTA`, `CERRADA`, `FIRMADA`

## Orden recomendado para aplicar en DB

1. Levantar Docker/MySQL.
2. Validar duplicados previos para nuevos `UNIQUE`:
- `Matricula (alumnoId, cursoId)`
- `Calificacion (matriculaId, materiaAnualId, periodoId)`
3. Resolver duplicados si existen.
4. Ejecutar migracion Prisma.
5. Regenerar cliente Prisma.

## SQL de diagnostico de duplicados

```sql
SELECT alumnoId, cursoId, COUNT(*) c
FROM Matricula
GROUP BY alumnoId, cursoId
HAVING c > 1;

SELECT matriculaId, materiaAnualId, periodoId, COUNT(*) c
FROM Calificacion
GROUP BY matriculaId, materiaAnualId, periodoId
HAVING c > 1;
```

## Estado actual

- `schema.prisma`: actualizado.
- Validacion de schema Prisma: OK.
- Verificacion en DB de duplicados: pendiente (Docker no disponible en esta ejecucion).
