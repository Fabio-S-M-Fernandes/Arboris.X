# Arboris.X — API e autenticação

A arquitetura usa Supabase Auth para identidade, OAuth PKCE para Google e PostgreSQL para perfil, desafio OTP e autorização de sessão. O serviço Express valida a sessão Supabase e aplica os limites de autorização. A implementação JWT própria foi removida; `/api/auth/*` responde sempre HTTP 410. O arquivo histórico `backend/data/db.json` permanece preservado, fora do fluxo de execução.

## Executar localmente

```powershell
cd backend
npm install
npm run dev
```

O backend atende em `http://localhost:3001`. Para usar o OTP localmente, configure no arquivo privado `.env` um remetente Gmail com senha de aplicativo. Não inclua senhas ou tokens em commits, no frontend ou no chat. O serviço de e-mail falha de forma fechada quando o provedor escolhido não está configurado.

## Fluxo ativo

- Supabase Auth: cadastro, confirmação de e-mail, login por senha, Google OAuth/PKCE e recuperação de senha.
- Express: `/api/session/me`, `challenge`, `verify`, `resend` e `logout`; todos exigem identidade Supabase. OTP continua válido por cinco minutos, com cinco tentativas e reenvio após sessenta segundos.
- PostgreSQL: perfis, sessões autorizadas, desafios, limites de envio e eventos de segurança.
- Termos: cadastro e retorno Google carregam as versões atuais; o backend grava o aceite idempotentemente ao iniciar o primeiro desafio autenticado. Isso é evidência técnica do aceite declarado, não uma avaliação jurídica do texto.

As rotas `/api/auth/*` não aceitam login, cadastro ou tokens antigos. O smoke test utiliza identidades e banco simulados para verificar `/api/session/*`, sem enviar e-mails ou alterar dados remotos. O arquivo `db.json` e sua cópia privada foram preservados para recuperação histórica.

## Envio de e-mails

O serviço central mantém os templates HTML e texto simples em português, com escape de dados.

### Desenvolvimento local — Gmail SMTP

Configure `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASSWORD` (senha de aplicativo Gmail) e `EMAIL_FROM` com o mesmo endereço autenticado. A conexão exige STARTTLS e validação de certificado TLS. Não são aceitas portas 465/25 nem TLS inseguro.

### Render — Gmail API

Configure `EMAIL_PROVIDER=gmail_api` (também aceita `gmail-api`), `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL` e `EMAIL_FROM`. O remetente em `EMAIL_FROM` deve corresponder a `GMAIL_SENDER_EMAIL`. Essas variáveis ficam exclusivamente nos segredos do Render. A credencial é distinta do OAuth usado pelos participantes para entrar com Google.

O backend renova o access token por HTTPS e envia via Gmail API com o escopo mínimo `https://www.googleapis.com/auth/gmail.send`. A renovação e o fluxo de envio com HTTP simulado podem ser validados sem entregar mensagens. Antes de depender do serviço, valide uma entrega real para um destinatário autorizado. Falhas não ativam outro provedor automaticamente.

O mesmo provedor atende os códigos OTP e o alerta de novo acesso enviado após a primeira autorização de uma sessão Supabase. A repetição de OTP na mesma sessão não duplica esse alerta; falha de entrega é registrada sem reverter a autenticação.

Configuração manual no Google Cloud para o remetente:

1. Habilite **Gmail API** no projeto Google Cloud que será usado somente para o remetente.
2. Configure a tela OAuth como **External** e adicione a conta remetente como test user enquanto estiver em Testing.
3. Adicione o escopo `gmail.send`. Ele é classificado como sensível e exige verificação OAuth para uso público; conclua a verificação solicitada pelo Google antes de depender do refresh token em produção. A verificação também exige homepage, Termos e Política em domínio cuja propriedade possa ser comprovada no Search Console.
4. Crie um OAuth client Web separado do client de login dos participantes. Se usar OAuth Playground para gerar o token, registre `https://developers.google.com/oauthplayground` como redirect URI, habilite “Use your own OAuth credentials”, selecione somente `gmail.send`, autorize a conta definida em `GMAIL_SENDER_EMAIL` e peça acesso offline para obter refresh token.
5. Cadastre os quatro valores de Gmail como segredos do serviço Render. Não copie o refresh token ao Vite nem o inclua em arquivos rastreados.
6. Em Testing, há limite de 100 test users e a autorização do remetente expira após sete dias para esse escopo. Para manter o serviço público, publique e verifique o consentimento. Os participantes do Arboris.X não consentem a credencial de envio; o consentimento do remetente é independente do OAuth de login.

Como o projeto não vai comprar um domínio agora, a verificação pública do cliente Gmail API é um bloqueio operacional. Um endereço compartilhado `vercel.app` ou `onrender.com` não comprova propriedade do domínio. Um token de remetente em Testing pode servir apenas para uma janela temporária de validação e precisará ser renovado; não conte com isso como entrega duradoura.

Confirmação de cadastro e recuperação de senha são enviadas pelo Supabase Auth usando seu SMTP configurado no painel Supabase. Esse caminho é separado do serviço de OTP do backend e ainda precisa de validação de entrega real. Não desative confirmação de e-mail para contornar falhas.

### Configurar conta e login Google dos participantes

O login ativo usa Supabase Auth, não GIS no navegador nem ID token enviado ao endpoint JWT legado. Configure o provedor Google em **Supabase → Authentication → Sign In / Providers**, usando um OAuth client separado para esse propósito. Em **Google Cloud → OAuth consent screen**, configure o público como External e conclua as etapas de marca/verificação solicitadas antes de produção. Em Testing, somente usuários cadastrados como test users entram e as autorizações temporárias expiram. Adicione no Supabase os callback URLs reais do projeto e cadastre os redirects do frontend, inclusive `/auth/callback` e `/auth/confirm`.

## Rate limits e migrações

Em produção, os contadores Express usam PostgreSQL e chaves HMAC, com expiração e limpeza periódica. As migrations `002_require_active_auth_session.sql` e `003_persistent_rate_limits.sql` já foram aplicadas ao projeto principal; os testes reais de RLS com usuários comuns ainda estão pendentes. Desenvolvimento usa memória por padrão; configure `RATE_LIMIT_STORAGE=postgres` no `.env` local e reinicie a API para usar a tabela persistente. Falha do banco nesse armazenamento bloqueia a requisição com 503. Os limites nativos de Supabase Auth continuam separados e devem ser conferidos no painel.

Não reaplique migrations já executadas. Antes de futuras mudanças remotas, confirme backup e autorização específica. A restauração integral do backup anterior ainda não foi testada em ambiente isolado.

## Configuração e hospedagem

- Vercel serve apenas o frontend compilado e seus cabeçalhos de segurança.
- Render executa a API HTTPS; a camada gratuita bloqueia SMTP em 25, 465 e 587 e seu sistema de arquivos é efêmero.
- Supabase Auth/PostgreSQL são a única fonte de identidade e persistência em execução. O JSON local é somente arquivo histórico preservado.
- Configure `FRONTEND_URL` com as origens HTTPS exatas, `VITE_API_URL` com a URL HTTPS pública da API, `DATABASE_URL` e `OTP_SECRET` forte. Nunca inclua segredos no bundle.
- `TRUST_PROXY_HOPS=1` só é adequado quando existe exatamente um proxy controlado antes do Render. Confira a topologia real antes de alterar esse valor.
- O health check `GET /api/health` é liveness e não expõe a configuração ou estado de credenciais.

## Verificações

```powershell
cd frontend
npm run build
npm run lint
npm test
cd ../backend
npm run check
npm test
npm run test:smoke
```

Testes simulados validam MIME, timeout, erros e regras locais; não comprovam entrega Gmail, SMTP Supabase, Google OAuth humano ou aplicação RLS no banco remoto.
