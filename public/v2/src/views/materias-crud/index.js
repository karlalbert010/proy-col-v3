import { crudPageBase } from '../../components/CrudPageBase.js';

export function materiasCrudView() {
  return crudPageBase({
    key: 'materiasCrud',
    title: 'Materias Base',
    description: 'CRUD de materias base (codigo, descripcion y estado activo).'
  });
}
