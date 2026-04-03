import { crudPageBase } from '../../components/CrudPageBase.js';

export function aniosView() {
  return crudPageBase({
    key: 'aniosCrud',
    title: 'Anios Lectivos',
    description: 'CRUD base de anios lectivos con filtros por anio y estado.'
  });
}
