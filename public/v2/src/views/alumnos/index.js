import { crudPageBase } from '../../components/CrudPageBase.js';

export function alumnosView() {
  return crudPageBase({
    key: 'alumnosCrud',
    title: 'Alumnos',
    description: 'CRUD de alumnos (apellido, nombre, DNI y activo).'
  });
}
