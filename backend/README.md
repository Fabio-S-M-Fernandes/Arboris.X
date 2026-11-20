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
- Express: `/api/session/me`, `challenge`, `verify`, `resend` e `logout`; todos exigem identidade Supabase. OTP continua válido por cinco minutos, com cinco tentativas e reenvio após sessenta segundos. Com a migration 004 aplicada e a opção ativada, a verificação OTP pode registrar um navegador confiável mediante escolha explícita; a reentrada ainda exige login Supabase e sessão Auth válida.
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

Os modelos locais em `supabase/email-templates/` são propostas para **Confirm signup** e **Reset password** no painel Supabase; não alteram o provedor nem a configuração remota. Antes de copiá-los, confirme Site URL e URLs de redirecionamento. O modelo de cadastro usa `TokenHash` e mantém a confirmação por clique em `/auth/confirm`; o de recuperação usa o link nativo `ConfirmationURL`. Os e-mails OTP e de alerta são gerados pelo backend e continuam usando a Gmail API em produção. Não há código OTP na interface web para um botão de cópia; o campo aceita colagem e preenchimento automático.

### Configurar conta e login Google dos participantes

O login ativo usa Supabase Auth, não GIS no navegador nem ID token enviado ao endpoint JWT legado. Configure o provedor Google em **Supabase → Authentication → Sign In / Providers**, usando um OAuth client separado para esse propósito. Em **Google Cloud → OAuth consent screen**, configure o público como External e conclua as etapas de marca/verificação solicitadas antes de produção. Em Testing, somente usuários cadastrados como test users entram e as autorizações temporárias expiram. Adicione no Supabase os callback URLs reais do projeto e cadastre os redirects do frontend, inclusive `/auth/callback` e `/auth/confirm`.

## Rate limits e migrações

Em produção, os contadores Express usam PostgreSQL e chaves HMAC, com expiração e limpeza periódica. As migrations `002_require_active_auth_session.sql` e `003_persistent_rate_limits.sql` já foram aplicadas ao projeto principal. P01 foi encerrada somente para os fluxos e recursos reais testados com A/B; outros endpoints exigem validação própria. Desenvolvimento usa memória por padrão; configure `RATE_LIMIT_STORAGE=postgres` no `.env` local e reinicie a API para usar a tabela persistente. Falha do banco nesse armazenamento bloqueia a requisição com 503. Os limites nativos de Supabase Auth continuam separados e devem ser conferidos no painel.

### Dispositivos confiáveis (preparado localmente, desativado por padrão)

`004_trusted_devices.sql` acrescenta validade e revogação à tabela já existente. Registros anteriores não recebem `trusted_at` e não podem dispensar OTP. A migration cria um gatilho que revoga confiança quando a senha ou o e-mail em `auth.users` muda. O verificador de 256 bits é gerado pelo servidor; só seu SHA-256 fica no banco. O cookie `__Host-arboris-trusted` tem `Secure`, `HttpOnly`, `SameSite=None` e expira em `TRUSTED_DEVICE_DAYS` (padrão 30, máximo 90). A cada uso bem-sucedido o servidor troca o valor do cookie sem estender a data final. A prova é vinculada ao usuário e jamais substitui o JWT Supabase. `/challenge` só autoriza a sessão adicional após checar usuário, sessão Auth ativa, origem permitida e verificador válido; `/me` e a Data API continuam exigindo `authorized_sessions` e RLS. O registro exige uma sessão ainda autorizada e limita cada conta a 20 dispositivos ativos. `/trusted-devices` lista apenas os registros do usuário e `DELETE /trusted-devices/:id` permite revogação após autenticação adicional. Um logout revoga a sessão, mas mantém a escolha de confiança para o próximo login; a revogação explícita do dispositivo e a redefinição de senha a retiram.

Para aplicar futuramente: confirmar backup e destino, revisar o SQL, executar **somente** a migration 004 com autorização específica e conferir colunas, índices, gatilho, RLS e privilégios. Só depois configurar `TRUSTED_DEVICE_ENABLED=true` no backend e reiniciá-lo; não há mudança no frontend por ambiente. Se falhar, manter `TRUSTED_DEVICE_ENABLED=false` para exigir OTP. Reversão funcional: desligar a opção e reiniciar a API. Se for preciso retirar o gatilho, em transação e após nova revisão, usar `drop trigger if exists on_auth_identity_change_revoke_trusted_devices on auth.users; drop function if exists public.revoke_trusted_devices_after_identity_change();` e preservar as colunas e registros para investigação. Não executar essas ações no banco principal sem aprovação.

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
