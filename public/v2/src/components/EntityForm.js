export function entityForm({ fields, values }) {
  return `<div class="grid two">${fields
    .map((f) => {
      const v = values?.[f.name];
      if (f.type === 'select') {
        const opts = (f.options || [])
          .map((o) => `<option value="${o.value}" ${String(v ?? '') === String(o.value) ? 'selected' : ''}>${o.label}</option>`)
          .join('');
        return `<div><label>${f.label}</label><select id="${f.domId}">${opts}</select></div>`;
      }
      if (f.type === 'checkbox') {
        return `<div><label>${f.label}</label><input id="${f.domId}" type="checkbox" ${v ? 'checked' : ''} /></div>`;
      }
      return `<div><label>${f.label}</label><input id="${f.domId}" type="${f.type || 'text'}" value="${v ?? ''}" /></div>`;
    })
    .join('')}</div>`;
}
