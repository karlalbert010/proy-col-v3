require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');

const port = process.env.PORT || 3000;
const dbMaxRetries = Number(process.env.DB_CONNECT_RETRIES || 10);
const dbRetryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 3000);

if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim().length < 10) {
  console.error('JWT_SECRET faltante o invalido. Defina JWT_SECRET en .env.');
  process.exit(1);
}

async function connectDatabaseWithRetry() {
  for (let attempt = 1; attempt <= dbMaxRetries; attempt += 1) {
    try {
      await prisma.$connect();
      console.log('Conexion a base de datos establecida.');
      return;
    } catch (error) {
      if (attempt === dbMaxRetries) {
        throw error;
      }

      console.error(
        `Conexion a base de datos fallida (intento ${attempt}/${dbMaxRetries}). Reintentando...`
      );
      await new Promise((resolve) => setTimeout(resolve, dbRetryDelayMs));
    }
  }
}

async function startServer() {
  try {
    await connectDatabaseWithRetry();

    app.listen(port, () => {
      console.log(`Servidor escuchando en puerto ${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar la API:', error);
    process.exit(1);
  }
}

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
