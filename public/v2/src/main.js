import { store } from './store/index.js';
import { login, me } from './services/auth.service.js';
import { renderView } from './router/index.js';
import { calificacionesService } from './services/calificaciones.service.js';
import { asistenciaService } from './services/asistencia.service.js';
import { crudService } from './services/crud.service.js';
import { entityTable } from './components/EntityTable.js';
import { entityForm } from './components/EntityForm.js';

const app = document.getElementById('app');

const calState = {
  cursos: [],
  materias: [],
  periodos: [],
  rows: [],
  selected: null
};

const asiState = {
  cursos: [],
  rows: []
};

function shell(content) {
  const view = store.get().view;
  const items = [
    ['dashboard', 'Dashboard'],
    ['asistencia', 'Asistencia'],
    ['calificaciones', 'Calificaciones'],
    ['mis-cursos', 'Mis cursos'],
    ['control', 'Control'],
    ['alumnos', 'Alumnos'],
    ['cursos', 'Cursos'],
    ['anios', 'Anios'],
    ['materiasCrud', 'Materias'],
    ['usuarios', 'Usuarios'],
    ['configuracion', 'Configuracion']
  ];
  return `<div class="layout"><aside class="side"><h1>Cole v2</h1>${items
    .map((i) => `<button data-view="${i[0]}" class="${view === i[0] ? 'active' : ''}">${i[1]}</button>`)
    .join('')}<button id="logoutBtn">Cerrar sesion</button></aside><section><div class="top"><strong>ERP educativo operativo</strong><span class="status">Accion primero</span></div><div class="main">${content}</div></section></div>`;
}

function loginScreen() {
  app.innerHTML = `<div class="login-wrap"><div class="login-card"><h2>Ingreso</h2><form id="loginForm"><div class="grid two"><div><label>Usuario</label><input id="lUser" value="admin" autocomplete="username" /></div><div><label>Clave</label><input id="lPass" type="password" value="admin123" autocomplete="current-password" /><label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="lShowPass" type="checkbox" /> Mostrar clave</label></div></div><div class="actions" style="margin-top:10px"><button id="lBtn" class="primary" type="submit">Entrar</button></div></form><p id="lStatus" class="status"></p></div></div>`;

  const form = document.getElementById('loginForm');
  const userInput = document.getElementById('lUser');
  const passInput = document.getElementById('lPass');
  const showPass = document.getElementById('lShowPass');
  const btn = document.getElementById('lBtn');
  const st = document.getElementById('lStatus');
  let submitting = false;

  const doLogin = async () => {
    if (submitting) return;
    const username = userInput.value.trim();
    const password = passInput.value;

    st.className = 'status';
    st.textContent = '';

    if (!username || !password) {
      st.className = 'status bad';
      st.textContent = 'Ingresa usuario y clave.';
      return;
    }

    submitting = true;
    btn.disabled = true;
    try {
      const out = await login(username, password);
      if (!out.token) throw new Error('Login sin token');
      store.setToken(out.token);
      store.setUser(out.user || null);
      store.setView('dashboard');
      st.className = 'status ok';
      st.textContent = 'Login correcto';
      render();
    } catch (e) {
      st.className = 'status bad';
      const message = String(e?.message || '').trim();
      st.textContent = message || 'Usuario o clave incorrectos.';
    } finally {
      submitting = false;
      btn.disabled = false;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await doLogin();
  });

  form.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    await doLogin();
  });

  showPass.addEventListener('change', () => {
    passInput.type = showPass.checked ? 'text' : 'password';
  });
}

function setStatus(id, text, kind = 'ok') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `status ${kind}`;
  el.textContent = text;
}

function asNumberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getTrimFields(trim) {
  if (trim === 1) {
    return {
      orientadora: 'notaOrint1erTrim',
      mes1: 'nota1erTrimMes1',
      mes2: 'nota1erTrimMes2',
      mes3: 'nota1erTrimMes3',
      recup: 'recup1erTrim'
    };
  }
  if (trim === 2) {
    return {
      orientadora: 'notaOrint2doTrim',
      mes1: 'nota2doTrimMes1',
      mes2: 'nota2doTrimMes2',
      mes3: 'nota2doTrimMes3',
      recup: 'recup2doTrim'
    };
  }
  return {
    orientadora: 'notaOrint3erTrim',
    mes1: 'nota3erTrimMes1',
    mes2: 'nota3erTrimMes2',
    mes3: 'nota3erTrimMes3',
    recup: 'recup3erTrim'
  };
}

function getPromedioMeses(payload, fields) {
  const notas = [payload[fields.mes1], payload[fields.mes2], payload[fields.mes3]].filter((v) => Number.isFinite(v));
  if (notas.length === 0) return null;
  return Number((notas.reduce((acc, n) => acc + n, 0) / notas.length).toFixed(2));
}

const GRADE_MIN = 1;
const GRADE_MAX = 10;

function validateGradeField(value, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return required
      ? { kind: 'bad', message: 'Dato obligatorio.' }
      : { kind: 'warn', message: 'Pendiente de carga.' };
  }
  if (!Number.isFinite(value)) {
    return { kind: 'bad', message: 'Debe ser numerico.' };
  }
  if (value < GRADE_MIN || value > GRADE_MAX) {
    return { kind: 'bad', message: `Fuera de rango (${GRADE_MIN}-${GRADE_MAX}).` };
  }
  return { kind: 'ok', message: 'OK' };
}

function getRowValidation(row) {
  const cell = {
    notaOrientadora: validateGradeField(row.notaOrientadora, { required: false }),
    notaMes1: validateGradeField(row.notaMes1, { required: false }),
    notaMes2: validateGradeField(row.notaMes2, { required: false }),
    notaMes3: validateGradeField(row.notaMes3, { required: false }),
    recuperatorio: validateGradeField(row.recuperatorio, { required: false })
  };

  const errors = Object.entries(cell)
    .filter(([, value]) => value.kind === 'bad')
    .map(([key, value]) => `${key}: ${value.message}`);
  const loadedMonthly = [row.notaMes1, row.notaMes2, row.notaMes3].filter((x) => Number.isFinite(x)).length;

  if (errors.length > 0) {
    return { cell, rowKind: 'bad', rowLabel: 'Rojo: errores', errors };
  }
  if (loadedMonthly === 3) {
    return { cell, rowKind: 'ok', rowLabel: 'Verde: completo', errors: [] };
  }
  return {
    cell,
    rowKind: 'warn',
    rowLabel: `Amarillo: pendiente (${loadedMonthly}/3 meses)`,
    errors: []
  };
}

function applySelectedRowToEditor(row) {
  calState.selected = row;
  document.getElementById('calSelMatriculaId').value = String(row.matriculaId);
  document.getElementById('calSelAlumno').value = row.alumno;
  document.getElementById('calNotaOrientadora').value = row.notaOrientadora ?? '';
  document.getElementById('calNotaMes1').value = row.notaMes1 ?? '';
  document.getElementById('calNotaMes2').value = row.notaMes2 ?? '';
  document.getElementById('calNotaMes3').value = row.notaMes3 ?? '';
  document.getElementById('calRecuperatorio').value = row.recuperatorio ?? '';
}

function recomputeRowDerived(row) {
  const average = [row.notaMes1, row.notaMes2, row.notaMes3].filter((x) => Number.isFinite(x));
  const prom = average.length ? Number((average.reduce((acc, n) => acc + n, 0) / average.length).toFixed(2)) : null;
  const finalTrim = Number.isFinite(row.recuperatorio) && Number.isFinite(prom)
    ? Math.max(row.recuperatorio, prom)
    : Number.isFinite(row.recuperatorio)
      ? row.recuperatorio
      : prom;
  row.notaFinal = Number.isFinite(finalTrim) ? Number(finalTrim.toFixed(2)) : null;
  row.validation = getRowValidation(row);
}

function updateRowFromGridInput(row, field, rawValue) {
  const value = asNumberOrNull(rawValue);
  row[field] = value;
  recomputeRowDerived(row);
}

function syncSelectedFromEditor() {
  if (!calState.selected) return;
  calState.selected.notaOrientadora = asNumberOrNull(document.getElementById('calNotaOrientadora').value);
  calState.selected.notaMes1 = asNumberOrNull(document.getElementById('calNotaMes1').value);
  calState.selected.notaMes2 = asNumberOrNull(document.getElementById('calNotaMes2').value);
  calState.selected.notaMes3 = asNumberOrNull(document.getElementById('calNotaMes3').value);
  calState.selected.recuperatorio = asNumberOrNull(document.getElementById('calRecuperatorio').value);
  recomputeRowDerived(calState.selected);
}

function renderCalGrid() {
  const wrap = document.getElementById('calGridWrap');
  if (!wrap) return;

  if (calState.rows.length === 0) {
    wrap.innerHTML = '<p class="status warn">Sin filas para los filtros seleccionados.</p>';
    return;
  }

  const rows = calState.rows
    .map((row) => {
      const selectedClass = calState.selected && calState.selected.matriculaId === row.matriculaId ? ' class="selected-row"' : '';
      const validation = row.validation || getRowValidation(row);
      const errorLine = validation.errors.length
        ? `<div class="status bad">${validation.errors.join(' | ')}</div>`
        : '';
      return `<tr${selectedClass}>
        <td><button data-select="${row.matriculaId}" class="primary">Seleccionar</button></td>
        <td>${row.alumno}</td>
        <td><input class="grid-input cell-${validation.cell.notaOrientadora.kind}" data-field="notaOrientadora" data-matricula="${row.matriculaId}" value="${row.notaOrientadora ?? ''}" /></td>
        <td><input class="grid-input cell-${validation.cell.notaMes1.kind}" data-field="notaMes1" data-matricula="${row.matriculaId}" value="${row.notaMes1 ?? ''}" /></td>
        <td><input class="grid-input cell-${validation.cell.notaMes2.kind}" data-field="notaMes2" data-matricula="${row.matriculaId}" value="${row.notaMes2 ?? ''}" /></td>
        <td><input class="grid-input cell-${validation.cell.notaMes3.kind}" data-field="notaMes3" data-matricula="${row.matriculaId}" value="${row.notaMes3 ?? ''}" /></td>
        <td><input class="grid-input cell-${validation.cell.recuperatorio.kind}" data-field="recuperatorio" data-matricula="${row.matriculaId}" value="${row.recuperatorio ?? ''}" /></td>
        <td>${row.notaFinal ?? ''}</td>
        <td>
          <div class="row-state ${validation.rowKind}">${validation.rowLabel}</div>
          ${row.detalleId ? '<div class="status ok">Con detalle</div>' : '<div class="status warn">Sin detalle</div>'}
          ${errorLine}
        </td>
      </tr>
      `;
    })
    .join('');

  wrap.innerHTML = `<table>
    <thead>
      <tr>
        <th>Accion</th>
        <th>Alumno</th>
        <th>Orientadora</th>
        <th>Mes 1</th>
        <th>Mes 2</th>
        <th>Mes 3</th>
        <th>Recup.</th>
        <th>Final Trim.</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  wrap.querySelectorAll('button[data-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const matriculaId = Number(button.getAttribute('data-select'));
      const row = calState.rows.find((x) => x.matriculaId === matriculaId);
      if (!row) return;
      applySelectedRowToEditor(row);
      setStatus('calCrudStatus', `Alumno seleccionado: ${row.alumno}`, 'ok');
      renderCalGrid();
    });
  });

  wrap.querySelectorAll('input[data-field][data-matricula]').forEach((input) => {
    input.addEventListener('input', () => {
      const matriculaId = Number(input.getAttribute('data-matricula'));
      const field = input.getAttribute('data-field');
      const row = calState.rows.find((x) => x.matriculaId === matriculaId);
      if (!row) return;
      updateRowFromGridInput(row, field, input.value);
      if (calState.selected && calState.selected.matriculaId === row.matriculaId) {
        applySelectedRowToEditor(row);
      }
      renderCalGrid();
    });
  });
}

function fillSelect(selectId, items, toValue, toLabel, placeholder = 'Seleccionar...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const opts = [`<option value="">${placeholder}</option>`];
  items.forEach((item) => {
    opts.push(`<option value="${toValue(item)}">${toLabel(item)}</option>`);
  });
  select.innerHTML = opts.join('');
}

function renderAsistenciaGrid() {
  const wrap = document.getElementById('asiGridWrap');
  if (!wrap) return;

  if (!asiState.rows.length) {
    wrap.innerHTML = '<p class="status warn">Sin alumnos para el curso/fecha seleccionados.</p>';
    return;
  }

  const rowsHtml = asiState.rows
    .map((row) => {
      return `<tr>
        <td>${row.alumno}</td>
        <td>${row.dni || '-'}</td>
        <td><input type="checkbox" data-asi-check="${row.matriculaId}" ${row.presente ? 'checked' : ''} /></td>
        <td><input data-asi-obs="${row.matriculaId}" value="${row.observacion || ''}" /></td>
      </tr>`;
    })
    .join('');

  wrap.innerHTML = `<table>
    <thead>
      <tr>
        <th>Alumno</th>
        <th>DNI</th>
        <th>Presente</th>
        <th>Observacion</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;

  wrap.querySelectorAll('input[data-asi-check]').forEach((input) => {
    input.addEventListener('change', () => {
      const matriculaId = Number(input.getAttribute('data-asi-check'));
      const row = asiState.rows.find((x) => x.matriculaId === matriculaId);
      if (!row) return;
      row.presente = Boolean(input.checked);
    });
  });

  wrap.querySelectorAll('input[data-asi-obs]').forEach((input) => {
    input.addEventListener('input', () => {
      const matriculaId = Number(input.getAttribute('data-asi-obs'));
      const row = asiState.rows.find((x) => x.matriculaId === matriculaId);
      if (!row) return;
      row.observacion = input.value;
    });
  });
}

async function loadAsistenciaCursos() {
  const anio = document.getElementById('asiAnio')?.value?.trim();
  const out = await asistenciaService.getCursos(anio ? { anio } : {});
  asiState.cursos = out.data || [];
  fillSelect('asiCurso', asiState.cursos, (x) => x.id, (x) => `${x.nombre} (id:${x.id})`, 'Seleccionar curso');
}

async function loadAsistenciaContexto() {
  const cursoId = document.getElementById('asiCurso')?.value;
  const fecha = document.getElementById('asiFecha')?.value;
  if (!cursoId || !fecha) {
    throw new Error('Completa curso y fecha.');
  }

  const out = await asistenciaService.getContexto({ cursoId, fecha });
  const alumnos = out.data?.alumnos || [];
  asiState.rows = alumnos
    .map((a) => ({
      matriculaId: a.matriculaId,
      alumno: `${a.apellido}, ${a.nombre}`,
      dni: a.dni,
      presente: a.presente === undefined ? true : Boolean(a.presente),
      observacion: a.observacion || ''
    }))
    .sort((a, b) => a.alumno.localeCompare(b.alumno));
  renderAsistenciaGrid();
}

async function saveAsistencia() {
  const cursoId = Number(document.getElementById('asiCurso')?.value);
  const fecha = document.getElementById('asiFecha')?.value;
  if (!Number.isInteger(cursoId) || !fecha) {
    throw new Error('Completa curso y fecha antes de guardar.');
  }
  if (!asiState.rows.length) {
    throw new Error('No hay filas cargadas para guardar.');
  }

  const payload = {
    cursoId,
    fecha,
    items: asiState.rows.map((row) => ({
      matriculaId: row.matriculaId,
      presente: row.presente,
      observacion: row.observacion || null
    }))
  };

  await asistenciaService.guardar(payload);
}

async function loadCalFilters() {
  const anio = document.getElementById('calAnio').value.trim();
  const cursoIdCurrent = document.getElementById('calCurso').value;
  const materiaIdCurrent = document.getElementById('calMateria').value;

  const [cursosRes, periodosRes] = await Promise.all([
    calificacionesService.getCursos({ anio }),
    calificacionesService.getPeriodos({ anio })
  ]);

  calState.cursos = cursosRes.data || [];
  calState.periodos = (periodosRes.data || []).filter((p) => p.duracion === 'TRIMESTRAL' && [1, 2, 3].includes(p.orden));

  fillSelect(
    'calCurso',
    calState.cursos,
    (x) => x.id,
    (x) => `${x.nombre} (id:${x.id})`,
    'Seleccionar curso'
  );

  if (cursoIdCurrent) document.getElementById('calCurso').value = cursoIdCurrent;
  await loadMateriasByCurso();

  if (materiaIdCurrent) document.getElementById('calMateria').value = materiaIdCurrent;
}

async function loadMateriasByCurso() {
  const anio = document.getElementById('calAnio').value.trim();
  const cursoId = document.getElementById('calCurso').value;
  calState.materias = [];

  if (!cursoId) {
    fillSelect('calMateria', [], () => '', () => '', 'Seleccionar materia');
    return;
  }

  const [asigRes, calRes] = await Promise.all([
    calificacionesService.getAsignaciones({ anio, cursoId }),
    calificacionesService.getCalificaciones({ anio, curso: cursoId })
  ]);

  const map = new Map();

  (asigRes.data || []).forEach((x) => {
    if (!x?.materiaAnual) return;
    map.set(x.materiaAnual.id, {
      id: x.materiaAnual.id,
      nombre: x.materiaAnual.nombre,
      source: 'ASIGNADA'
    });
  });

  (calRes.data || []).forEach((x) => {
    if (!x?.materiaAnual) return;
    if (!map.has(x.materiaAnual.id)) {
      map.set(x.materiaAnual.id, {
        id: x.materiaAnual.id,
        nombre: x.materiaAnual.nombre,
        source: 'CON_NOTAS'
      });
    }
  });

  calState.materias = [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));

  fillSelect(
    'calMateria',
    calState.materias,
    (x) => x.id,
    (x) => `id:${x.id} - ${x.nombre} [${x.source}]`,
    'Seleccionar materia'
  );
}

async function loadCalGrid() {
  const anio = document.getElementById('calAnio').value.trim();
  const trimestre = Number(document.getElementById('calTrim').value);
  const cursoId = Number(document.getElementById('calCurso').value);
  const materiaAnualId = Number(document.getElementById('calMateria').value);

  if (!anio || !Number.isInteger(cursoId) || !Number.isInteger(materiaAnualId)) {
    throw new Error('Completa anio, curso y materia para cargar la grilla.');
  }

  const fields = getTrimFields(trimestre);

  const [matriculasRes, calificacionesRes] = await Promise.all([
    calificacionesService.getMatriculas({ anio }),
    calificacionesService.getCalificaciones({ anio, curso: cursoId, materia: materiaAnualId })
  ]);

  const periodo = calState.periodos.find((p) => p.orden === trimestre);
  if (!periodo) {
    throw new Error(`No existe periodo trimestral orden ${trimestre} para el anio ${anio}.`);
  }

  const matriculas = (matriculasRes.data || [])
    .filter((m) => m.cursoId === cursoId && m.estado === 'ACTIVA')
    .sort((a, b) => {
      const aa = `${a.alumno.apellido} ${a.alumno.nombre}`.toUpperCase();
      const bb = `${b.alumno.apellido} ${b.alumno.nombre}`.toUpperCase();
      return aa.localeCompare(bb);
    });

  const califsMap = new Map();
  (calificacionesRes.data || [])
    .filter((c) => c.periodoId === periodo.id && c.materiaAnualId === materiaAnualId)
    .forEach((c) => califsMap.set(c.matriculaId, c));

  calState.rows = matriculas.map((m) => {
    const c = califsMap.get(m.id) || null;
    const detalle = c?.detalle || null;
    const notaMes1 = detalle?.[fields.mes1] ?? null;
    const notaMes2 = detalle?.[fields.mes2] ?? null;
    const notaMes3 = detalle?.[fields.mes3] ?? null;
    const recup = detalle?.[fields.recup] ?? null;
    const promedio = [notaMes1, notaMes2, notaMes3].filter((x) => Number.isFinite(x));
    const prom = promedio.length ? Number((promedio.reduce((acc, n) => acc + n, 0) / promedio.length).toFixed(2)) : null;
    const finalTrim = Number.isFinite(recup) && Number.isFinite(prom) ? Math.max(recup, prom) : Number.isFinite(recup) ? recup : prom;

    const row = {
      matriculaId: m.id,
      alumno: `${m.alumno.apellido}, ${m.alumno.nombre}`,
      calificacionId: c?.id || null,
      detalleId: detalle?.id || null,
      notaOrientadora: detalle?.[fields.orientadora] ?? null,
      notaMes1,
      notaMes2,
      notaMes3,
      recuperatorio: recup,
      notaFinal: Number.isFinite(finalTrim) ? Number(finalTrim.toFixed(2)) : null
    };
    row.validation = getRowValidation(row);
    return row;
  });

  calState.selected = null;
  document.getElementById('calSelMatriculaId').value = '';
  document.getElementById('calSelAlumno').value = '';
  document.getElementById('calNotaOrientadora').value = '';
  document.getElementById('calNotaMes1').value = '';
  document.getElementById('calNotaMes2').value = '';
  document.getElementById('calNotaMes3').value = '';
  document.getElementById('calRecuperatorio').value = '';
  renderCalGrid();
}

async function saveSelectedCalificacion() {
  if (!calState.selected) {
    throw new Error('Selecciona un alumno de la grilla.');
  }

  syncSelectedFromEditor();
  calState.selected.validation = getRowValidation(calState.selected);
  if (calState.selected.validation.rowKind === 'bad') {
    throw new Error(`Fila con errores: ${calState.selected.validation.errors.join(' | ')}`);
  }

  const anio = document.getElementById('calAnio').value.trim();
  const trimestre = Number(document.getElementById('calTrim').value);
  const materiaAnualId = Number(document.getElementById('calMateria').value);
  const fields = getTrimFields(trimestre);
  const periodo = calState.periodos.find((p) => p.orden === trimestre);
  if (!periodo) throw new Error('No se pudo resolver el periodo trimestral.');

  const detallePayload = {
    [fields.orientadora]: asNumberOrNull(document.getElementById('calNotaOrientadora').value),
    [fields.mes1]: asNumberOrNull(document.getElementById('calNotaMes1').value),
    [fields.mes2]: asNumberOrNull(document.getElementById('calNotaMes2').value),
    [fields.mes3]: asNumberOrNull(document.getElementById('calNotaMes3').value),
    [fields.recup]: asNumberOrNull(document.getElementById('calRecuperatorio').value)
  };

  const promedio = getPromedioMeses(detallePayload, fields);
  const notaBase = Number.isFinite(promedio) ? promedio : 0;

  if (!calState.selected.calificacionId) {
    const created = await calificacionesService.createCalificacion({
      matriculaId: calState.selected.matriculaId,
      materiaAnualId,
      periodoId: periodo.id,
      nota: notaBase,
      ...detallePayload
    });
    calState.selected.calificacionId = created?.data?.id || null;
    calState.selected.detalleId = created?.data?.detalle?.id || null;
  } else if (!calState.selected.detalleId) {
    const out = await calificacionesService.createDetalle({
      calificacionId: calState.selected.calificacionId,
      ...detallePayload
    });
    calState.selected.detalleId = out?.data?.id || null;
  } else {
    await calificacionesService.updateDetalle(calState.selected.detalleId, detallePayload);
  }

  await loadCalGrid();
  setStatus('calCrudStatus', `Guardado OK (${anio} T${trimestre}).`, 'ok');
}

async function deleteSelectedDetalle() {
  if (!calState.selected) throw new Error('Selecciona un alumno de la grilla.');
  if (!calState.selected.detalleId) throw new Error('El alumno seleccionado no tiene detalle cargado para eliminar.');
  await calificacionesService.deleteDetalle(calState.selected.detalleId);
  await loadCalGrid();
  setStatus('calCrudStatus', 'Detalle eliminado.', 'ok');
}

async function bindCalificacionesActions() {
  document.getElementById('calCargarFiltros')?.addEventListener('click', async () => {
    try {
      await loadCalFilters();
      setStatus('calStatus', 'Filtros cargados.', 'ok');
    } catch (e) {
      setStatus('calStatus', e.message, 'bad');
    }
  });

  document.getElementById('calCurso')?.addEventListener('change', async () => {
    try {
      await loadMateriasByCurso();
      calState.rows = [];
      renderCalGrid();
      setStatus('calStatus', 'Materias actualizadas segun curso.', 'ok');
    } catch (e) {
      setStatus('calStatus', e.message, 'bad');
    }
  });

  document.getElementById('calBuscar')?.addEventListener('click', async () => {
    try {
      await loadCalGrid();
      setStatus('calStatus', `Grilla cargada (${calState.rows.length} alumnos).`, 'ok');
    } catch (e) {
      setStatus('calStatus', e.message, 'bad');
    }
  });

  document.getElementById('calGuardarAlumno')?.addEventListener('click', async () => {
    try {
      await saveSelectedCalificacion();
    } catch (e) {
      setStatus('calCrudStatus', e.message, 'bad');
    }
  });

  document.getElementById('calEliminarAlumno')?.addEventListener('click', async () => {
    try {
      await deleteSelectedDetalle();
    } catch (e) {
      setStatus('calCrudStatus', e.message, 'bad');
    }
  });

  try {
    await loadCalFilters();
  } catch (e) {
    setStatus('calStatus', e.message, 'bad');
  }
}

const simpleCrudConfigs = {
  alumnosCrud: {
    endpoint: 'alumnos',
    filters: [
      { name: 'alumnoId', label: 'AlumnoId', type: 'number', placeholder: 'Opcional' },
      { name: 'apellidoAlumno', label: 'ApellidoAlumno', type: 'text', placeholder: 'Opcional' },
      { name: 'nombreAlumno', label: 'NombreAlumno', type: 'text', placeholder: 'Opcional' },
      { name: 'nombreCurso', label: 'nombreCurso', type: 'text', placeholder: 'Opcional' }
    ],
    buildQuery: (filters) => {
      const query = {};
      if (filters.nombreCurso) query.curso = filters.nombreCurso;
      return query;
    },
    clientFilter: (rows, filters) => {
      const norm = (v) => String(v || '').trim().toUpperCase();
      const idFilter = Number(filters.alumnoId);
      const apellidoFilter = norm(filters.apellidoAlumno);
      const nombreFilter = norm(filters.nombreAlumno);
      return (rows || []).filter((r) => {
        if (Number.isInteger(idFilter) && idFilter > 0 && r.id !== idFilter) return false;
        if (apellidoFilter && !norm(r.apellido).includes(apellidoFilter)) return false;
        if (nombreFilter && !norm(r.nombre).includes(nombreFilter)) return false;
        return true;
      });
    },
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text' },
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'dni', label: 'DNI', type: 'text' },
      { name: 'activo', label: 'Activo', type: 'checkbox' }
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'apellido', label: 'Apellido' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dni', label: 'DNI' },
      { key: 'activo', label: 'Activo', render: (r) => (r.activo ? 'SI' : 'NO') }
    ]
  },
  cursosCrud: {
    endpoint: 'cursos',
    filters: [
      { name: 'anio', label: 'Anio', type: 'number', placeholder: 'Ej: 2025' },
      { name: 'estado', label: 'Estado anio', type: 'text', placeholder: 'BORRADOR/ACTIVO/CERRADO' }
    ],
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'anioId', label: 'Anio ID', type: 'number' }
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'anioId', label: 'Anio ID' },
      { key: 'anio', label: 'Anio', render: (r) => r.anio?.anio ?? '' },
      { key: 'estado', label: 'Estado', render: (r) => r.anio?.estado ?? '' }
    ]
  },
  aniosCrud: {
    endpoint: 'anios',
    filters: [
      { name: 'anio', label: 'Anio', type: 'number', placeholder: 'Ej: 2025' },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'BORRADOR', label: 'BORRADOR' },
          { value: 'ACTIVO', label: 'ACTIVO' },
          { value: 'CERRADO', label: 'CERRADO' }
        ]
      }
    ],
    fields: [
      { name: 'anio', label: 'Anio', type: 'number' },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'BORRADOR', label: 'BORRADOR' },
          { value: 'ACTIVO', label: 'ACTIVO' },
          { value: 'CERRADO', label: 'CERRADO' }
        ]
      }
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'anio', label: 'Anio' },
      { key: 'estado', label: 'Estado' }
    ],
    onUpdate: async (id, payload, row) => {
      await crudService.update('anios', id, { anio: Number(payload.anio) });
      if (payload.estado && payload.estado !== row.estado) {
        await crudService.patch('anios', id, 'estado', { estado: payload.estado });
      }
    }
  },
  materiasCrud: {
    endpoint: 'materias',
    filters: [
      {
        name: 'activa',
        label: 'Activa',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'true', label: 'SI' },
          { value: 'false', label: 'NO' }
        ]
      },
      { name: 'anio', label: 'Anio', type: 'number', placeholder: 'Opcional' }
    ],
    fields: [
      { name: 'codigoBase', label: 'Codigo base', type: 'text' },
      { name: 'descripcion', label: 'Descripcion', type: 'text' },
      { name: 'activa', label: 'Activa', type: 'checkbox' }
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'codigoBase', label: 'Codigo' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'activa', label: 'Activa', render: (r) => (r.activa ? 'SI' : 'NO') }
    ]
  },
  usuariosCrud: {
    endpoint: 'usuarios',
    filters: [],
    fields: [
      { name: 'username', label: 'Username', type: 'text' },
      { name: 'password', label: 'Password', type: 'text' },
      {
        name: 'rol',
        label: 'Rol',
        type: 'select',
        options: [
          { value: 'ADMIN', label: 'ADMIN' },
          { value: 'DOCENTE', label: 'DOCENTE' },
          { value: 'DIRECTIVO', label: 'DIRECTIVO' }
        ]
      },
      { name: 'activo', label: 'Activo', type: 'checkbox' }
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'username', label: 'Username' },
      { key: 'rol', label: 'Rol' },
      { key: 'activo', label: 'Activo', render: (r) => (r.activo ? 'SI' : 'NO') }
    ]
  }
};

const simpleCrudState = {};

function renderCrudFilters(key, filters) {
  const wrap = document.getElementById(`${key}Filters`);
  if (!wrap) return;
  if (!filters || filters.length === 0) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = filters
    .map((f) => {
      const id = `${key}Filter_${f.name}`;
      if (f.type === 'select') {
        const opts = (f.options || []).map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
        return `<div><label>${f.label}</label><select id="${id}">${opts}</select></div>`;
      }
      return `<div><label>${f.label}</label><input id="${id}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" /></div>`;
    })
    .join('');
}

function getCrudFilterQuery(key, filters) {
  const out = {};
  (filters || []).forEach((f) => {
    const id = `${key}Filter_${f.name}`;
    const el = document.getElementById(id);
    if (!el) return;
    const value = el.value;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[f.name] = value;
    }
  });
  return out;
}

function buildFieldDefs(key, fields) {
  return (fields || []).map((f) => ({ ...f, domId: `${key}Field_${f.name}` }));
}

function getFieldValue(field, domId) {
  const el = document.getElementById(domId);
  if (!el) return undefined;
  if (field.type === 'checkbox') return Boolean(el.checked);
  if (field.type === 'number') return el.value === '' ? undefined : Number(el.value);
  return el.value;
}

function readCrudPayload(key, fields) {
  const payload = {};
  fields.forEach((f) => {
    payload[f.name] = getFieldValue(f, `${key}Field_${f.name}`);
  });
  return payload;
}

function renderCrudForm(key, cfg) {
  const wrap = document.getElementById(`${key}Form`);
  if (!wrap) return;
  const st = simpleCrudState[key] || { editingId: null, editingRow: null };
  const values = st.editingRow || {};
  const defs = buildFieldDefs(key, cfg.fields || []);
  wrap.innerHTML = entityForm({ fields: defs, values });
}

function renderCrudTable(key, cfg) {
  const wrap = document.getElementById(`${key}Table`);
  if (!wrap) return;
  const rows = simpleCrudState[key]?.rows || [];
  wrap.innerHTML = entityTable({ columns: cfg.columns || [], rows, rowActions: true });

  wrap.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-edit'));
      const row = rows.find((r) => r.id === id);
      simpleCrudState[key].editingId = id;
      simpleCrudState[key].editingRow = row || null;
      renderCrudForm(key, cfg);
      setStatus(`${key}FormStatus`, `Editando ID ${id}.`, 'warn');
    });
  });

  wrap.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-del'));
      try {
        if (cfg.onDelete) {
          await cfg.onDelete(id);
        } else {
          await crudService.remove(cfg.endpoint, id);
        }
        await loadSimpleCrudRows(key, cfg);
        setStatus(`${key}Status`, `Eliminado ID ${id}.`, 'ok');
      } catch (e) {
        setStatus(`${key}Status`, e.message, 'bad');
      }
    });
  });
}

async function loadSimpleCrudRows(key, cfg) {
  const rawFilters = getCrudFilterQuery(key, cfg.filters);
  const query = cfg.buildQuery ? cfg.buildQuery(rawFilters) : rawFilters;
  const out = await crudService.list(cfg.endpoint, query);
  let rows = out.data || [];
  if (cfg.clientFilter) {
    rows = cfg.clientFilter(rows, rawFilters);
  }
  simpleCrudState[key].rows = rows;
  renderCrudTable(key, cfg);
  renderCrudForm(key, cfg);
}

async function initSimpleCrudPage(key) {
  const cfg = simpleCrudConfigs[key];
  if (!cfg) return;

  if (!simpleCrudState[key]) {
    simpleCrudState[key] = { rows: [], editingId: null, editingRow: null };
  }

  renderCrudFilters(key, cfg.filters || []);
  renderCrudForm(key, cfg);

  document.getElementById(`${key}Buscar`)?.addEventListener('click', async () => {
    try {
      await loadSimpleCrudRows(key, cfg);
      setStatus(`${key}Status`, `Registros cargados: ${simpleCrudState[key].rows.length}.`, 'ok');
    } catch (e) {
      setStatus(`${key}Status`, e.message, 'bad');
    }
  });
  document.getElementById(`${key}Clear`)?.addEventListener('click', async () => {
    (cfg.filters || []).forEach((f) => {
      const el = document.getElementById(`${key}Filter_${f.name}`);
      if (!el) return;
      if (f.type === 'checkbox') {
        el.checked = false;
      } else if (f.type === 'select') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
    try {
      await loadSimpleCrudRows(key, cfg);
      setStatus(`${key}Status`, 'Filtros limpiados.', 'ok');
    } catch (e) {
      setStatus(`${key}Status`, e.message, 'bad');
    }
  });

  document.getElementById(`${key}Nuevo`)?.addEventListener('click', () => {
    simpleCrudState[key].editingId = null;
    simpleCrudState[key].editingRow = null;
    renderCrudForm(key, cfg);
    setStatus(`${key}FormStatus`, 'Modo alta.', 'ok');
  });

  document.getElementById(`${key}Cancelar`)?.addEventListener('click', () => {
    simpleCrudState[key].editingId = null;
    simpleCrudState[key].editingRow = null;
    renderCrudForm(key, cfg);
    setStatus(`${key}FormStatus`, 'Edicion cancelada.', 'warn');
  });

  document.getElementById(`${key}Guardar`)?.addEventListener('click', async () => {
    try {
      const payload = readCrudPayload(key, cfg.fields || []);
      const currentId = simpleCrudState[key].editingId;
      const currentRow = simpleCrudState[key].editingRow;

      if (currentId) {
        if (cfg.onUpdate) {
          await cfg.onUpdate(currentId, payload, currentRow);
        } else {
          await crudService.update(cfg.endpoint, currentId, payload);
        }
        setStatus(`${key}FormStatus`, `Actualizado ID ${currentId}.`, 'ok');
      } else {
        if (cfg.onCreate) {
          await cfg.onCreate(payload);
        } else {
          await crudService.create(cfg.endpoint, payload);
        }
        setStatus(`${key}FormStatus`, 'Creado correctamente.', 'ok');
      }

      simpleCrudState[key].editingId = null;
      simpleCrudState[key].editingRow = null;
      await loadSimpleCrudRows(key, cfg);
    } catch (e) {
      setStatus(`${key}FormStatus`, e.message, 'bad');
    }
  });

  await loadSimpleCrudRows(key, cfg);
}

async function bindViewActions(view) {
  if (view === 'dashboard') {
    document
      .querySelectorAll('[data-go]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          store.setView(b.dataset.go);
          render();
        })
      );
  }

  if (view === 'calificaciones') {
    await bindCalificacionesActions();
  }

  if (view === 'anios') {
    await initSimpleCrudPage('aniosCrud');
  }

  if (view === 'materiasCrud') {
    await initSimpleCrudPage('materiasCrud');
  }

  if (view === 'usuarios') {
    await initSimpleCrudPage('usuariosCrud');
  }

  if (view === 'cursos') {
    await initSimpleCrudPage('cursosCrud');
  }

  if (view === 'alumnos') {
    await initSimpleCrudPage('alumnosCrud');
  }

  if (view === 'asistencia') {
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const fechaInput = document.getElementById('asiFecha');
    if (fechaInput && !fechaInput.value) fechaInput.value = fechaHoy;

    const loadCursosSafe = async () => {
      try {
        await loadAsistenciaCursos();
        setStatus('asiStatus', 'Cursos cargados.', 'ok');
      } catch (e) {
        setStatus('asiStatus', `Asistencia: ${e.message}`, 'bad');
      }
    };

    await loadCursosSafe();

    document.getElementById('asiCargarCursos')?.addEventListener('click', loadCursosSafe);
    document.getElementById('asiBuscar')?.addEventListener('click', async () => {
      try {
        await loadAsistenciaContexto();
        setStatus('asiStatus', `Lista cargada (${asiState.rows.length} alumnos).`, 'ok');
      } catch (e) {
        setStatus('asiStatus', `Asistencia: ${e.message}`, 'bad');
      }
    });
    document.getElementById('asiTodos')?.addEventListener('click', () => {
      if (!asiState.rows.length) {
        setStatus('asiStatus', 'Primero carga la lista.', 'warn');
        return;
      }
      asiState.rows.forEach((row) => {
        row.presente = true;
      });
      renderAsistenciaGrid();
      setStatus('asiStatus', 'Todos marcados como presentes.', 'ok');
    });
    document.getElementById('asiGuardar')?.addEventListener('click', async () => {
      try {
        await saveAsistencia();
        setStatus('asiStatus', `Asistencia guardada (${asiState.rows.length} registros).`, 'ok');
      } catch (e) {
        setStatus('asiStatus', `Asistencia: ${e.message}`, 'bad');
      }
    });
  }
}

function render() {
  if (!store.get().token) {
    loginScreen();
    return;
  }
  app.innerHTML = shell(renderView(store.get().view));
  document.querySelectorAll('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => {
      store.setView(btn.dataset.view);
      render();
    })
  );
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    store.setToken('');
    store.setUser(null);
    loginScreen();
  });
  bindViewActions(store.get().view);
}

async function bootstrapSession() {
  const token = store.get().token;
  if (!token) {
    render();
    return;
  }

  try {
    const user = await me();
    store.setUser(user);
    render();
  } catch (_error) {
    store.setToken('');
    store.setUser(null);
    loginScreen();
  }
}

window.addEventListener('auth:expired', () => {
  loginScreen();
});

bootstrapSession();







