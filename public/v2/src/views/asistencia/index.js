export function asistenciaView(){
  return `<div class="card"><h2>Asistencia</h2><div class="grid two"><div><label>Curso</label><input id="asiCurso" placeholder="1A"/></div><div><label>Fecha</label><input id="asiFecha" type="date"/></div></div><div class="actions" style="margin-top:8px"><button id="asiBuscar" class="primary">Seleccionar</button><button id="asiTodos">Todos presentes</button><button id="asiGuardar">Guardar asistencia</button></div><p id="asiStatus" class="status"></p></div><div class="card"><h3>Lista</h3><pre id="asiResult">{}</pre></div>`;
}
