CREATE OR REPLACE VIEW vw_notas_1a_primer_trimestre AS
SELECT
  al.anio AS anioLectivo,
  c.id AS cursoId,
  c.nombre AS curso,
  p.id AS periodoId,
  p.nombre AS periodo,
  p.orden AS periodoOrden,
  a.id AS alumnoId,
  a.dni,
  a.apellido,
  a.nombre,
  m.id AS materiaId,
  ma.id AS materiaAnualId,
  ma.nombre AS materia,
  cal.id AS calificacionId,
  cd.nota1erTrimMes1,
  cd.nota1erTrimMes2,
  cd.nota1erTrimMes3,
  cd.recup1erTrim,
  cd.observ1erTrim,
  cal.nota AS notaTrimestralFinal,
  cal.fecha AS fechaUltimaActualizacion
FROM Calificacion cal
INNER JOIN Matricula mt ON mt.id = cal.matriculaId
INNER JOIN Alumno a ON a.id = mt.alumnoId
INNER JOIN Curso c ON c.id = mt.cursoId
INNER JOIN AnioLectivo al ON al.id = c.anioId
INNER JOIN MateriaAnual ma ON ma.id = cal.materiaAnualId
INNER JOIN Materia m ON m.id = ma.materiaId
INNER JOIN Periodo p ON p.id = cal.periodoId
LEFT JOIN CalificacionDetalle cd ON cd.calificacionId = cal.id
WHERE c.nombre = '1A'
  AND p.orden = 1;
