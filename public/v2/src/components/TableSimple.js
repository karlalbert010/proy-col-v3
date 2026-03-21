export function tableSimple(columns,rows){
  const th=columns.map(c=>`<th>${c.label}</th>`).join('');
  const tr=rows.map(r=>`<tr>${columns.map(c=>`<td>${r[c.key]??''}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr||'<tr><td colspan="99">Sin datos</td></tr>'}</tbody></table>`;
}
