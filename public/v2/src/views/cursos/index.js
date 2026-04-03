import { crudPageBase } from '../../components/CrudPageBase.js';

export function cursosView() {
  return crudPageBase({
    key: 'cursosCrud',
    title: 'Cursos',
    description: 'CRUD de cursos (nombre y anio lectivo).'
  });
}
