# Arboris.X API

API Node.js/Express do Arboris.X, com autenticação e persistência local de usuários.

## Executar

```powershell
cd backend
npm install
npm run dev
```

O servidor fica em `http://localhost:3001`. A base local é criada automaticamente em `backend/data/db.json` e preserva os usuários cadastrados.

A arquitetura segue `routes → controllers → services → repositories → jsonStore`. Não há Supabase, ORM ou banco externo nesta fase.

## Rotas

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

A origem CORS permitida por padrão inclui `http://localhost:5000` (Vite) e `http://localhost:5174`. Defina `FRONTEND_URL` no `.env` do backend para a origem exata do frontend em produção. Para produção, defina `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_URL` e `DATA_FILE`; `JWT_SECRET` é obrigatório e não há fallback silencioso.
