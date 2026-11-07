# Arboris.X API

API Node.js/Express do dashboard de monitoramento ambiental.

## Executar

```powershell
cd backend
npm install
npm run dev
```

O servidor fica em `http://localhost:3001`. A base local é criada automaticamente em `backend/data/db.json` e permanece como persistência desta fase.

A arquitetura segue `routes → controllers → services → repositories → jsonStore`. Não há Supabase, ORM ou banco externo nesta fase.

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

Parâmetros aceitos incluem `regiao`, `status`, `busca`, `pagina`, `limite`, `periodo` e `medida`; entradas inválidas retornam `400`. Alertas de alteração exigem `Authorization: Bearer <token>` e retornam `401` sem token.

A origem CORS permitida por padrão inclui `http://localhost:5000` (Vite) e `http://localhost:5174`. Defina `FRONTEND_URL` no `.env` do backend para a origem exata do frontend em produção. Para produção, defina `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_URL` e `DATA_FILE`; `JWT_SECRET` é obrigatório e não há fallback silencioso.
