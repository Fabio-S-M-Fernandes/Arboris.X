const app = require('./src/app');
const { PORT } = require('./src/config');
const { closePool } = require('./src/store/postgres');

const server = app.listen(PORT, () => {
  console.log(`Arboris.X API iniciou na porta ${PORT}.`);
});

let stopping = false;
const shutdown = (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} recebido. Encerrando servidor...`);
  server.close(async (error) => {
    try {
      await closePool();
    } catch (poolError) {
      const code = /^[A-Z0-9]{5}$/.test(String(poolError.code || '')) ? poolError.code : 'UNKNOWN';
      console.error('[postgres-pool]', JSON.stringify({ event: 'close_failed', code }));
      process.exitCode = 1;
    }
    if (error) process.exitCode = 1;
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
