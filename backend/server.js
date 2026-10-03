const app = require('./src/app');
const { PORT } = require('./src/config');

const server = app.listen(PORT, () => {
  console.log(`Arboris.X API rodando em http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} recebido. Encerrando servidor...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
