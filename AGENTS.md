# Arboris.X — Diretrizes de desenvolvimento

## Princípios

- Preserve a arquitetura, a identidade visual Arboris.X e as funcionalidades existentes.
- Antes de implementar, inspecione a estrutura e os componentes relacionados à tarefa.
- Faça alterações focadas; reutilize componentes, funções e estilos existentes e evite abstrações, arquivos ou dependências desnecessários.
- Não descarte alterações locais nem modifique áreas fora do escopo solicitado.
- Preserve usuários e dados existentes. Não apague nem reinicialize `backend/data/db.json`.
- Priorize responsividade, acessibilidade, legibilidade e animações performáticas; mantenha a paleta ambiental escura com verdes naturais e tons neutros.
- Execute apenas as verificações necessárias para validar a implementação.

## Arquitetura atual

- **Frontend:** React 19, Vite e React Router; aplicação em `frontend/src`, inicializada em `main.jsx` e roteada em `App.jsx`.
- **Autenticação e API:** `src/lib/api.js` concentra chamadas à API (`VITE_API_URL`, padrão `http://localhost:3001/api`); `src/lib/auth.js` gerencia a sessão local. A autenticação usa JWT.
- **Componentes:** `AutenticacaoArboris` reúne login/cadastro; `BootGate`, `InitialBootSplash` e `AuthTransitionController` controlam inicialização e transições; `HoloBackground` fornece a ambientação. `Dashboard` é atualmente uma página temporária.
- **Backend:** Node.js e Express. `backend/server.js` inicia o servidor; `src/app.js` configura middleware, health check, rotas e erros. Fluxo de negócio: `routes → controllers → services → repositories → store`.
- **Persistência:** `src/store/jsonStore.js` mantém usuários em `backend/data/db.json` (ou no caminho definido por `DATA_FILE`). Preserve esse arquivo e seus registros.
- **Configuração:** backend na porta `3001` por padrão; `FRONTEND_URL` configura origens CORS, e `JWT_SECRET` é obrigatório em produção. Configurações são carregadas pelo `src/config.js`.

## Comandos úteis

- Frontend (em `frontend/`): `npm run dev`, `npm run build`, `npm run lint`, `npm test`.
- Backend (em `backend/`): `npm run dev`, `npm run check`, `npm test`, `npm run test:smoke`.

Rode somente os comandos pertinentes à tarefa.
