export function calificacionesView() {
  return `
    <div class="card">
      <h2>Calificaciones (operativo trimestral)</h2>
      <div class="grid two">
        <div>
          <label>Anio</label>
          <input id="calAnio" value="2025" />
        </div>
        <div>
          <label>Trimestre</label>
          <select id="calTrim">
            <option value="1">1er trimestre</option>
            <option value="2">2do trimestre</option>
            <option value="3">3er trimestre</option>
          </select>
        </div>
        <div>
          <label>Curso</label>
          <select id="calCurso"></select>
        </div>
        <div>
          <label>Materia (segun curso)</label>
          <select id="calMateria"></select>
        </div>
      </div>
      <div class="actions" style="margin-top:8px">
        <button id="calCargarFiltros">Cargar filtros</button>
        <button id="calBuscar" class="primary">Cargar grilla</button>
      </div>
      <p id="calStatus" class="status"></p>
    </div>

    <div class="card">
      <h3>Grilla editable</h3>
      <div id="calGridWrap"></div>
    </div>

    <div class="card">
      <h3>Alumno seleccionado</h3>
      <div class="grid two">
        <div>
          <label>ID Matricula</label>
          <input id="calSelMatriculaId" disabled />
        </div>
        <div>
          <label>Alumno</label>
          <input id="calSelAlumno" disabled />
        </div>
        <div>
          <label>Nota orientadora</label>
          <input id="calNotaOrientadora" />
        </div>
        <div>
          <label>Mes 1</label>
          <input id="calNotaMes1" />
        </div>
        <div>
          <label>Mes 2</label>
          <input id="calNotaMes2" />
        </div>
        <div>
          <label>Mes 3</label>
          <input id="calNotaMes3" />
        </div>
        <div>
          <label>Recuperatorio</label>
          <input id="calRecuperatorio" />
        </div>
      </div>
      <div class="actions" style="margin-top:8px">
        <button id="calGuardarAlumno" class="primary">Guardar (crear/actualizar)</button>
        <button id="calEliminarAlumno">Eliminar detalle</button>
      </div>
      <p id="calCrudStatus" class="status"></p>
    </div>
  `;
}
