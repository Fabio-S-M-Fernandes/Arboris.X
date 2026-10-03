# Arboris.X API

API Node.js/Express do dashboard de monitoramento ambiental.

## Executar

```powershell
cd backend
npm install
npm run dev
```

O servidor fica em `http://localhost:3001`. A base local é criada automaticamente em `backend/data/db.json` e não deve ser versionada.

## Rotas principais

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/resumo`
- `GET /api/dashboard/tendencias?periodo=24h&medida=temperatura`
- `GET /api/dashboard/sensores`
- `GET /api/dashboard/sensores/:id`
- `GET /api/dashboard/alertas`
- `PATCH /api/dashboard/alertas/:id/lida`
- `POST /api/dashboard/alertas/marcar-todas-lidas`
- `GET /api/dashboard/mapa-calor`

Para produção, defina `JWT_SECRET`, `FRONTEND_URL` e `DATA_FILE` em um arquivo `.env` próprio do backend. O armazenamento JSON é adequado para desenvolvimento e demonstração; em produção, substitua-o por PostgreSQL ou outro banco gerenciado.
