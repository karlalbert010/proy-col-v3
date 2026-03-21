function renderTopNav(activePage) {
  const links = [
    ['index.html', 'Inicio'],
    ['auth.html', 'Auth'],
    ['anios.html', 'Anios'],
    ['alumnos.html', 'Alumnos'],
    ['cursos.html', 'Cursos'],
    ['matriculas.html', 'Matriculas'],
    ['materias.html', 'Materias'],
    ['materias-anuales.html', 'MateriasAnuales'],
    ['periodos.html', 'Periodos'],
    ['curso-materia-docente.html', 'CursoMatDoc'],
    ['reglas-calculo.html', 'ReglasCalculo'],
    ['actas-periodo.html', 'ActasPeriodo'],
    ['config-evaluacion.html', 'ConfigEval'],
    ['evaluaciones.html', 'Evaluaciones'],
    ['calificaciones.html', 'Calificaciones'],
    ['calificaciones-detalle.html', 'CalifDetalle'],
    ['demo-tablas.html', 'DemoTablas'],
    ['usuarios.html', 'Usuarios'],
    ['log-cambios.html', 'LogCambios']
  ];

  const nav = document.getElementById('topNav');
  if (!nav) {
    return;
  }

  const currentIndex = links.findIndex(([href]) => href === activePage);
  const prev = currentIndex > 0 ? links[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < links.length - 1 ? links[currentIndex + 1] : null;

  const quickButtons = links
    .map(([href, name]) => {
      const activeClass = href === activePage ? 'active' : '';
      return `<button class="${activeClass}" data-href="/${href}">${name}</button>`;
    })
    .join('');

  const flowButtons = `
    <div class="flow-nav">
      <button data-href="${prev ? `/${prev[0]}` : ''}" ${!prev ? 'disabled' : ''}>Anterior</button>
      <button data-href="/index.html">Inicio</button>
      <button data-href="${next ? `/${next[0]}` : ''}" ${!next ? 'disabled' : ''}>Siguiente</button>
    </div>
  `;

  nav.innerHTML = `${quickButtons}${flowButtons}`;

  nav.querySelectorAll('button[data-href]').forEach((button) => {
    button.addEventListener('click', () => {
      const href = button.getAttribute('data-href');
      if (href) {
        window.location.href = href;
      }
    });
  });
}

window.renderTopNav = renderTopNav;
