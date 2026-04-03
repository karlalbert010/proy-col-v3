export function crudPageBase({ key, title, description = '' }) {
  return `
    <div class="card">
      <h2>${title}</h2>
      <p>${description}</p>
      <div id="${key}Filters" class="grid two"></div>
      <div class="actions" style="margin-top:8px">
        <button id="${key}Buscar" class="primary">Buscar</button>
        <button id="${key}Clear">Clear</button>
        <button id="${key}Nuevo">Nuevo</button>
      </div>
      <p id="${key}Status" class="status"></p>
    </div>
    <div class="card">
      <h3>Listado</h3>
      <div id="${key}Table"></div>
    </div>
    <div class="card">
      <h3>Formulario</h3>
      <div id="${key}Form"></div>
      <div class="actions" style="margin-top:8px">
        <button id="${key}Guardar" class="primary">Guardar</button>
        <button id="${key}Cancelar">Cancelar</button>
      </div>
      <p id="${key}FormStatus" class="status"></p>
    </div>
  `;
}
