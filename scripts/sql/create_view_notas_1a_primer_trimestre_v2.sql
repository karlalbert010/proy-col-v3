CREATE OR REPLACE VIEW vw_notas_1a_primer_trimestre_v2 AS
SELECT
  cal.id AS calificacionId,
  al.anio AS anioLectivo,
  c.id AS cursoId,
  c.nombre AS curso,
  p.id AS periodoId,
  p.nombre AS periodo,
  p.orden AS periodoOrden,
  p.duracion AS periodoDuracion,
  a.id AS alumnoId,
  a.dni,
  a.apellido,
  a.nombre,
  m.id AS materiaId,
  ma.id AS materiaAnualId,
  ma.nombre AS materia,
  cd.nota1erTrimMes1,
  cd.nota1erTrimMes2,
  cd.nota1erTrimMes3,
  cd.recup1erTrim,
  cd.observ1erTrim,
  cal.nota AS notaTrimestralFinal,
  cal.fecha AS fechaUltimaActualizacion,
  ap.estado AS actaPeriodoEstado,
  COALESCE(rcmd.estrategia, rglob.estrategia) AS estrategiaCalculo,
  COALESCE(rcmd.duracion, rglob.duracion) AS duracionRegla,
  COALESCE(rcmd.decimales, rglob.decimales) AS decimalesRegla,
  COALESCE(evAgg.totalEvaluacionesPeriodo, 0) AS totalEvaluacionesPeriodo,
  evAgg.promedioNotaEvaluacion,
  evAgg.notaMaximaEvaluacion,
  evAgg.notaMinimaEvaluacion,
  evAgg.ultimaFechaEvaluacion
FROM Calificacion cal
INNER JOIN Matricula mt ON mt.id = cal.matriculaId
INNER JOIN Alumno a ON a.id = mt.alumnoId
INNER JOIN Curso c ON c.id = mt.cursoId
INNER JOIN AnioLectivo al ON al.id = c.anioId
INNER JOIN MateriaAnual ma ON ma.id = cal.materiaAnualId
INNER JOIN Materia m ON m.id = ma.materiaId
INNER JOIN Periodo p ON p.id = cal.periodoId
LEFT JOIN CalificacionDetalle cd ON cd.calificacionId = cal.id
LEFT JOIN CursoMateriaDocente cmd
  ON cmd.cursoId = c.id
 AND cmd.materiaAnualId = ma.id
 AND cmd.activo = 1
LEFT JOIN ActaPeriodo ap
  ON ap.cursoMateriaDocenteId = cmd.id
 AND ap.periodoId = p.id
LEFT JOIN (
  SELECT
    e.cursoMateriaDocenteId,
    e.periodoId,
    ne.matriculaId,
    COUNT(DISTINCT e.id) AS totalEvaluacionesPeriodo,
    AVG(ne.nota) AS promedioNotaEvaluacion,
    MAX(ne.nota) AS notaMaximaEvaluacion,
    MIN(ne.nota) AS notaMinimaEvaluacion,
    MAX(e.fecha) AS ultimaFechaEvaluacion
  FROM Evaluacion e
  INNER JOIN NotaEvaluacion ne ON ne.evaluacionId = e.id
  GROUP BY e.cursoMateriaDocenteId, e.periodoId, ne.matriculaId
) evAgg
  ON evAgg.cursoMateriaDocenteId = cmd.id
 AND evAgg.periodoId = p.id
 AND evAgg.matriculaId = cal.matriculaId
LEFT JOIN ReglaCalculo rcmd ON rcmd.id = (
  SELECT MAX(r1.id)
  FROM ReglaCalculo r1
  WHERE r1.activa = 1
    AND r1.cursoMateriaDocenteId = cmd.id
)
LEFT JOIN ReglaCalculo rglob ON rglob.id = (
  SELECT MAX(r2.id)
  FROM ReglaCalculo r2
  WHERE r2.activa = 1
    AND r2.anioLectivoId = al.id
    AND r2.cursoMateriaDocenteId IS NULL
)
WHERE c.nombre = '1A'
  AND p.orden = 1;

