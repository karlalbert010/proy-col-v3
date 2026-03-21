export function statusBadge(value){
  const v=String(value||'').toUpperCase();
  if(v.includes('OK')||v.includes('COMPLETO')||v.includes('ACTIVO')) return `<span class="status ok">${value}</span>`;
  if(v.includes('PEND')) return `<span class="status warn">${value}</span>`;
  return `<span class="status bad">${value||'SIN ESTADO'}</span>`;
}
