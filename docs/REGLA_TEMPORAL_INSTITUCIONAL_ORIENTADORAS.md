# Regla Temporal Institucional - Notas Orientadoras

## Estado
- Vigente (temporal)
- Fecha de registro: 2026-03-14

## Regla
- Las notas orientadoras se registran en el sistema (`notaOrint1erTrim`, `notaOrint2doTrim`, `notaOrint3erTrim`).
- Por decision institucional temporal, **no participan en el calculo** de:
  - nota trimestral
  - promedio anual
  - nota anual final

## Calculo vigente de notas
- Nota trimestral: se toma el mayor valor entre:
  - promedio de notas mensuales del trimestre
  - recuperatorio del trimestre (si existe)
- Nota anual final: se toma el mayor valor entre:
  - promedio anual (promedio de las notas trimestrales)
  - recuperacion anual (si existe, desde `AcompDic`/`AcompFeb` cuando sea numerica)

## Motivo
- Las notas orientadoras funcionan actualmente como referencia pedagogica.
- Su efecto en el calculo final queda pendiente de definicion institucional.

## Implementacion tecnica actual
- Registro en `CalificacionDetalle`: activo.
- Impacto en formulas de `calificaciones.service.js`: desactivado (solo almacenamiento).
