export function asistenciaView() {
  return `
    <div class="card">
      <h2>Asistencia</h2>
      <div class="grid two">
        <div>
          <label>Anio</label>
          <input id="asiAnio" value="2025" />
        </div>
        <div>
          <label>Curso</label>
          <select id="asiCurso"></select>
        </div>
        <div>
          <label>Fecha</label>
          <input id="asiFecha" type="date" />
        </div>
      </div>
      <div class="actions" style="margin-top:8px">
        <button id="asiCargarCursos">Cargar cursos</button>
        <button id="asiBuscar" class="primary">Cargar lista</button>
        <button id="asiTodos">Todos presentes</button>
        <button id="asiGuardar">Guardar asistencia</button>
      </div>
      <p id="asiStatus" class="status"></p>
    </div>
    <div class="card">
      <h3>Grilla de asistencia</h3>
      <div id="asiGridWrap"></div>
    </div>
  `;
}
