export function entityTable({ columns, rows, rowActions }) {
  if (!rows || rows.length === 0) {
    return '<p class="status warn">Sin datos.</p>';
  }

  const header = columns.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows
    .map((row) => {
      const tds = columns.map((c) => `<td>${c.render ? c.render(row) : (row[c.key] ?? '')}</td>`).join('');
      const actions = rowActions
        ? `<td><button data-edit="${row.id}">Editar</button><button data-del="${row.id}">Eliminar</button></td>`
        : '';
      return `<tr>${tds}${actions}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${header}${rowActions ? '<th>Acciones</th>' : ''}</tr></thead><tbody>${body}</tbody></table>`;
}
