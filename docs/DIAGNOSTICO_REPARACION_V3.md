# Diagnostico Reparacion V3

Fecha: 2026-04-04  
Workspace: `C:\Users\carlo\Desktop\VSCODE\cole-api -v3`

## Problemas detectados

1. Flujo de inicializacion incompleto.
- Causa: no existia un comando unico para `prisma + seed auth + seed base`.
- Riesgo: VPS con DB vacia o con datos parciales.
- Correccion aplicada: se agregaron scripts `db:generate`, `db:push`, `db:init`, `seed:base`, `seed:demo`.

2. Seed de autenticacion demasiado minimo.
- Causa: `seed-auth-user.js` creaba un solo usuario.
- Riesgo: inconsistencia para pruebas de roles y login inicial.
- Correccion aplicada: `seed-auth-user.js` ahora crea de forma idempotente:
  - `admin` / `admin123` (ADMIN)
  - `director` / `1234` (DIRECTIVO)
  - `profesor` / `1234` (DOCENTE)
  - permite override por variables de entorno.

3. Guardado de sesion frontend no robusto con token vencido/invalido.
- Causa: el cliente no invalidaba sesion automaticamente ante `401`.
- Riesgo: UX confusa (pantalla cargada, pero API rechaza llamadas).
- Correccion aplicada:
  - `api.js` limpia token y emite evento `auth:expired` en `401`.
  - `main.js` valida sesion en bootstrap con `GET /auth/me`.
  - redireccion automatica a login cuando la sesion no es valida.

4. Falta de endpoint de validacion de sesion.
- Causa: modulo auth solo tenia login.
- Riesgo: frontend no podia confirmar token al iniciar.
- Correccion aplicada: nuevo endpoint protegido `GET /auth/me`.

5. Variables y puertos con potencial confusion dev/prod.
- Causa: `docker-compose.dev.yml` tenia fallback DB `3307` mientras prod usa `3312`.
- Riesgo: conexion a DB equivocada durante pruebas.
- Correccion aplicada: fallback dev alineado a `3312`.

6. Falta de hardening de secreto JWT.
- Causa: la API podia iniciar sin validar secret fuerte.
- Riesgo: autenticacion insegura o inconsistente.
- Correccion aplicada: `server.js` ahora corta arranque si `JWT_SECRET` falta o es invalido.

## Estado de consistencia actual

- Prisma: modelo `Usuario` existe y es coherente con login y seeds.
- Auth backend: bcrypt + JWT + `/auth/me`.
- Rutas API: protegidas por `authMiddleware` (excepto `/health` y `/auth/login`).
- Frontend: sin sesion valida muestra login; con `401` expulsa sesion.
- Docker/env: coherentes para `cole_db_v3`, `root/root`, puertos `3003` y `3312`.

## Pendientes manuales (esperados)

1. En VPS, si el volumen MySQL fue creado con otra clave, cambiar `.env` no la actualiza automaticamente.
- Accion: recrear volumen o resetear password root dentro de MySQL.

2. Confirmar que el reverse proxy (Caddy/Nginx) apunta al puerto correcto del API.

