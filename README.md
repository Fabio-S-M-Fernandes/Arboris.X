# ArborisX

Aplicacao React + Vite do ArborisX, usando Supabase para autenticacao e sessao.

## Tecnologias

- React
- Vite
- Supabase Auth
- React Router

## Configuracao

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_public
```

Use a URL principal do projeto Supabase, sem `/rest/v1/`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Autenticacao

Login, cadastro, sessao e aceite de termos usam `@supabase/supabase-js` diretamente no frontend.
