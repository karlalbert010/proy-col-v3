# Setup Local y VPS (Hostinger)

## 1) Setup local (Windows PowerShell)

Ubicacion:
`C:\Users\carlo\Desktop\VSCODE\cole-api -v3`

```powershell
cd "C:\Users\carlo\Desktop\VSCODE\cole-api -v3"
copy .env.example .env
docker compose up -d --build
docker compose exec -T api npm run db:init
```

Verificaciones:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3003/health

$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3003/auth/login" -ContentType "application/json" -Body $body
```

Frontend:
- URL: `http://localhost:3003/v2/index.html`

## 2) Flujo GitHub

```powershell
cd "C:\Users\carlo\Desktop\VSCODE\cole-api -v3"
git status
git add .
git commit -m "fix(v3): auth/session hardening + db init + seed + docs"
git push origin main
```

## 3) Setup limpio en Hostinger VPS (Ubuntu)

```bash
cd ~/apps
git clone https://github.com/karlalbert010/proy-col-v3.git
cd proy-col-v3
cp .env.example .env
```

Editar `.env` (produccion):
- `JWT_SECRET` fuerte.
- `MYSQL_ROOT_PASSWORD` definida (ejemplo: `root` para pruebas).
- `MYSQL_DATABASE=cole_db_v3`

Levantar:

```bash
docker compose up -d --build
docker compose ps
```

Inicializar DB:

```bash
docker compose exec api npm run db:init
```

## 4) Checklist de validacion

Health:

```bash
curl -i http://localhost:3003/health
```

Login:

```bash
curl -i -X POST http://localhost:3003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Ruta privada sin token (debe dar 401):

```bash
curl -i http://localhost:3003/alumnos
```

Ruta privada con token (debe dar 200):

```bash
TOKEN="<TOKEN_DEL_LOGIN>"
curl -i http://localhost:3003/alumnos -H "Authorization: Bearer $TOKEN"
```

Tablas y usuario admin:

```bash
docker compose exec db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "USE cole_db_v3; SHOW TABLES; SELECT id,username,rol,activo FROM Usuario WHERE username='admin';"
```

## 5) Nota clave sobre password root en VPS

En MySQL Docker, `MYSQL_ROOT_PASSWORD` se aplica al crear el volumen por primera vez.  
Si cambias `.env` despues, no cambia automaticamente la clave del root existente.

Opciones:
1. Resetear password root dentro de MySQL.
2. Borrar volumen y recrear (pierde datos).
