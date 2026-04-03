import { crudPageBase } from '../../components/CrudPageBase.js';

export function usuariosView() {
  return crudPageBase({
    key: 'usuariosCrud',
    title: 'Usuarios',
    description: 'CRUD de usuarios y roles operativos.'
  });
}
