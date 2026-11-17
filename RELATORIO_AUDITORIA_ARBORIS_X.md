# Arboris.X — Auditoria Técnica Global

**Projeto:** Arboris.X. **Ambiente:** Windows, diretório local `C:\xampp\htdocs\Arboris.X`, frontend de desenvolvimento em `http://localhost:5000`, backend em `http://localhost:3001`, Supabase remoto configurado pelo projeto. Preview temporário do bundle em `127.0.0.1:5002` apenas para medição local.

**Execução:** 14/11/2026, aproximadamente 18h22–__END_LOCAL__ (America/Sao_Paulo; UTC−03). **Commit base:** `f80b153`; árvore de trabalho com alterações locais anteriores, inclusive arquivos ainda não rastreados. A auditoria abrange essa árvore, não apenas o commit.

**Escopo:** aplicação existente, APIs, identidade, autorização adicional, PostgreSQL, RLS, configurações, dependências, credenciais, interface, acessibilidade básica, navegação, animações e preparação para produção. O Dashboard ambiental futuro não foi considerado defeito.

**Método e preservação:** leitura integral do AGENTS.md e do pedido; revisão estática; suítes existentes; HTTP real; contas sintéticas identificadas por marcador exclusivo da auditoria; PostgreSQL e Supabase Auth reais; navegador real; injeção de falhas e entrega de e-mail simulada somente em processos/contextos isolados. Nenhuma migração foi aplicada nesta auditoria. Nenhum código de produto, credencial ou usuário preexistente foi alterado. Não houve commit, push ou deploy. Os arquivos `.env`, `.env.local` e `backend/data/db.json` mantiveram seus hashes. Todas as contas criadas pela auditoria foram removidas após os testes, junto dos seus registros. O baseline deste lote tinha zero usuários no Auth e no JSON; isto não é uma afirmação sobre o histórico do projeto.

## 1. Sumário executivo

**O projeto funciona parcialmente no ambiente local e ainda não está pronto para publicação.** O erro anterior de senha PostgreSQL `28P01` não reapareceu. As sete tabelas previstas existem, com RLS ativo. O login por senha de contas sintéticas confirmadas administrativamente produziu sessões Supabase reais. O backend respondeu 403 antes do código, 200 após a confirmação e 403 depois da revogação pelo Arboris.X. A instância já aberta na porta 3001 também respondeu 403 a um token real sem autorização adicional.

Foi encontrada uma falha **ALTA** na revogação pela Data API: depois de `signOut` global no Supabase remover a sessão de `auth.sessions`, o JWT anterior ainda leu o próprio perfil pela REST API. A função RLS consulta `authorized_sessions`, mas não confirma que a sessão Auth continua existente. A revogação pelo endpoint Arboris.X bloqueou corretamente o acesso; o problema é a divergência entre revogação nativa e autorização adicional. Não foi demonstrado acesso a dados de outro usuário nem obtenção inicial de acesso sem OTP.

O PostgreSQL atual conecta **sem TLS**. Uma conexão separada com validação TLS, equivalente à opção de produção do código, falhou com `SELF_SIGNED_CERT_IN_CHAIN`. São problemas distintos: conectividade funcional não significa transporte seguro nem prontidão do certificado.

Há ainda respostas HTTP 500 a identificadores OTP malformados, ausência de persistência do aceite em `terms_acceptances`, documentação de privacidade desatualizada, ausência de CSP do frontend na configuração versionada, dependências vulneráveis e persistência legada incompatível com armazenamento efêmero do Render.

Build, lint, verificação de sintaxe, 24 testes unitários existentes e smoke legado passaram. O primeiro processo do build terminou anormalmente no Windows apesar de gerar os arquivos; uma repetição isolada terminou com código 0. A maior parte das verificações de interface passou, inclusive quatro engines/navegadores executados. O overflow horizontal em 375/320 px foi medido e reproduzido.

**Não comprovado neste lote:** entrega Resend/SMTP/Gmail, cadastro e confirmação por e-mail de ponta a ponta, recuperação completa por e-mail e login Google humano até o Dashboard. O destinatário autorizado foi solicitado e não foi confirmado durante a execução. Nenhuma mensagem real foi enviada. O fluxo visual até o Dashboard foi testado separadamente com respostas simuladas e não foi contabilizado como autenticação externa real.

## 2. Inventário do projeto

### Arquitetura e arquivos

| Camada | Implementação observada |
|---|---|
| Frontend | React 19, Vite 8, React Router 6, Lucide, CSS e Tailwind; `frontend/src/main.jsx` com StrictMode; `App.jsx` com BrowserRouter no bootstrap |
| Backend | Express 5; `server.js` → `src/app.js`; CORS, Helmet, JSON de 16 KB, HTTPS obrigatório em produção, rate limiting por rota |
| Identidade principal | `frontend/src/lib/supabase.js`; PKCE, persistência de sessão, refresh automático, `detectSessionInUrl: false`; backend consulta `auth.getUser` e valida claims |
| Autorização principal | `session.routes.js`, `supabaseSession.js`, `session-authorization.service.js`, PostgreSQL; vínculo `user_id` + `session_id` |
| Legado ativo | `auth.routes.js`, `auth.controller.js`, `auth.service.js`, `verification.service.js`, `user.repository.js`, `jsonStore.js`; JWT HS256, bcrypt, OTP em memória, revogação em arquivo |
| E-mail | `email.service.js` monta texto/HTML; envio efetivo por `resend.service.js`; configuração/transporte Nodemailer residual no arquivo |
| Google legado | `google-identity.service.js` verifica ID token, nonce, issuer, audience e e-mail; rotas antigas continuam acessíveis |
| Banco | `backend/supabase/migrations/001_auth_profiles_and_sessions.sql`; uma migração, sete tabelas públicas; nenhum ledger próprio de migrações identificado |
| Hospedagem | `frontend/vercel.json`, `render.yaml`, `.htaccess` na raiz e backend; nenhuma publicação executada |
| Documentação | `AGENTS.md`, `backend/README.md`, exemplos de ambiente; AGENTS/README ainda descrevem prioritariamente a arquitetura JSON anterior |
| Temporários | `.tmp/auth-final`, `auth-redesign`, `auth-review`, cache npm e script de revisão anterior; evidências atuais em `.tmp/auditoria*` |
| Dados | `backend/data/db.json`, ignorado pelo Git; zero usuários no momento desta auditoria; a aplicação ainda pode gravá-lo |

**Componentes inventariados:** `AutenticacaoArboris`, `GoogleSignInButton`, `AuthCallback`, `AuthConfirm`, `RequireSession`, `DashboardPage`, `BootGate`, `InitialBootSplash`, `AuthTransition`, `AuthTransitionController`, `HoloBackground`, `TermosModal`, `PrivacidadeModal`. `VerificationPanel`, `AuthIdentity`, `AcabamentoCard`, folhas e campos auxiliares ficam dentro de componentes existentes.

**Rotas frontend reais:** `/`, `/login`, `/cadastro`, `/auth/callback`, `/auth/confirm`, `/dashboard`; wildcard redireciona para `/`. Recuperação é acionada no formulário de login; redefinição usa `/auth/callback?flow=recovery`. OTP e aceite Google são estados da tela, não rotas independentes. Não existe página 404 específica nem `/recuperar-senha` independente. Isso é uma decisão atual de navegação, não um endpoint omitido.

**Tabelas reais:** `profiles`, `terms_acceptances`, `authorized_sessions`, `login_challenges`, `otp_send_limits`, `known_devices`, `security_events`. Perfis/desafios/sessões/termos/dispositivos referenciam `auth.users`. Eventos usam `ON DELETE SET NULL`; os outros registros vinculados usam cascata. Índices e restrições foram coletados do catálogo, além de colunas, tipos, defaults e políticas. A criação de perfil pelo trigger foi exercitada nas fixtures.

### Classificação das funcionalidades

| Funcionalidade | Estado | Limite da evidência |
|---|---|---|
| Login/cadastro visual | IMPLEMENTADA E VALIDADA | Renderização, validações básicas e navegação; entrega externa separada |
| Login Supabase por senha | IMPLEMENTADA E VALIDADA | Identidade real de fixture; confirmação administrativa usada apenas no preparo da conta |
| OTP e autorização PostgreSQL | IMPLEMENTADA E VALIDADA | Regras de código, HMAC, expiração, reenvio, concorrência, autorização e revogação local; envio simulado |
| Cadastro Supabase completo | IMPLEMENTADA, MAS NÃO VALIDADA | Sem destinatário confirmado para enviar e concluir confirmação |
| Confirmação `token_hash`/`verifyOtp` | IMPLEMENTADA PARCIALMENTE | Rejeição real de token inválido e clique explícito validados; template remoto/sucesso real pendentes |
| Google PKCE | IMPLEMENTADA, MAS NÃO VALIDADA INTEGRALMENTE | Provedor habilitado e redirecionamento real ao Google; login humano pendente |
| Recuperação/redefinição | IMPLEMENTADA PARCIALMENTE | Código e atualização real de senha de fixture; percurso do e-mail não executado; não há campo de confirmação da nova senha |
| Logout Arboris | IMPLEMENTADA E VALIDADA | Backend e RLS bloqueiam após revogação explícita; interface validada com API simulada |
| Revogação nativa + RLS | IMPLEMENTADA PARCIALMENTE | Falha confirmada A107 |
| Termos persistidos/versionados | IMPLEMENTADA PARCIALMENTE | Checkbox e metadata existem; tabela prevista não recebe aceite no fluxo testado |
| Dispositivos/alertas | IMPLEMENTADA PARCIALMENTE | Ativos no legado, testados por smoke com e-mail simulado; tabela Supabase sem uso no fluxo principal |
| Identidade Google vinculada | IMPLEMENTADA, MAS NÃO VALIDADA INTEGRALMENTE | API oficial Supabase e legado existem; falta teste humano com identidades isoladas |
| Dashboard temporário | IMPLEMENTADA E VALIDADA | Shell atual e saída; não inclui funcionalidades ambientais futuras |
| Monitoramento/backups operacionais | IMPLEMENTADA PARCIALMENTE / NÃO VALIDADA | Logs locais existem; alertas, retenção e restauração externa não comprovados |
| Cloudflare Turnstile | REMOVIDA INTENCIONALMENTE | Nenhuma referência ativa no código da aplicação nem requisição ao widget nos cenários executados |

**Duplicações e código residual:** dois clientes/fluxos Google, dois mecanismos OTP, dois modelos de sessão, dois armazenamentos de usuários e utilitários locais de sessão anteriores. `getTransporter` e configuração SMTP local permanecem, enquanto os envios atuais seguem Resend. Isso aumenta a superfície de manutenção; não foi removido na auditoria.

### Ambiente e configuração

Node **26.7.0**, npm **11.19.0**. As árvores npm instaladas não acusaram dependências faltantes/inválidas. Não há versão Node fixada por `engines`, `.nvmrc` ou configuração equivalente encontrada no inventário. Não foi feito `npm install` porque as dependências estavam presentes; instalação limpa em outro ambiente continua pendente.

__ENV_TABLE__

As URLs e chaves públicas Supabase do frontend/backend coincidem. Os segredos JWT/OTP satisfazem o comprimento mínimo de 32 bytes; isto não mede entropia. Não havia variáveis duplicadas nem marcadores de exemplo nos envs analisados. `SUPABASE_SECRET_KEY` existe, mas não é usado pelas rotas da aplicação; foi usado exclusivamente pela auditoria para gerir suas fixtures. `GOOGLE_CLIENT_ID` ainda é usado pelo legado. Variáveis SMTP locais não estão presentes e não são necessárias para o caminho Resend atual; isso não informa o estado do SMTP configurado dentro do painel Supabase.

O banco usa hostname de pooler e porta 5432, compatíveis com Session pooler. A senha da URI foi analisada sem exposição: não vazia, sem placeholder e sem URL aninhada. Nenhuma credencial foi corrigida ou rotacionada.

## 3. Resumo quantitativo

__COUNTS__

**Critério:** uma linha da matriz é uma verificação distinta. Os 24 testes unitários são contados individualmente; suas suítes não são somadas novamente. O smoke legado é um cenário composto contado uma vez, sem somar cada assertion. Build, lint, check, sondagens HTTP, verificações de catálogo e configurações são verificações de engenharia, não todos testes unitários. Os 32 pares rota/resolução são 32 verificações distintas. Reexecuções para corrigir seletores do harness, esclarecer o término anormal do build e isolar o relógio do OTP não aumentam a contagem. Revisões estáticas e itens não executáveis constam separadamente.

O primeiro ensaio OTP usou `now()-1s` do PostgreSQL, enquanto o relógio do banco estava cerca de **1,9 s** adiantado em relação ao Node. A085–A088 foram repetidos isoladamente com timestamps inequivocamente anteriores aos dois relógios. Os resultados finais passaram. A evidência original e o motivo do reteste ficaram registrados, sem atribuir essa falha do preparo ao produto.

## 4. Resultados por área

__AREA_TABLE__

Áreas com revisão estática ou dependências humanas permanecem PARCIAL/PENDENTE mesmo quando os testes executados daquela área passaram. A contagem por área é a atribuição primária de cada linha; um teste de API que também verifica autorização não é contado novamente como teste RLS.

## 5. Matriz completa de testes

A evidência detalhada local está em `.tmp/auditoria-resultados.json` e `.tmp/auditoria-ui-resultados.json`, ambos sanitizados. A matriz abaixo é autossuficiente para identificar cenário, procedimento, expectativa, resultado e modalidade. Referências de arquivo adicionais aparecem nas seções de problemas e APIs.

__MATRIX__

### Comandos, códigos de saída e cobertura

| Comando | Resultado | Observação |
|---|---|---|
| Frontend `npm run build` | Segunda execução: exit 0, 4,74 s | Primeira gerou bundle em 6,19 s, mas o processo retornou `-1073741819` no Windows; causa do término do host não determinada |
| Frontend `npm run lint` | exit 0 | Sem violações reportadas |
| Frontend `npm test` | exit 0; 13/13; 2 arquivos; 14,70 s | JSDOM/utilitários; zero ignorados |
| Backend `npm run check` | exit 0 | Verificação de sintaxe dos arquivos declarados no script |
| Backend `npm test` | exit 0; 11/11; 1,16 s | Validação, HTTPS, erro PG seguro, templates e OTP legado; zero ignorados |
| Backend `npm run test:smoke` | exit 0 | App Express local, JSON temporário, SMTP/Google simulados nos cenários positivos; senha, OTP, dispositivos, link legado, logout e rate limit |
| `npm ls --depth=0 --json` | exit 0 em ambos | Árvore instalada válida |
| `npm audit --json` | exit 1 em ambos | Vulnerabilidades listadas na seção 8 |
| `npm audit --omit=dev --json` | Backend 0; frontend 1 | Zero no backend de produção; duas moderadas no frontend de produção |
| `npm outdated --json` | Pacotes com atualização disponível | Nenhuma atualização automática |
| Harness HTTP/PG | Concluído | Falhas de produto registradas por linha; nenhum segredo/OTP persistido |
| Playwright Python | Cenários executados conforme matriz | Seletores do harness corrigidos e execução retomada; não representa execução de uma suíte E2E externa completa |

Não há infraestrutura de cobertura percentual configurada identificada. **Linhas/funções/branches/statements: NÃO MEDIDOS.** Os testes existentes concentram-se em utilitários e no legado. As novas evidências de RLS/OTP PostgreSQL são harnesses de auditoria em `.tmp`, ainda não uma suíte de CI permanente. `test:watch`, `dev` e `start` são processos persistentes; não foram tratados como suítes adicionais. A instância existente foi usada e instâncias isoladas foram encerradas após os testes.

## 6. Relatório de todas as APIs

Há **17 endpoints de negócio/health** no inventário. OPTIONS é atendido pelo middleware CORS, não por controller próprio. O roteador devolve 404 a método/caminho não implementado; isso foi observado, sem exigir artificialmente 405.

| Método e rota | Autenticação/autorização | Entrada e dependências | Cenários e respostas reais | Resultado |
|---|---|---|---|---|
| GET `/api/health` | Pública | Sem corpo; Express | 200, JSON; origem proibida 403; PUT 404; 10 amostras locais | APROVADO; não testa dependências |
| POST `/api/auth/register` | Pública; limite 5/15min/IP | nome, email, senha, termosAceitos; JSON/bcrypt/OTP/e-mail | {}→422; smoke válido→201 sem JWT, OTP necessário; 6º pedido→429 | PARCIAL: positivo legado com e-mail simulado |
| POST `/api/auth/login` | Pública; 12/15min/IP | email, senha; JSON/bcrypt | {}→422; JSON quebrado→400; >16 KB→413; senha errada→401; smoke válido→200 com desafio | PARCIAL: legado isolado |
| POST `/api/auth/verify` | Desafio secreto + OTP; 30/15min/IP | challengeId, code; googleCredential opcional | {}→422; incorreto→400; correto→200; reutilizado→400 no smoke | APROVADO no cenário isolado |
| POST `/api/auth/resend` | Desafio; 10/15min/IP | challengeId | inexistente→400; intervalo/invalidação exercitados em teste unitário | PARCIAL: entrega real pendente |
| POST `/api/auth/cancel` | Desafio; 20/15min/IP | challengeId | inexistente→200 idempotente | APROVADO no cenário executado |
| POST `/api/auth/google/nonce` | Pública; 10/15min/IP | Sem dados pessoais; configuração Google | 200; nonce aleatório não incluído no relatório | APROVADO |
| GET `/api/auth/google/client-id` | Pública; 30/15min/IP | Configuração pública | 200 | APROVADO; Client ID não é segredo |
| POST `/api/auth/google` | ID token Google + nonce/IP; 12/15min | idToken, nonce, termsAccepted em nova conta | token inválido→401; smoke identidade simulada testa 409 de link e desafio de conta nova | PARCIAL; não valida login Google humano |
| POST `/api/auth/google/link` | JWT legado recente com pwd+otp; 10/15min | idToken, nonce | sem JWT→401; revisão de validação do e-mail verificado/sub; linking legado adicional no smoke via verify | PARCIAL; positivo direto desta rota não executado |
| GET `/api/auth/me` | JWT legado + usuário existente + revogação | Bearer; arquivo JSON | sem JWT→401; smoke pós-OTP→200 sem hash | APROVADO no ambiente isolado |
| POST `/api/auth/logout` | JWT legado; 30/15min | Bearer; registro de revogação | sem JWT→401; smoke→200 | PARCIAL: UI simulada e revogação revisada; reinício/múltiplas instâncias não exercitados |
| GET `/api/session/me` | Supabase getUser + claims + autorização user/session | Bearer; Supabase/PostgreSQL | 401 sem token/inválido; 403 antes OTP; 200 após; 403 após logout/refresh; indisponibilidade injetada→503; porta 3001 com token real→403 | APROVADO nos cenários listados; não há 500 no caminho válido testado |
| POST `/api/session/challenge` | Supabase + e-mail confirmado; termos no caso Google | Bearer; perfil, OTP, e-mail | sem token→401; válido→200; repetição reutiliza desafio; revogado→401; falha de entrega isolada→503 | PARCIAL: entrega simulada |
| POST `/api/session/verify` | Supabase + challenge/user/session | challengeId UUID, code string de 6 dígitos | sem token→401; código errado→400; correto→200; reutilizado/outro usuário→400; UUID malformado→500 | REPROVADO na validação de UUID |
| POST `/api/session/resend` | Supabase + challenge/user/session | challengeId | sem token→401; antes do prazo→429; serviço após prazo→sucesso; UUID inválido→500 | REPROVADO na validação de UUID |
| POST `/api/session/logout` | Supabase; cria marca de revogação mesmo se não autorizado | Bearer; PostgreSQL | sem token→401; válido→200; chamadas privadas seguintes→403 | APROVADO |
| GET caminho desconhecido `/api/not-found` | Não aplicável | Middleware notFound | 404 JSON | APROVADO; cenário adicional, não endpoint de negócio |

São 1 health + 11 auth + 5 session; a última linha da tabela é um teste adicional de caminho inexistente, sem representar uma API implementada.

Todas as chamadas privadas do roteador session passam pela identidade Supabase. `/challenge`, `/verify`, `/resend` e `/logout` precisam ser acessíveis antes da autorização adicional para completar ou cancelar o fluxo; isso é intencional. `/me` exige a autorização adicional. Não foram encontrados outros endpoints de dados ambientais/administração/upload nesta versão.

O backend consulta Supabase a cada validação de identidade e faz SQL parametrizado. O tratamento seguro de erro não devolveu URI, senha, stack SQL ou HMAC. O diagnóstico de UUID incorreto é erro PostgreSQL `22P02`; a API o transforma em 500 genérico porque a validação de entrada é insuficiente.

## 7. Problemas encontrados

### P01 — Revogação Supabase não invalida autorização na Data API

**Área:** RLS/sessões. **Severidade:** ALTO. **Prioridade:** P1. **Causa confirmada:** `has_additional_authorization()` consulta somente `authorized_sessions.revoked_at`; não consulta a existência de `auth.sessions`.

**Evidência:** A106 confirmou zero sessões Auth após logout global; A107 fez GET REST com o JWT anterior e recebeu HTTP 200/um perfil. A108 marcou revogação Arboris e recebeu zero perfis. Arquivo: `backend/supabase/migrations/001_auth_profiles_and_sessions.sql:100`.

**Impacto/condição:** JWT ainda dentro da validade e previamente autorizado pode continuar lendo/alterando os dados próprios permitidos pela RLS depois de revogação nativa. Não é escalada para outro usuário, nem prova de que o OTP inicial pode ser ignorado. A política precisa cumprir o requisito de revogação também fora do endpoint de logout da aplicação.

**Recomendação:** fazer a autorização adicional depender também da sessão Auth ativa, com função SECURITY DEFINER de privilégios mínimos/search_path fixo ou estratégia equivalente de revogação sincronizada. Revisar também troca de senha e encerramento global. **Dependências:** migração aditiva/revisada e testes RLS com usuário comum. Não aplicada nesta auditoria. A documentação oficial descreve a correlação entre o claim `session_id` e `auth.sessions`: [Supabase — sessões](https://supabase.com/docs/guides/auth/sessions).

### P02 — Conexão PostgreSQL atual sem criptografia

**Área:** infraestrutura. **Severidade:** ALTO. **Prioridade:** P1. **Evidência:** A018, `pg_stat_ssl.ssl=false` e `client.connection.stream.encrypted=false`. **Causa confirmada:** `backend/src/store/postgres.js:9` só define SSL quando NODE_ENV é production; a URI atual não contém sslmode.

**Impacto:** tráfego de banco atravessa rede externa sem TLS no cenário local testado. **Recomendação:** configurar TLS validado também no desenvolvimento que usa banco remoto. **Dependência:** resolver P03 e validar CA/hostname. Não imprimir/reescrever URI e não desabilitar a validação do certificado.

### P03 — TLS de produção falha na cadeia de certificados

**Área:** infraestrutura/produção. **Severidade:** ALTO. **Prioridade:** P1. **Evidência:** A109, `SELF_SIGNED_CERT_IN_CHAIN` com `rejectUnauthorized: true`. Arquivo: `backend/src/store/postgres.js:9`.

**Causa conhecida:** a cadeia apresentada não foi aceita pelo trust store do Node local. **Hipóteses ainda não distinguidas:** CA Supabase não disponível nesse trust store ou interceptação TLS da rede/local. Não foi presumido que a senha está errada nem que a mesma falha já ocorre no Render.

**Ação:** conferir o certificado/CA oficial do projeto e a cadeia local; configurar CA confiável e manter verificação de hostname. Testar SELECT 1 no ambiente de execução pretendido. Referências: [Supabase — conexão](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres — SSL](https://node-postgres.com/features/ssl).

### P04 — UUID malformado gera HTTP 500

**Área:** APIs. **Severidade:** MÉDIO. **Prioridade:** P2. **Evidência:** A059/A060. `resend` aceita identificador sem validação; `verify` usa regex que aceita 36 hífens. O PostgreSQL rejeita com `22P02`. Arquivos: `backend/src/services/session-authorization.service.js:120` e função `resend` no mesmo arquivo; `errorHandler.js`.

**Impacto:** entradas do cliente são classificadas como erro interno, poluem diagnóstico e prejudicam recuperação da interface. Não foi observada SQL injection; as consultas são parametrizadas. **Ação:** validar UUID canônico/tipos antes da consulta e responder 422, preservando logs técnicos sanitizados. Testar string, objeto, null, UUID malformado e inexistente.

### P05 — Aceite não é persistido/versionado no fluxo principal

**Área:** termos/dados. **Severidade:** MÉDIO. **Prioridade:** P2. **Evidência:** A066 encontrou zero registros em `terms_acceptances` depois de login/código de fixture com metadata de aceite. Busca de código não encontrou INSERT nessa tabela. A124 iniciou um desafio de identidade por senha com `terms_accepted=false`; A123 recusou a mesma condição para identidade Google. A125/A126 confirmaram a criação de perfil ausente e a idempotência, em transação revertida.

**Causa confirmada:** checkbox, metadata `terms_accepted` e flag local coexistem com uma tabela que não é integrada ao fluxo. `begin` verifica metadata de termos para Google, mas não exige o mesmo requisito para identidade por senha. Arquivos: `frontend/src/lib/api.js:126`, `AuthCallback.jsx:101`, `session-authorization.service.js:65`, migração linha 11.

**Ação:** definir versões de termos/privacidade e registrar aceite no servidor de forma idempotente. Metadata editável pelo usuário não deve ser tratada como trilha imutável. **Dependências:** texto aprovado e política de versionamento. Não é declaração de infração legal.

### P06 — Dependências com advisories

**Área:** dependências. **Severidade:** ALTO para ferramentas de desenvolvimento afetadas; MÉDIO para os achados remanescentes no conjunto de produção. **Prioridade:** P1/P2 conforme pacote. **Evidência:** A013/A015/A112; versões e advisories na seção 8.

**Impacto:** depende do código vulnerável ser alcançado. Dev server/editor, processadores de arquivos e mock server não equivalem a uma vulnerabilidade demonstrada do bundle publicado. O Router está no runtime; os destinos atuais são constantes e não foi encontrado uso de destino externo fornecido pelo cliente, reduzindo a aplicabilidade dos redirects reportados. Não há SSR nesta aplicação.

**Ação:** atualizar de forma dirigida, revisar advisories e testar compatibilidade; não usar `audit fix --force`. **Dependência:** atualização dos lockfiles em tarefa de correção, sem migração automática do Router 6 para 7.

### P07 — Frontend sem CSP declarada

**Área:** segurança/configuração. **Severidade:** MÉDIO. **Prioridade:** P2. **Evidência:** U069 sem header no preview; `frontend/vercel.json` contém outros headers, mas não Content-Security-Policy; `index.html` não define CSP.

**Impacto:** falta uma camada de restrição de execução/origens no frontend. Helmet protege as respostas da API, não o documento servido pela Vercel. Não comprova XSS existente. **Ação:** preparar CSP compatível com scripts, estilos, Supabase, Google legado quando necessário, fontes e imagens; testar antes da publicação, sem remover Helmet/CORS. Header externo eventualmente configurado no painel não foi consultado.

### P08 — Persistência legada continua ativa e não está preparada para Render efêmero

**Área:** arquitetura/produção. **Severidade:** ALTO antes de disponibilizar contas legadas. **Prioridade:** P1 de publicação. **Evidência estática:** cadastro legado público ainda grava JSON; fallback no login após `invalid_credentials`; `render.yaml` sem disco/DATA_FILE persistente; OTP/nonces/rate limits legados em memória.

**Impacto:** perda de contas/revogações em reinício ou deploy e divergência entre instâncias. Não foi simulada perda real do disco. Arquivos: `auth.routes.js:22`, `jsonStore.js`, `revokedTokens.js`, `frontend/src/lib/api.js:68`, `render.yaml`.

**Ação:** decidir manutenção/migração do legado e prover persistência apropriada antes de publicar; restringir novas contas ao modelo escolhido quando autorizado. Não apagar usuários nem JSON. **Dependência:** decisão de migração e operação de armazenamento.

### P09 — Termos, privacidade e README descrevem a arquitetura antiga

**Área:** documentação/privacidade. **Severidade:** MÉDIO. **Prioridade:** P2. `ModaisArboris.jsx:6` descreve JSON, bcrypt e ID token Google, omite Supabase/Resend e não define retenção/canal real; README orienta GIS/SMTP e não o fluxo PKCE atual.

**Impacto:** instruções operacionais e informação ao usuário não correspondem integralmente ao sistema. **Ação:** atualizar documentação e textos com revisão adequada; incluir processamento externo, sessões, eventos e retenção. Sem alegar conformidade LGPD/WCAG com esta auditoria. **Dependências:** responsável pelo produto e revisão jurídica quando aplicável.

### P10 — Overflow horizontal em telas pequenas

**Área:** responsividade. **Severidade:** BAIXO. **Prioridade:** P3. **Evidência:** U015/U016/U031/U032 e U070. Em 320 px o documento chegou a 323 px e `scrollX=3`; captura completa também mostra decoração além do painel. Controles foram alcançados por scroll vertical; não foi observado bloqueio de cadastro.

**Causa provável:** folhas/decorações e camadas dimensionadas além da viewport; é necessário isolar a contribuição exata dos elementos antes de corrigir. Arquivos: `AutenticacaoArboris.css:127`, `HoloBackground.css`, `index.css`. **Ação:** conter overflow decorativo preservando animações e card; repetir apenas 320/375 e telas de erro/OTP. Não foi feito redesign.

### P11 — Favicon PNG de aproximadamente 1,30 MB

**Área:** desempenho. **Severidade:** MÉDIO. **Prioridade:** P2. U068 mediu o maior recurso da navegação como `/arboris-tree.png`, solicitado por `frontend/index.html:5`. Ele representou a maior parcela de ~2,03 MB transferidos no laboratório.

**Ação:** derivar favicon otimizado nas dimensões efetivas e manter os assets necessários à interface. Repetir medição com cache frio. Não substituir a identidade visual. A experiência de redes móveis reais não foi medida.

### P12 — Textos com caracteres corrompidos

**Área:** qualidade/interface. **Severidade:** BAIXO. **Prioridade:** P3. Revisão UTF-8 encontrou textos com `Ã...` ou `?` em `session-authorization.service.js`, `resend.service.js`, `email.service.js`, `RequireSession.jsx` e mensagens legadas. Não é só renderização do terminal: os literais estão no código lido como UTF-8.

**Ação:** normalizar os literais afetados e verificar mensagens de erro/e-mail; evitar conversão indiscriminada do repositório. Templates foram testados estruturalmente, mas não quanto a todas as traduções.

### P13 — Resiliência e limites operacionais incompletos

**Área:** disponibilidade. **Severidade:** MÉDIO. **Prioridade:** P2. **Revisão estática:** pool sem listener explícito para erros em conexões ociosas; sem statement_timeout/query_timeout configurado; Resend sem timeout explícito do aplicativo; operações de login/recuperação sem timeout global consistente. `RequireSession` possui AbortController/8 s para `/me`, porém `beginSupabaseChallenge()` após 403 não recebe esse signal. Timeout SMTP residual não cobre automaticamente Resend.

**Impacto potencial:** requisições pendentes, loading prolongado ou erro de processo em condições não reproduzidas. A falha de rede abortada e a indisponibilidade PG injetada falharam fechadas. **Ação:** testes dirigidos de lentidão/timeout, tratamento do pool, limites explícitos e mensagens recuperáveis. Não foi derrubado serviço externo.

### P14 — Segurança/observabilidade e cobertura não acompanham todo o modelo novo

**Área:** operação/manutenção. **Severidade:** MÉDIO. **Prioridade:** P2. Eventos PostgreSQL registram confirmação adicional; não há uso equivalente de `known_devices`/alerta de novo dispositivo no caminho Supabase. Logs de falhas são sanitizados, mas alertas externos, retenção, restauração e CI não foram comprovados. A suíte existente não testa o fluxo completo Supabase/Google/e-mail.

**Ação:** transformar os cenários críticos desta auditoria em testes mantidos; definir logs/eventos/alertas e procedimento de backup/restauração. Alertas legados não devem ser anunciados como funcionalidade já disponível em todos os logins.

### P15 — Recuperação e confirmação: lacunas de UX e evidência

**Área:** autenticação. **Severidade:** MÉDIO para completude do fluxo; manual pendente para integração externa. **Revisão:** redefinição tem apenas um campo de senha; não há comparação de confirmação; mensagem de confirmação expirada orienta novo e-mail, mas não há ação de reenvio implementada com `auth.resend`. A rota dedicada só confirma após clique e verifica `email_confirmed_at`, o que foi preservado.

A100 observou HTTP 200 após `updateUser` na **sessão corrente**, antes do `signOut` que o frontend executa. Esse fato isolado não comprova bypass do fluxo de recuperação completo: A104 mostrou 401 para outra sessão após a mudança; A105 mostrou 401 após logout nativo. O defeito demonstrado de revogação está na Data API (P01). **Ação:** validar o percurso completo com e-mail autorizado, definir confirmação da nova senha/reenvio e testar tentativas expiradas/reutilizadas, múltiplas abas e scanners. Nenhuma senha de usuário existente foi alterada.

## 8. Segurança

**Falha confirmada de autorização:** P01, revogação incompleta no acesso direto via RLS. **Falha de transporte:** P02; **bloqueio de TLS validado:** P03. Não houve credencial privilegiada encontrada nos locais examinados e não foi demonstrado acesso cruzado entre usuários.

**Controles exercitados:** SQL parametrizado; getUser/claims; autorização adicional por sessão; 401/403/503; RLS com chave pública/JWT comum; bloqueio de escrita na autorização, OTP, eventos e ID de perfil; código seguro/HMAC 32 bytes; uso único e concorrência; limite de tentativas e envios; CORS; Helmet; JSON/payload; rollback; falha de entrega sem autorização; proteção de segredo em respostas; dev/produção com variáveis inválidas; rate limiting de cadastro no smoke; remoção do widget.

**Revisão estática defensiva:** não foram encontrados caminhos de upload, execução de shell, SQL concatenando entradas, fetch de URL arbitrária do usuário ou `dangerouslySetInnerHTML` no produto. React escapa conteúdo; templates HTML escapam nome. Isso não substitui fuzzing/exploração completa. Links e callbacks usam destinos internos enumerados; não foi encontrado `next`/`redirectTo` externo controlado por query do usuário. Tokens ficam no localStorage e dependem da segurança do JavaScript/origem; não são cookies HttpOnly de sessão. Cookies de dispositivo legado são HttpOnly e Secure em produção.

**Limites:** Express tem contadores por processo/IP; cadastro 5, login legado 12, OTP legado 30 verificações/10 reenvios a cada 15 min; session router tem teto global 120, challenge/resend 10 e verify 20. PostgreSQL limita envio por usuário a 5/15 min, desafio a 5 tentativas e intervalo de reenvio a 60 s. O teste não provocou rate limit remoto. Login/cadastro/recuperação Supabase são enviados diretamente ao Auth e não passam por esses limites Express. Os valores do painel precisam ser verificados em [Authentication → Rate Limits](https://supabase.com/docs/guides/auth/rate-limits). Isso reduz abuso; não elimina automação nem DDoS.

**Credenciais:** índice Git sem env/dados privados; ignore confirmado; zero correspondências dos segredos atuais no código/bundle, 466 objetos históricos de texto e arquivos temporários examinados. Busca adicional de padrões antigos examinou 370 objetos, sem chaves privilegiadas reconhecidas. Esses números têm escopos de extensão diferentes; não devem ser somados como arquivos únicos. Busca por assinaturas não prova ausência universal de credenciais desconhecidas/obfuscadas. A chave publicável no frontend é esperada. Não foram publicados source maps no build observado. Backups privados externos não foram acessados.

### Dependências

| Projeto | Audit completo | Somente produção | Interpretação |
|---|---|---|---|
| Backend | 2 moderadas | 0 | `nodemon`/`minimatch` no ambiente de desenvolvimento |
| Frontend | 8 altas + 8 moderadas | 2 moderadas | Ferramentas e dependências transitivas; runtime remanescente ligado ao React Router |

A contagem npm é de pacotes afetados, incluindo cadeias transitivas; **não significa 18 explorações independentes confirmadas**. Nenhuma atualização automática foi realizada.

__DEPENDENCY_TABLE__

As versões atuais/wanted/latest foram coletadas com `npm outdated`. Atualizações relevantes dentro das linhas existentes incluem Router 6.30.6, Vite 8.3.8 e Vitest 5.1.0 segundo o registro consultado nesta data; revalidar advisories e compatibilidade antes da correção. O npm sugeriu downgrade de nodemon em sua solução automática; isso não foi aplicado nem assumido como a melhor estratégia. O advisory do Router depende de caminhos não confiáveis: [aviso oficial do mantenedor](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6).

## 9. Desempenho

**Ambiente medido:** Chrome headless 157.0.8103.51, Windows, preview do bundle de produção em loopback, 1366×768, cache novo, sem limitação de CPU/rede, animações normais; uma navegação. Não é medição de usuários reais nem capacidade de produção.

| Métrica | Resultado |
|---|---|
| JS gerado | 492,74 kB; gzip 142,63 kB informado pelo Vite |
| CSS gerado | 51,41 kB; gzip 11,96 kB |
| FCP | 2.332 ms |
| DOMContentLoaded | ~2.002 ms |
| load | ~2.002 ms |
| Saída completa do boot desde início da navegação | ~5.069 ms |
| Recursos observados | 7; ~2.030.964 bytes de transferSize |
| Maior recurso | `/arboris-tree.png`: ~1.300.997 bytes transferidos |
| Layout shifts observados | Soma 0 no intervalo da coleta; não prova ausência em todo o fluxo |
| Long tasks observadas | Uma, 75 ms; não equivale a TBT Lighthouse |
| Heap JS usado, leitura pontual | ~4,57 MB; não é teste de vazamento |
| LCP | NÃO MEDIDO: observer não entregou candidato; valor inicial 0 não é um LCP válido |
| INP/TBT/FPS | NÃO MEDIDOS |

**Backend:** 10 GET health sequenciais na instância isolada, sem carga concorrente: mínimo 0,892 ms, média 1,835 ms, mediana 1,234 ms, p95 amostral 3,739 ms, sem erros. O health não consulta banco/Auth, portanto esses números não representam latência do login. Não foram medidos throughput, capacidade multiusuário ou stress remoto.

**Riscos de desempenho revisados:** PNG grande, blur/filtros e muitas camadas animadas; consultas getUser em cada API; JSON síncrono no legado; limite de dez conexões sem orçamento de consultas/timeout. A amostragem visual mostrou floresta/borda se movendo sem mover inputs; não comprova estabilidade prolongada de memória ou FPS.

## 10. Responsividade e acessibilidade

Foram executados login e cadastro nas 16 resoluções solicitadas: 1920×1080, 1600×900, 1440×900, 1366×768, 1280×720, 1280×630, 1024×600, 1280×800, 1024×768, 960×600, 820×1180, 768×1024, 430×932, 390×844, 375×667 e 320×568. **28 dos 32 pares não apresentaram overflow horizontal; 4 falharam** (375/320, login/cadastro). Há organização horizontal nas telas largas e vertical nas estreitas. Em baixa altura, scroll vertical permite acessar os controles; não foi imposto que todo conteúdo caiba sem scroll.

Capturas sem dados reais: `.tmp/auditoria-login-1366.png` e `.tmp/auditoria-cadastro-320.png`. Além de geometria, foram testados campos vazios/inválidos, mostrar senha, foco, Tab, Shift+Tab em modal, Escape, restauração de foco, abertura de termos/privacidade, histórico, callback inválido, carregamento reduzido e movimento normal.

Chrome, Edge, Firefox e WebKit foram realmente executados. Edge/Firefox/WebKit cobriram login/cadastro mobile e validação; não toda autenticação externa. **WebKit em Windows não equivale a Safari em iPhone real.** Nenhum dispositivo físico foi usado.

Idioma pt-BR, labels de campos e atributos alt básicos passaram. Redução de movimento resultou em zero animações infinitas ativas na amostra. Não houve exceção JavaScript não tratada nos cenários observados; logs esperados de erro de callback não foram tratados como crash.

**Pendências:** zoom nativo 80/125/150/200% não foi efetivamente aplicado por atalhos headless; não foi substituído silenciosamente por CSS zoom. Contraste de todas as composições transparentes, leitor de tela, ordem completa de foco, tamanho de todos os alvos, teclado em todos os estados e WCAG 2.2 AA completa permanecem manuais. Sem alegação de conformidade integral.

## 11. Integrações externas

| Serviço | Configurado | Código implementado | Teste real | Resultado | Pendência |
|---|---|---|---|---|---|
| Supabase Auth | URLs/chaves presentes; email/Google habilitados; autoconfirm=false | Sim | Senha, sessões, refresh, getUser, signOut, atualização de senha de fixtures | PARCIAL | Cadastro, confirmação e recuperação recebidos por e-mail; OAuth humano |
| PostgreSQL | URI funcional; Session pooler | Sim | SELECT, catálogo, transações de autorização, RLS e pool | PARCIAL | TLS seguro e P01/P03 |
| Google | Provedor habilitado; Client ID legado presente | PKCE e legado | 302 para accounts.google.com; cancelamento/erro no navegador | PENDENTE MANUAL | Conta de teste autorizada, retorno e OTP completo |
| Resend | Key/remetente presentes | Sim | Nenhum envio real neste lote | BLOQUEADO | Confirmar destinatário autorizado; envio único controlado e recebimento |
| SMTP Supabase | Não consultado pelo painel | Configuração externa necessária | Sem envio real | BLOQUEADO | Verificar servidor, remetente, credencial e templates; depois e-mail real |
| Vercel | Arquivo local existe | Build/SPA/headers parciais | Bundle local apenas | PENDENTE MANUAL | Root Directory/env/CSP/URLs HTTPS; sem deploy nesta fase |
| Render | Blueprint existe | Build/start/health/env parciais | Express local apenas | PENDENTE MANUAL | TLS CA, persistência legada, proxy, env e Node; sem deploy nesta fase |
| GitHub | Repositório Git local | Sem CI identificado no inventário | Índice/histórico local auditados | PARCIAL | Remoto, permissões, branch protection e secret scanning não consultados |
| Cloudflare Turnstile | Removido | Nenhum fluxo ativo | Zero requests do widget; logins sintéticos sem captchaToken passaram | REMOVIDO | Confirmar estado do painel para os fluxos de e-mail que não foram executados |

## 12. Pendências externas

| Plataforma / página | O que verificar/configurar | Valor/comportamento esperado | Teste desbloqueado |
|---|---|---|---|
| Supabase → Database/Connect e SSL settings | CA oficial e modo de conexão; cadeia confiável no Node/rede | TLS com validação; preservar URI/segredos; não usar rejectUnauthorized=false | A018/A109 e publicação segura |
| Supabase → Authentication → URL Configuration | Site URL e allowlist local | Site URL `http://localhost:5000`; `/auth/confirm` e callbacks abaixo na mesma origem | Confirmação/PKCE/recuperação |
| Supabase → Authentication → Providers → Google | Cliente OAuth, segredo privado no painel, provedor ativo | URI Google autorizada `<SUPABASE_URL>/auth/v1/callback`; não apontar o callback Google Cloud diretamente ao React | Login Google real |
| Google Cloud → APIs e serviços → Credenciais / tela de consentimento | Cliente Web correspondente e usuários de teste | Conta humana autorizada e callback Supabase; usar sempre localhost, sem alternar com 127.0.0.1 no mesmo fluxo | Seleção de conta e callback PKCE |
| Supabase → Authentication → Emails → Confirm signup | Template compatível com token_hash | Link para `/auth/confirm`, `TokenHash`, `type=email`; não enviar confirmação ao fluxo Google | Confirmação real |
| Supabase → Authentication → Emails → Reset password | Template de recuperação e URL de retorno | Link nativo `ConfirmationURL`; SDK solicita retorno a `http://localhost:5000/auth/callback?flow=recovery` | Redefinição por e-mail |
| Supabase → Authentication → SMTP Settings | Conferir SMTP Resend e remetente autorizado | Credencial mantida privada; remetente permitido pela conta | Cadastro/recuperação recebidos |
| Resend → API Keys / Emails / Domains | Confirmar destinatário de teste e remetente onboarding; verificar logs da mensagem autorizada | Somente endereço autorizado até existir domínio validado; não pedir Full access só para esta auditoria | Envio, aceitação, entrega e visualização Gmail separados |
| Resend / template de e-mail | Conferir tracking e comportamento do link | Rastreamento de clique não deve alterar/consumir verificação; scanners não devem confirmar sem clique da aplicação | Reutilização/expiração e fluxo após scanner |
| Supabase → Authentication → Rate Limits | Valores reais de sign-in, signup, recovery, OTP e refresh | Limites nativos adequados ao projeto; requests diretos não dependem do Express | Abuso controlado sem carga remota |
| Supabase → Authentication → Bot Detection | Conferir remoção do CAPTCHA | CAPTCHA desativado conforme decisão do projeto; não reintroduzir widget | Fluxos de e-mail sem exigência residual |
| Supabase → Database → Backups | Plano, retenção, último backup e procedimento de restore | Backup disponível e restauração comprovada em ambiente separado | Critério de recuperação de desastre |
| Vercel → Project Settings | Root frontend, Vite, build, dist, env e CSP | Build `npm run build`; saída dist; VITE_API_URL HTTPS real e chaves públicas; domínio ainda a definir | Futuro teste HTTPS/SPA |
| Render → Service Settings / Environment | Root backend, Node, build/start, proxy e persistência | Start npm start; PORT da plataforma; health; TRUST_PROXY_HOPS exato; segredos privados; armazenamento durável quando houver legado | Futuro teste operacional |

**URLs locais previstas:** `http://localhost:5000/auth/confirm`, `http://localhost:5000/auth/callback?flow=google`, `http://localhost:5000/auth/callback?flow=recovery`, `http://localhost:5000/auth/callback?flow=link`. Conferir sua aceitação na allowlist do projeto; não foram lidas configurações privadas da Management API. Domínios de produção não foram inventados.

**Template mínimo compatível de confirmação, para revisão antes de colar em Confirm signup:**

```html
<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#06110d;color:#eaf5ee;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:auto;padding:28px;border:1px solid #176947;border-radius:18px;background:#09251a">
    <p style="color:#76dca8">ARBORIS.X</p>
    <h1 style="font-size:24px">Confirme seu e-mail</h1>
    <p>Abra a página abaixo e selecione Confirmar e-mail para concluir seu cadastro.</p>
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email" style="display:inline-block;padding:14px 20px;background:#16d990;color:#032417;text-decoration:none;border-radius:10px">Abrir confirmação</a>
    <p style="font-size:13px;color:#afc8ba">Se você não solicitou este cadastro, ignore esta mensagem.</p>
  </div>
</body></html>
```

Este HTML é uma proposta local compatível com o código; **não foi aplicado nem conferido no painel**. O usuário ainda precisa clicar na página e `verifyOtp` precisa retornar confirmação real. Receber o e-mail, abrir a URL e mostrar sucesso são três evidências diferentes.

**Procedimento humano Google:** abrir `http://localhost:5000/login`, selecionar Google, aceitar termos, escolher a conta de teste autorizada, consentir e aguardar retorno a `/auth/callback?flow=google`. Verificar desafio de seis dígitos; confirmar somente o código recebido no endereço permitido; conferir Dashboard, logout e bloqueio posterior. Não enviar senha Google ao agente. Usar DevTools apenas para códigos/status sanitizados, sem compartilhar tokens/URL privada de callback.

## 13. Plano de correção

| Fase | Problemas | Ação / arquivos prováveis | Dependências | Critério de aceitação e reteste |
|---|---|---|---|---|
| 1 — Críticos | Nenhum CRÍTICO confirmado | Manter avaliação aberta se novos dados alterarem impacto | Evidência adicional | Não inventar incidente nem declarar segurança absoluta |
| 2 — Altos | P01 | Revisar helper/políticas em migração nova; sincronizar revogação | Aprovação de alteração SQL em tarefa de correção | JWT após signOut/password reset não lê/edita perfil via REST; sessão válida com OTP continua funcionando; A107/A108 |
| 2 — Altos | P02/P03 | TLS/CA em postgres.js e configuração do ambiente | Certificado/cadeia confiável | SELECT 1 com stream.encrypted=true e hostname validado em dev/prod |
| 2 — Altos | P08 | Definir persistência/migração do legado; render.yaml e repositories | Decisão operacional | Reinício/segunda instância não perde contas/revogação; teste isolado |
| 2 — Altos | P06 dev tooling | Atualizações dirigidas dos pacotes afetados | Revisão de mudanças/lockfiles | Auditoria reavaliada, build/lint/testes compatíveis; dev server não exposto desnecessariamente |
| 3 — Médios | P04 | Validação UUID em session-authorization.service.js | Nenhuma externa | 422 para formatos/tipos incorretos; 400 para UUID inexistente; nenhum 500 por entrada inválida |
| 3 — Médios | P05/P09 | Persistência de aceite, versões e textos; docs/modais/API | Texto aprovado e modelo de aceite | Registro idempotente verificável em terms_acceptances para ambos os provedores |
| 3 — Médios | P07/P06 runtime | CSP frontend e atualização Router compatível | Origens externas finais | Sem regressão de assets/OAuth; política presente; advisories aplicáveis resolvidos |
| 3 — Médios | P11/P13 | Favicon otimizado, timeouts, listener do pool | Ensaios dirigidos | Menor transferência; falha fechada, botão recuperável, processo estável |
| 3 — Médios | P14/P15 | Cobertura Supabase, recuperação, reenvio e operação | Destinatário autorizado/conta Google | E2E real A/B/C/D concluídos; sem tratar mock como integração |
| 4 — Baixos | P10/P12 | Contenção decorativa e literais UTF-8 | Nenhuma externa | Sem overflow 320/375; mensagens legíveis, animações preservadas |
| 5 — Futuras | Escala/monitoramento | Contadores compartilhados, CI, rastreio e restauração | Arquitetura operacional | Capacidade/recuperação medidas; sem promessas de escala não testadas |

Esse plano **não foi implementado automaticamente**, conforme o escopo de testar e relatar.

## 14. Critérios de liberação para produção

- [x] Conexão PostgreSQL autenticada e estruturas essenciais existentes.
- [x] Isolamento básico de usuários e bloqueio sem autorização adicional nos cenários executados.
- [ ] TLS validado para todas as conexões remotas ao banco.
- [ ] RLS bloqueando também JWT de sessão revogada nativamente.
- [ ] Cadastro, confirmação real e reenvio concluídos com e-mail autorizado.
- [ ] Login por senha até Dashboard com entrega real do OTP.
- [ ] Google humano até Dashboard e vinculação/cancelamento validados.
- [ ] Recuperação por e-mail, nova senha, senha antiga rejeitada e revogação integral validadas.
- [x] OTP: formato, HMAC, expiração, uso único, reenvio, limite e concorrência, com entrega simulada.
- [x] Logout Arboris bloqueando API/Data API nos testes reais de backend.
- [ ] Ausência de falha de revogação conhecida; reteste P01 concluído.
- [x] Nenhum segredo identificado nos locais examinados; env/dados ignorados pelo Git.
- [x] Build, lint e testes existentes aprovados na execução final.
- [ ] Dependências e vulnerabilidades aplicáveis resolvidas/reavaliadas.
- [ ] CSP, HTTPS, CORS, callbacks, Node e variáveis de produção validados no ambiente pretendido.
- [ ] Persistência legada durável ou migração concluída; sem perda em reinício.
- [ ] Remetente/domínio permite enviar aos usuários reais pretendidos; recebimento comprovado.
- [ ] Backup/restore e monitoramento mínimo comprovados.
- [ ] Termos/versionamento, acessibilidade manual e overflow residual revisados.

## 15. Conclusão e avaliação técnica

| Pergunta | Resposta baseada em evidência |
|---|---|
| Funciona localmente? | Parcialmente. UI, banco, identidade sintética e autorização de backend funcionam; E2E externo completo pendente |
| O banco funciona? | Sim para conexão/consultas; TLS seguro está reprovado no ambiente testado |
| APIs privadas estão protegidas? | Backend bloqueou sem token/OTP e após logout; Data API tem falha confirmada de revogação nativa |
| Login tradicional chega ao Dashboard? | Backend real foi até autorização; UI simulada foi até Dashboard. Percurso único com e-mail real ainda não comprovado |
| Google chega ao Dashboard? | Não comprovado. Só início real/redirect e erros/cancelamento foram testados |
| Confirmação de cadastro funciona? | Rejeição inválida e clique explícito comprovados; confirmação válida por e-mail pendente |
| Código adicional funciona? | Sim nas regras de backend/PG testadas; entrega externa pendente |
| Recuperação funciona? | Atualização de senha real de fixture funciona; link/recebimento/fluxo completo pendentes |
| Resend envia? | Não comprovado neste lote. Nenhuma mensagem real enviada sem confirmação do destinatário |
| Dados isolados? | A não leu/alterou B; OTP/eventos/autorização privados bloqueados. Revogação nativa exige correção |
| Existe bypass confirmado? | Sim, da revogação nativa no acesso ao próprio perfil via Data API. Não foi demonstrado bypass inicial do OTP nem acesso cruzado |
| Problemas críticos? | Nenhum classificado CRÍTICO confirmado; há problemas ALTOS que impedem publicação |
| Pronto para produção? | Não. P01/P02/P03, persistência, dependências e E2E externo são impedimentos |
| Próxima ação | Corrigir revogação RLS e TLS primeiro; depois entradas OTP/persistência de aceite, dependências e validação externa autorizada |

### Notas (0–10, ordinais, não percentuais)

As notas expressam maturidade observada e limitações, sem precisão decimal nem equivalência a conformidade/certificação.

| Área | Nota | Critério aplicado |
|---|---:|---|
| Arquitetura | 6 | Separação de camadas presente; dois modelos de identidade/persistência continuam concorrentes |
| Qualidade do código | 6 | Build/lint/testes passam; validação UUID, literais, documentação e tratamento de falhas precisam melhorar |
| Frontend | 7 | Telas e navegação testadas em browsers reais; estados externos/recuperação não fechados |
| Backend | 6 | Autorização central e erros sanitizados; 500 por entrada inválida, limites operacionais e legado pendentes |
| Banco | 6 | Estrutura, constraints e RLS presentes; TLS e revogação impedem avaliação superior |
| Autenticação | 5 | Núcleo por senha/OTP comprovado em fixtures; E2E e revogação global de dados incompletos |
| Segurança | 5 | Controles reais passam em vários negativos; RLS pós-revogação e transporte são falhas relevantes |
| Integrações | 5 | Auth/PG reais e Google iniciado; e-mail, SMTP e publicação não comprovados |
| Desempenho | 6 | Métricas locais coletadas; asset grande e amostragem limitada, sem INP/carga real |
| Responsividade | 7 | 28/32 combinações passaram; quatro com overflow, sem dispositivos físicos/zoom completo |
| Acessibilidade | NÃO AVALIADO integralmente | Sem auditoria de contraste/leitor de tela/zoom suficiente para nota global; verificações básicas documentadas |
| Manutenibilidade | 6 | Camadas claras; duplicação, docs defasadas e cobertura nova fora do CI |
| Preparação para produção | 3 | Build disponível, mas TLS, RLS, persistência, configuração externa e E2E impedem liberação |

**Entrega preservada:** este é o relatório principal. Os JSONs e duas capturas em `.tmp` são evidências auxiliares, não relatórios concorrentes. Os harnesses não foram adicionados ao código de autenticação. Nenhuma garantia de ausência de defeitos além dos cenários executados é inferida deste documento.

## 16. Atualização de correções — 15/11/2026

Esta seção atualiza o estado do lote anterior; as evidências históricas e o escopo do Dashboard temporário nas seções anteriores foram preservados. Nenhuma migration foi aplicada ao banco remoto e nenhuma conta/arquivo de usuário foi removido nesta atualização.

| ID | Estado anterior | Estado desta revisão | Evidência e pendência concreta |
|---|---|---|---|
| P01 | Revogação pela Data API não invalidava o JWT após remoção da sessão Auth. | **Correção local preparada; remoto inalterado.** | Migration `backend/supabase/migrations/002_require_active_auth_session.sql` valida `auth.sessions`, junta `session_id` e `user_id`, confere a autorização adicional e expiração. A leitura remota anterior encontrou `id`, `user_id` UUID e `not_after` timestamptz compatíveis. Ainda faltam backup restaurável confirmado, rótulo do ambiente, autorização para aplicação e regressão real com JWTs comuns A/B. |
| P02 | TLS PostgreSQL desativado no cenário de auditoria. | **Resolvido e validado no trabalho anterior.** | Estado informado pelo responsável: SSL obrigatório, TLS 1.3, certificado/hostname validados, `pg_stat_ssl.ssl=true` e reconexão do pool aprovada. Nenhuma configuração TLS foi alterada neste lote. |
| P03 | Cadeia de certificado falhava no cenário de produção testado. | **Resolvido e validado no trabalho anterior.** | Evidência do responsável de certificado e hostname validados. Não foi feita nova conexão de produção durante esta revisão. |
| P04 | UUID inválido gerava 500. | **Corrigido; testes automatizados aprovados.** | Validação estrita e teste para UUID malformado/HTTP 422 em `session-authorization.service.js` e `session-authorization.test.js`. |
| P05 | Aceite de termos não era persistido/versionado no fluxo Supabase. | **Implementado; teste real com banco pendente.** | Fluxo grava, de forma idempotente, os pares de versões em `terms_acceptances` quando recebe o aceite atual; teste automatizado de idempotência passou. A gravação no PostgreSQL remoto e a confiabilidade jurídica da declaração via metadata ainda precisam de revisão. |
| P06 | Dependências com advisories. | **Resolvido no lockfile revisado.** | Atualizações dirigidas compatíveis e `npm audit` de frontend/backend sem vulnerabilidades conhecidas. Depois da renovação OAuth real e do fluxo HTTP de envio simulado, a dependência Resend também foi removida. A entrega real continua sem teste porque não foi autorizada. |
| P07 | CSP ausente. | **CSP declarada; entrega em hospedagem pendente.** | Política adicionada em `frontend/vercel.json`. O `connect-src` inclui o host Render padrão e Supabase/Google; confirmar o hostname real da API e inspecionar os headers HTTP publicados antes de produção. Nenhum deploy foi feito. |
| P08 | Cadastro/login JWT e persistência JSON antigos permaneciam ativos. | **Fallback legado desativado fora dos testes.** | Em produção `/api/auth/*` não é montado e responde 410; ativação é limitada ao processo isolado de smoke test. Frontend limpa token JWT antigo e autentica via Supabase. `backend/data/db.json` foi preservado e continua válido; contagem local observada: zero usuários. Isso não prova ausência de usuários históricos/remotos nem dispensa inventário antes de migração. |
| P09 | Termos, privacidade e README descreviam arquitetura antiga. | **Documentação atualizada parcialmente; revisão de privacidade pendente.** | README e modal descrevem Supabase/PostgreSQL e fluxos atuais. Ainda definir retenção, contato de privacidade/suporte, páginas públicas e obter aprovação do texto antes de disponibilizar o OAuth a todos. |
| P10 | Overflow horizontal em viewports pequenos. | **Correção CSS local; validação visual pendente.** | Contenção horizontal aplicada sem alteração de identidade visual. Repetir inspeção real em 320/375 px, zoom e viewport baixo antes de declarar fechado. |
| P11 | Favicon PNG de 1.300.697 bytes. | **Resolvido localmente.** | Referências usam `frontend/public/arboris-tree.webp`, 100.494 bytes (redução aproximada de 92,3%). O PNG original foi preservado no repositório, mas não é a referência ativa. |
| P12 | Literais/textos com possível mojibake. | **UTF-8 verificado; busca anterior confundia `Ã` normal em palavras portuguesas.** | Checagem por code points encontrou texto UTF-8 correto em strings portuguesas representativas; não foram achadas sequências de mojibake nos trechos revisados. |
| P13 | Timeouts e limites operacionais incompletos. | **Implementado localmente; integração de produção pendente.** | Timeouts HTTP/PG, listener do pool, identificador de requisição e logs sanitizados presentes. Store de rate limit persistente usa HMAC e falha fechada. Migration aditiva `003_persistent_rate_limits.sql` ainda não foi aplicada; produção configurada para Postgres não deve ser liberada até essa tabela existir e o teste de integração passar. |
| P14 | Monitoramento e testes não cobriam o modelo novo. | **Cobertura automatizada ampliada; monitoramento e cobertura quantitativa pendentes.** | Adicionados testes de Auth Supabase, rate limit, provedor de e-mail e recusa da API legada. A primeira autorização OTP de sessão Supabase também dispara alerta pelo provedor configurado, sem duplicar na mesma sessão. Há `X-Request-ID` e log sanitizado, mas falta monitoramento externo e cobertura percentual. |
| P15 | Confirmação/recuperação e reenvio não tinham evidência ponta a ponta. | **UX e testes de unidade ajustados; E2E real pendente.** | Fluxo de recuperação confirma a senha e permite solicitar novo link; cliente Supabase usa timeout. Nenhum e-mail real foi enviado; confirmação, recuperação e reenvio em Auth remoto precisam de teste com caixa autorizada. |

### 16.1 Migration P01 — efeito, pré-condições e aplicação

O SQL efetivo está em [`backend/supabase/migrations/002_require_active_auth_session.sql`](backend/supabase/migrations/002_require_active_auth_session.sql). Além do preflight para `public.authorized_sessions` e dos tipos esperados em `auth.sessions`, a função substituída é:

```sql
create or replace function public.has_additional_authorization()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.authorized_sessions as extra_auth
    join auth.sessions as auth_session
      on auth_session.id = extra_auth.session_id
     and auth_session.user_id = extra_auth.user_id
    where extra_auth.user_id = (select auth.uid())
      and auth_session.user_id = (select auth.uid())
      and auth_session.id::text = (select auth.jwt() ->> 'session_id')
      and (auth_session.not_after is null or auth_session.not_after > statement_timestamp())
      and extra_auth.revoked_at is null
      and extra_auth.authorized_at <= now()
  );
end;
$function$;

revoke all on function public.has_additional_authorization()
  from public, anon, authenticated, service_role;
grant execute on function public.has_additional_authorization() to authenticated;
```

Todas as tabelas/funções são qualificadas por schema e o `search_path` fica vazio. A função não usa SQL dinâmico; `SECURITY DEFINER` é necessário para a checagem de sessão usada pelas políticas RLS, e sua execução fica restrita a `authenticated`. O `JOIN` e as duas comparações com `auth.uid()` impedem combinar autorização ou dados entre usuários. JWT sem `session_id`, sessão ausente/removida, autorização revogada ou autorização futura resulta em `false`. A função não altera tabelas, linhas, usuários nem políticas existentes.

**Destino e backup:** o projeto remoto identificado anteriormente é `thcdmdxusodfzzofsddv.supabase.co` (ref `thcdmdxusodfzzofsddv`). Os materiais locais pesquisados contêm migrations, mas nenhum dump/backup PostgreSQL; o acesso disponível nesta revisão também não mostrou a página de backups nem um teste de restauração. Portanto, a existência de backup adequado **não está confirmada**. O rótulo real do projeto — produção ou staging — também deve ser confirmado no Dashboard/CLI antes da execução.

Procedimento quando houver autorização explícita:

1. Confirmar no Supabase Dashboard o nome/ref do projeto, que é o ambiente pretendido, e um backup/PITR utilizável. Se necessário, gerar `pg_dump` criptografado fora do repositório e provar restauração em instância isolada. Sem restauração comprovada, não aplicar.
2. Conferir o histórico remoto com `supabase migration list --remote` e comparar schema/migration history. A migration 003 também existe localmente; não executar `migration up`/`db push` se isso incluir 003 sem autorização separada. O CLI aplica migrations pendentes em ordem e a tabela remota mantém o histórico; não executar só SQL manual no Editor e deixar o histórico dessincronizado.
3. Com autorização para P01, aplicar apenas a versão 002 pelo fluxo de migrations controlado, revisar o resultado SQL, depois conferir a versão registrada e a definição/grants da função. Se o fluxo aprovado executar SQL manualmente, registrar a versão aplicada com `supabase migration repair 002 --status applied --remote=<ref>` somente após verificar o schema real; `migration repair` altera somente o histórico, não executa SQL.
4. Antes de qualquer publicação, executar os testes reais abaixo contra Data API/PostgREST e Express. Usar a chave pública `anon` e JWT de contas comuns para as leituras/assertivas de RLS, nunca Secret/Service Key como evidência. Guardar somente status e resultados sanitizados.

### 16.2 Reversão P01

Em incidente, restaurar a versão anterior do helper (equivalente à migration 001), que **reabre a falha conhecida de revogação pela Data API**:

```sql
create or replace function public.has_additional_authorization()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.authorized_sessions
    where user_id = (select auth.uid())
      and session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and revoked_at is null
  );
$$;

revoke all on function public.has_additional_authorization()
  from public, anon, authenticated, service_role;
grant execute on function public.has_additional_authorization() to authenticated;
```

Depois de restaurar e verificar a definição, atualizar o histórico com `supabase migration repair 002 --status reverted --remote=<ref>`. Isso não deve ser tratado como solução permanente. Não apagar tabela/usuários/dados para reverter.

### 16.3 Regressão real obrigatória para P01

Executar depois da aprovação e aplicação, com duas contas de teste comuns (A/B), JWTs emitidos por Supabase Auth e nenhum acesso de leitura privilegiado:

1. Sem OTP: tentativas de ler recurso privado pela Data API e Express são negadas.
2. Após OTP válido, A lê seus próprios dados; `GET /api/session/me` retorna 200 e a identidade de A.
3. A não consegue ler nem alterar recurso pertencente a B pela Data API nem pelo Express.
4. Após revogar a sessão A no Supabase, repetir com o JWT capturado de A: Data API nega e Express nega.
5. Logout continua terminando localmente a sessão e revogando o acesso conforme o fluxo projetado.
6. JWT antigo de A não recupera autorização após revogação, mesmo que a linha em `authorized_sessions` permaneça.
7. Uma sessão válida recém-autorizada continua funcionando em `GET /api/session/me`.
8. Repetir o teste de RLS com JWT comum e papel `authenticated`, sem usar `service_role` nas chamadas sob teste; `EXPLAIN` não conta como evidência de autorização.

Preservar as contas de teste e as evidências até revisão; não apagar usuários ao final.

### 16.4 E-mail e autenticação legada

O backend agora normaliza `EMAIL_PROVIDER=gmail_api` para `gmail-api`; a validação de configuração de produção e o teste correspondente passaram. Em `backend/.env`, as quatro variáveis Gmail estão presentes uma vez cada, sem duplicatas; `GMAIL_SENDER_EMAIL` corresponde ao remetente de `EMAIL_FROM`. Não imprimi valores. A solicitação real ao endpoint OAuth retornou HTTP 200, access token válido por 3.599 segundos e escopo `gmail.send`. O fluxo local gerou MIME UTF-8 e a chamada `users.messages.send` foi interceptada com mock; **nenhuma mensagem real foi enviada**. Isso comprova a renovação das credenciais e o escopo emitido, mas não substitui a confirmação de aceitação/entrega pela Gmail API.

Os templates HTML e textos em português permanecem. OTP e alerta de novo acesso usam o mesmo provedor; o fluxo Supabase dispara alerta na primeira autorização de uma sessão, não em repetição da mesma sessão. Os testes mockados cobrem os dois templates e o envio do alerta. A SMTP local continua disponível em desenvolvimento, mas não foi modificada nesta tarefa; a configuração SMTP do Supabase Auth permanece separada e não foi alterada. Em Render Free, conexões SMTP de saída nas portas 25/465/587 são bloqueadas; o escopo `gmail.send` é sensível, e tokens OAuth emitidos enquanto o consentimento externo estiver em Testing expiram em sete dias. Confirmar o status de publicação OAuth no Cloud Console. Ver [limitações do Render Free](https://render.com/docs/free), [escopos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [expiração OAuth em Testing](https://developers.google.com/identity/protocols/oauth2/) e [política OAuth/domínios do Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

A dependência Resend foi removida do `package.json`/lockfile e a variável `RESEND_API_KEY` foi retirada do `.env` local. A chave externa do Resend não foi revogada no painel; essa revogação fica pendente se o serviço não for mais utilizado.

O JWT antigo e o repositório JSON foram inventariados: o Auth Router é montado somente no processo isolado de teste; o frontend envia login/cadastro pelo SDK Supabase apesar dos nomes legados de algumas funções; o `RequireSession` limpa token local antigo; `DashboardPage` usa logout Supabase; o botão Google preservado usa Supabase OAuth. Controllers/services antigos continuam no repositório para o smoke isolado, sem rota pública de produção. Não há fallback ativo para JSON após falha de login. `backend/data/db.json` permanece intacto e com zero usuários no inventário local desta revisão. Antes de remover definitivamente o código, exportar cópia com hash, inventariar usuários/dados da instância histórica sem exibir PII, definir mapeamento confirmado de identidades/perfis, migrar com `ON CONFLICT DO NOTHING` e validar amostras sob consentimento operacional. Nunca associar perfis somente por e-mail sem verificar identidade. Não importar, apagar ou fundir registros nesta etapa.

### 16.5 Verificações executadas e trabalho pendente

Nesta revisão automatizada: frontend `npm run build`, `npm run lint`, `npm test` (13 testes), backend `npm run check`, `npm test` (28 testes), `npm run test:smoke`, `npm audit` de frontend/backend e `git diff --check` passaram. Além dos testes HTTP simulados, houve renovação OAuth real sem exibir o token; a chamada Gmail `messages.send` foi interceptada em teste, sem alcançar o serviço. Também foi executado `transport.verify()` SMTP em trabalho anterior, sem envio. Build sem alerta de tamanho; JSONs dos manifestos e `db.json` parseiam corretamente; favicon webp pesa 100.494 bytes. Nenhum deploy, commit, push, migration remota ou envio de e-mail foi feito.

Próxima sequência de correção, sem refatoração global: (1) identificar ambiente e backup restaurável; (2) autorizar/aplicar P01 e concluir regressão A/B; (3) decidir separadamente a aplicação aditiva de P13 migration 003 antes de habilitar rate limit persistente no serviço; (4) obter autorização para um único envio de teste a destinatário controlado, se a confirmação de entrega Gmail for necessária, e confirmar o status OAuth Testing/produção; (5) revogar a chave antiga no painel Resend caso não haja outro consumidor; (6) revisar retenção, contato e páginas legais; (7) validar headers CSP e responsividade nos ambientes reais; (8) adicionar monitoramento/alertas externos, medir cobertura e completar E2E autorizado. O Dashboard novo continua fora do escopo.

## 17. Limpeza estrutural — 15/11/2026

Esta seção registra somente o trabalho desta limpeza. As mudanças locais preexistentes no working tree, inclusive Gmail API, autenticação, testes e migrations, foram preservadas. Nenhum banco, usuário, credencial, e-mail externo ou serviço remoto foi modificado. A seção 16 conserva a fotografia histórica anterior aos dois envios reais de Gmail API e à confirmação posterior de UTF-8 pelo responsável.

### 17.1 Inventário, método e medidas

Foram inventariados 97 arquivos de projeto fora de `node_modules`, `dist`, `.git`, `.tmp`, `.vite`, `coverage` e `.env` privado: 95 arquivos de código/configuração/ativos antes da limpeza e dois arquivos de cache Vite que estavam indevidamente rastreados. Também foram inspecionados os nomes, quantidades e tamanhos de 143 arquivos em `.tmp`. Após a limpeza, 94 arquivos de projeto permanecem no mesmo recorte e 39 evidências temporárias permanecem em `.tmp`. O hash SHA-256 dos 94 arquivos do recorte final não revelou arquivos idênticos nem vazios. O inventário de referências combinou imports, rotas, scripts npm, configuração Vite/Render/Vercel, CSS, HTML, assets públicos e uso indireto em testes. A ausência de import direto isoladamente não foi usada como prova de inutilização.

| Medida | Antes | Depois | Critério |
|---|---:|---:|---|
| Arquivos de projeto no recorte descrito | 95 | 94 | PNG removido; dois arquivos `.vite` contabilizados separadamente como cache rastreado |
| Arquivos `.tmp` | 143 | 39 | Somente 104 entradas de `npm-cache` removidas |
| Arquivos removidos no total | — | 107 | Três rastreados e 104 de cache local ignorado |
| Arquivos modificados nesta tarefa | — | 6 | `.gitignore` raiz, `.gitignore` frontend, `config.js`, `HoloBackground.jsx`, `index.css` e este relatório |
| Arquivos consolidados | — | 0 | Não houve duplicação comprovada que justificasse fusão |
| Linhas removidas da limpeza, excluindo este relatório | — | 56 | Diff das cinco mudanças textuais e dos dois metadados Vite excluídos |
| Linhas adicionadas da limpeza, excluindo este relatório | — | 6 | Diff das cinco mudanças textuais |
| Redução líquida de linhas, excluindo este relatório | — | 50 | Comentários e tokens CSS mortos; PNG binário não possui linhas |
| Dependências removidas nesta tarefa | — | 0 | As dependências presentes têm uso direto/indireto ou exigem migração |
| Tamanho do projeto no recorte, incluindo este relatório | 2.592.412 B | 1.299.075 B | Exclui `.git`, `node_modules`, `dist`, `.tmp`, `.vite`, caches e `.env`; inclui manifests, lockfiles e documentação |
| Artefato `frontend/dist` | 2.524.367 B | 1.222.385 B | Dois builds Vite na mesma instalação; queda de 1.301.982 B |
| CSS principal no build | 45,05 kB | 43,76 kB | Tamanho exibido pelo Vite, sem gzip |

O relatório cresceu nesta tarefa; sem a nova seção documental, o projeto ocupava 1.291.656 B após a limpeza dos arquivos e do CSS. O pacote `.tmp/npm-cache` tinha 104 arquivos e 9.296.254 B; os 39 arquivos de evidência restantes somam 26.541.100 B e continuam fora do Git.

### 17.2 Classificação e execução

| Classe | Item | Evidência | Ação/impacto |
|---|---|---|---|
| REMOVER | `frontend/public/arboris-tree.png` | Nenhuma referência em código, CSS, HTML ou configuração; favicon e logo usam `/arboris-tree.webp`. | Removido o PNG de 1.300.697 B. A identidade visual e as referências ativas permanecem. |
| REMOVER | `frontend/.vite/deps/_metadata.json` e `package.json` | Artefatos gerados pelo Vite, sem referência de aplicação ou script; estavam rastreados. | Removidos 11 linhas de metadados e adicionada regra `.vite` ao ignore do frontend. |
| REMOVER | `.tmp/npm-cache/**` | Cache npm local ignorado pelo Git, sem evidência de auditoria ou dependência operacional. | Removidos 104 arquivos. Capturas, JSONs e harnesses de auditoria preservados. |
| REMOVER | Tokens CSS sem uso em `frontend/src/index.css` | 38 declarações sem referência efetiva em CSS/JSX/JS, inclusive aliases que só apontavam para outros tokens não usados; a varredura posterior não encontrou tokens restantes com ocorrência única. | Removidas 40 linhas, preservando tokens ativos, media queries, classes e animações. |
| REMOVER | Comentário obsoleto em `backend/src/config.js` | Dizia que produção usa autenticação legada; o router legado responde 410 fora do processo de smoke. | Atualizado para descrever a validação real de Supabase Auth; sem alteração de lógica. |
| REMOVER | Caracteres corrompidos em comentários de `.gitignore` e `HoloBackground.jsx` | `subdiret?rio` e `atualiza??o` apareciam no código fonte. | Corrigidos para UTF-8; sem alteração funcional. |
| MANTER | Login, cadastro, confirmação, recuperação, PKCE, Google OAuth, OTP, termos, logout, proteção de rotas, splash, transições e Dashboard temporário | Rotas, componentes e testes mostram uso ativo. | Preservados. |
| MANTER | Gmail API/SMTP, Supabase Auth, PostgreSQL/TLS, RLS, revogação, rate limiting, certificados e migrations 001–003 | Integrações e controles de segurança ativos ou pendentes de aplicação controlada. | Preservados; nenhuma migration aplicada. |
| MIGRAÇÃO PENDENTE | JWT legado, `auth.routes`, controller/service/repository legados, `jsonStore`, `revokedTokens`, `verification.service`, `db.json` | O fluxo público de produção está desativado, mas o smoke test usa esses módulos e a ausência de contas históricas externas não foi comprovada. | Nada removido; exportar e mapear identidades antes de retirada definitiva. |
| REVISAR | `.tmp` de auditoria, `.htaccess`, variantes responsivas, classes CSS dinâmicas, variáveis de produção legadas | Evidência útil, uso indireto por hospedagem ou risco de regressão. | Mantidos até decisão com inventário do ambiente real. |
| CONSOLIDAR | Nenhum candidato com equivalência funcional e baixo risco comprovados | Frontend e backend compartilham funções centrais; a duplicidade remanescente de autenticação depende de migração. | Nenhuma consolidação forçada. |

Não foram encontrados imports/variáveis JavaScript não usados pelo ESLint, assets públicos restantes sem referência, arquivos vazios ou duplicatas byte a byte no recorte analisado. Todas as dependências declaradas foram confrontadas com imports, scripts e configuração: `@tailwindcss/vite`/`tailwindcss` são usados pelo Vite e pelo CSS; `lucide-react` por componentes; bibliotecas legadas do backend ainda sustentam o smoke e a preservação de identidades. Resend já havia sido retirado do manifest e do serviço em trabalho anterior. Nenhuma dependência foi alterada nesta tarefa.

As variáveis de `backend/.env` foram verificadas somente por nome: 24 chaves, sem duplicação; exemplos backend e frontend têm 25 e 3 chaves, também sem duplicação. Os valores privados não foram impressos nem alterados. A busca por formatos conhecidos de segredo em arquivos de projeto encontrou somente placeholders em `.env.example` e fixture de teste; isso é uma checagem heurística, não uma garantia absoluta. As regras de ignore cobrem `.env`, dados legados, `.tmp`, builds e agora o cache Vite. Uma variável de produção ligada ao legado só deverá ser retirada após encerrar a migração de contas e adaptar a validação de configuração.

### 17.3 Validação e pendências

| Verificação | Resultado | Evidência/limite |
|---|---|---|
| Frontend build | Aprovado | Vite transformou 1.867 módulos e gerou `dist` menor, sem import ou asset faltante. |
| Frontend lint | Aprovado | `npm run lint`, código 0. |
| Frontend testes | Aprovado | 4 arquivos, 13 testes, nenhum falhou. |
| Backend check | Aprovado | `npm run check`, código 0. |
| Backend testes | Aprovado | 29 testes, incluindo OTP, Gmail API simulada, autorização, rate limit e legado; nenhum falhou. |
| Referências e ignore | Aprovado no recorte local | Sem referência restante ao PNG ou aos metadados Vite; `git check-ignore --no-index` confirma `.vite`. |
| Integridade do diff | Aprovado | `git diff --check`, código 0; Git emitiu apenas avisos de normalização LF/CRLF preexistentes. |
| Testes remotos/visuais | Não executados | Esta limpeza não autoriza migration, e-mail real, deploy ou alteração de dados; inspeção manual visual no navegador continua útil para fechamento de responsividade. |

Antes de backup/aplicação das migrations: confirmar ambiente de destino e backup restaurável; aprovar e aplicar 002 separadamente de 003; fazer regressão RLS com JWTs comuns A/B; confirmar cabeçalhos CSP na hospedagem e o fluxo responsivo em dispositivos pequenos; definir retenção/contato da política de privacidade; inventariar contas históricas antes da remoção do legado. A migration 003 continua pendente para rate limiting persistente em produção. O Dashboard novo permanece fora do escopo.

## 18. Backup lógico pré-migrations — 15/11/2026

Esta seção atualiza a situação do backup descrita nas seções 16–17. Nenhuma migration ou escrita no banco original foi executada. O destino lido continua sendo o banco `postgres` do projeto Supabase já identificado; o rótulo operacional produção/staging ainda precisa ser confirmado pelo responsável.

| Estado | Evidência |
|---|---|
| Ferramentas | `pg_dump`, `pg_restore` e `initdb` 17.12 em pacote portátil EDB, fora do repositório. O servidor respondeu PostgreSQL 17.11; versão principal compatível. |
| Transporte | O dump utilizou `PGSSLMODE=verify-full`, a CA existente do backend e hostname da conexão em `backend/.env`; o processo não recebeu credenciais na linha de comando. A consulta anterior confirmou SSL e TLS 1.3. |
| Backup criado | `postgres-full-pre-002-003.dump`, 414.306 bytes, formato customizado, compactado, sem filtros de schema ou dados. Diretório privado: `%USERPROFILE%\ArborisX-Private-Backups\20261116T021012Z-pre-migrations`. |
| Conteúdo inspecionado | Catálogo com 674 linhas. Inclui `auth.users`, `auth.sessions`, dados correspondentes, 7 tabelas `public`, função `public.has_additional_authorization()`, políticas RLS, ACLs e privilégios padrão. Também há objetos de `storage`, `realtime`, `vault`, `extensions` e outros schemas Supabase. |
| Integridade | SHA-256 do dump conferido com o arquivo `.sha256`; manifesto SHA-256 de cinco artefatos conferido. `pg_restore --list` retornou 0; `pg_restore --file=NUL` leu/descompactou todo o arquivo com código 0. Logs sem erro/aviso. |
| Legado | `legacy-db.json`, 18 bytes, copiado sem tocar no original; SHA-256 de origem e cópia iguais. |
| Reversão 002 | `function-before-002.sql` contém definição real anterior e concessões `authenticated`/`service_role`; a função é `SECURITY DEFINER`, owner `postgres`, `search_path` vazio. Esse rollback específico reabre P01 e só deve ser usado em incidente. |
| Proteção | Diretório fora do Git, ACL restrita ao usuário atual e `SYSTEM`; nenhum principal amplo encontrado na ACL do dump. Não há comprovação de criptografia em repouso ou cópia externa. |
| Restauração isolada | **Não testada.** O pacote local oferece binários PostgreSQL, mas não uma instância Supabase isolada com roles, extensões e schemas gerenciados compatíveis. A inspeção pelo `pg_restore` não substitui uma restauração. |

**Limitações:** `pg_dump` é um backup lógico do banco acessível à role conectada; não inclui roles globais, senhas de roles, configurações externas de Auth/SMTP/OAuth/API, objetos binários do Supabase Storage nem chaves raiz de criptografia gerenciadas. O catálogo inclui metadados de Storage, não os arquivos. Um restore completo em projeto Supabase novo pode encontrar objetos gerenciados preexistentes e exige procedimento específico, extensões e revisão de ACLs. O dump local contém dados sensíveis de autenticação e está protegido por ACL, mas não por criptografia comprovada. Não chamar essa etapa de recuperação garantida.

**Procedimento de recuperação isolada:** criar um projeto Supabase de teste separado, registrar e conferir sua referência e string de conexão sem reutilizar a do original, preparar as extensões e roles necessárias conforme a documentação Supabase, validar TLS/CA, copiar o dump para armazenamento privado criptografado, conferir o manifesto SHA-256 e inspecionar `pg_restore --list`. Aplicar o dump somente no destino isolado, sem `--clean` no projeto original, registrar erros de objetos gerenciados e ajustar o procedimento para o projeto de teste. Depois conferir contagens sem exibir PII, definição/grants da função, políticas RLS, usuários Auth e acesso com contas de teste. Para reversão pontual de 002, preferir o SQL exportado acima sob transação e validação posterior. Nunca executar um restore completo no banco original como passo de teste.

**Próxima ação manual:** confirmar se o projeto atual é produção ou staging, providenciar um destino Supabase isolado para prova de restauração e escolher armazenamento externo criptografado para uma segunda cópia. Só depois avaliar autorização específica para aplicar a migration 002; a 003 requer decisão separada.

## 19. Aplicação controlada da migration 002 — 16/11/2026

Esta seção substitui o estado da migration 002 descrito nas seções anteriores. O usuário autorizou expressamente a aplicação no projeto principal, sem criar staging, e reconheceu que a restauração integral do backup ainda não foi testada.

| Verificação | Resultado | Evidência / pendência |
|---|---|---|
| Destino e pré-condições | Confirmados | `DATABASE_URL` e `SUPABASE_URL` apontavam para o mesmo projeto `thcdmdxusodfzzofsddv`, banco `postgres`; conexão com SSL e TLS 1.3. Colunas/tipos de `auth.sessions` e `public.authorized_sessions`, função anterior, owner e privilégios conferidos antes da execução. Nenhuma credencial foi impressa. |
| Backup e reversão | Disponíveis e íntegros | O manifesto SHA-256 dos cinco artefatos privados foi conferido novamente. `function-before-002.sql` conserva a definição anterior e seus privilégios. Restauração integral em ambiente isolado ainda não foi testada. |
| Migration 002 | **Aplicada e confirmada** | Arquivo SQL com SHA-256 `6910542e2ba94e9557198d4a7fca1fa151190e465f0e7845d704f9581e02d70e`. A transação executou `BEGIN`, o SQL da migration, as verificações de catálogo/privilégios/contagens e `COMMIT`. Evidência privada: `migration-002-application.json` no diretório do backup. |
| Função e privilégios | Atualizados | `public.has_additional_authorization()` agora junta `auth.sessions` por `session_id` e `user_id`, compara `auth.uid()` e o `session_id` do JWT, verifica `not_after`, `revoked_at` e `authorized_at`; permanece `SECURITY DEFINER`, owner `postgres`, `search_path` vazio. EXECUTE: `authenticated` e owner `postgres`; sem concessão a `PUBLIC`, `anon` ou `service_role`. |
| Preservação | Conferida no recorte verificado | As sete tabelas públicas mantiveram RLS, e as contagens das sete tabelas públicas, `auth.users` e `auth.sessions` permaneceram iguais antes e após o commit. A migration não contém comandos de exclusão de usuários, tabelas ou dados. |
| Backend | Funcionando | Instância local existente respondeu HTTP 200 em `/api/health`; nova consulta pelo pool confirmou conexão ao PostgreSQL, SSL/TLS 1.3 e a função atualizada. O health check isoladamente não consulta o banco. |
| Testes reais RLS | **Pendentes** | O banco apresentava zero registros em `auth.users` e `auth.sessions`. Não foram criadas contas, sessões ou JWTs; os cenários de OTP, isolamento A/B, revogação, JWT antigo, Express e Data API exigem contas comuns exclusivas de teste. P01 ainda não está completamente encerrada. |
| Migration 003 e histórico | Não aplicados | `public.api_rate_limits` não existe. A tabela `supabase_migrations.schema_migrations` também não existe neste banco; nenhum histórico foi criado ou reparado artificialmente. Antes de usar o CLI para migrations futuras, definir como acompanhar a 002 já aplicada manualmente. |
| Rollback | Não necessário | A transação foi confirmada e as verificações posteriores passaram. A reversão pontual está no arquivo privado `function-before-002.sql`, cuja aplicação reabriria P01 e requer decisão específica em caso de incidente. |

**Próxima ação:** disponibilizar contas exclusivas de teste A/B com sessões Supabase e JWTs de usuário comum, sem afetar usuários reais, para validar os oito cenários de autorização e revogação pela Data API e pelo Express. A migration 003 continua fora desta autorização.

## 20. Migration 003 e rate limiting persistente — 16/11/2026

Esta seção atualiza o estado da migration 003 nas seções anteriores. O usuário autorizou sua aplicação separada no projeto principal `thcdmdxusodfzzofsddv`; a 002 não foi reaplicada e nenhum histórico de migrations foi criado ou modificado.

| Verificação | Resultado | Evidência / limite |
|---|---|---|
| Destino, backup e reversão | Confirmados antes da aplicação | `DATABASE_URL` e `SUPABASE_URL` correspondem ao projeto principal, banco `postgres`; TLS 1.3 ativo. O manifesto SHA-256 do backup privado passou novamente. `rollback-003.sql`, preparado no diretório privado do backup, só remove a tabela nova se ela estiver vazia e usa `DROP TABLE ... RESTRICT` em transação. A restauração integral do dump continua sem teste isolado. |
| Migration 003 | **Aplicada com commit** | SQL de `backend/supabase/migrations/003_persistent_rate_limits.sql`, SHA-256 `f3779baad764718547f68bbb8d1310039cab0fd9761ad5b93d396b091f3693f0`, executado entre `BEGIN` e `COMMIT`. Catálogo, privilégios, contagens e função da 002 foram conferidos antes do commit e novamente depois. Evidência privada: `migration-003-application.json`. |
| Estrutura e acesso | Confirmados | `public.api_rate_limits` tem `limiter` text, `key_hash` bytea, `hit_count` integer, `window_started_at`/`expires_at` timestamptz, três checks, chave primária `(limiter,key_hash)` e índice de expiração. RLS habilitada, zero políticas; `anon`, `authenticated` e `service_role` sem privilégios diretos. Tentativas de SELECT, UPDATE e DELETE sob `SET LOCAL ROLE anon/authenticated` receberam erro 42501. Esse teste de papéis não equivale a autenticação com JWT real. |
| Preservação | Confirmada no recorte verificado | Contagens das sete tabelas públicas anteriores e de `auth.users`/`auth.sessions` não mudaram; as sete tabelas mantiveram RLS e a função da 002 manteve o mesmo hash antes e depois. A migration não contém exclusão de usuários ou dados anteriores. |
| Integração Express/PostgreSQL | **Comprovada quando configurada para postgres** | O store usa HMAC SHA-256 do identificador, UPSERT atômico, expiração por janela fixa e exclusão periódica de registros expirados. Um processo isolado com `RATE_LIMIT_STORAGE=postgres` chamou `/api/session/me` sem token: recebeu 401 e gravou exatamente uma tentativa na tabela; `/api/health` respondeu 200. Em produção, `config.js` exige PostgreSQL para rate limiting. A instância local já em execução não foi reiniciada e seu `.env` de desenvolvimento deixa `RATE_LIMIT_STORAGE` sem valor, usando memória por padrão. |
| Persistência e concorrência | **Testes reais aprovados** | Dois processos Node separados compartilharam a mesma contagem (1, 2, 3); oito incrementos concorrentes produziram contagens únicas de 1 a 8. Cinco requisições concorrentes a uma rota Express com limite 2 deram dois HTTP 200 e três HTTP 429, todos os 429 com `Retry-After` positivo. |
| Expiração, limpeza e falha | **Testes reais aprovados no recorte** | Janela curta expirou e a próxima tentativa reiniciou em 1. Exclusão condicionada a `expires_at <= now()` removeu um registro vencido criado pelo próprio teste; todos os registros `test003:*` foram removidos e a contagem residual foi zero. Falha simulada do PostgreSQL gerou HTTP 503, sem executar o handler protegido. O timer automático de 15 minutos foi revisado no código, sem aguardar seu ciclo real. |
| Limites efetivos | Delimitados | `/api/session/*` tem limite global por IP (120/15 min), mais `/challenge` 10, `/verify` 20, `/resend` 10 e `/logout` 30 por IP. O serviço OTP mantém limites por usuário/sessão no PostgreSQL: cinco envios por 15 minutos, cinco tentativas e espera de 60 segundos para reenvio. O roteador JWT legado contém limites, mas permanece desabilitado fora dos testes. Login, cadastro, recuperação e reenvio de confirmação do frontend chamam Supabase Auth diretamente; não passam pelo Express nem por `api_rate_limits`, dependendo dos controles nativos do Supabase. |
| Testes locais específicos | Aprovados | `node --test test/postgres-rate-limit-store.test.js`: 2/2. Health check da instância local existente: HTTP 200. Não houve e-mails, OTPs reais, bloqueio de contas ou teste de carga agressivo. |
| Rollback e histórico | Rollback não necessário | Commit e verificações posteriores passaram. A tabela `supabase_migrations.schema_migrations` estava ausente na revisão anterior; nenhum histórico artificial foi criado. Antes de usar o CLI de migrations, documentar como acompanhar as migrations 002/003 aplicadas manualmente. |

**Pendências:** concluir os testes P01 com JWTs comuns A/B; revisar separadamente a configuração e os limites nativos do Supabase Auth para chamadas diretas; reiniciar uma instância de desenvolvimento com `RATE_LIMIT_STORAGE=postgres` se for necessário usar persistência local contínua. A instalação de produção precisa receber a configuração adequada e passar por validação após deploy, que não foi autorizado nesta etapa. Não atribuir aos limitadores Express proteção de endpoints chamados diretamente no Supabase.

## 21. Preparação da consolidação definitiva de autenticação — 16/11/2026

### 21.1 Inventário sem exposição de dados pessoais

| Fonte | Resultado | Evidência e limite |
|---|---|---|
| `backend/data/db.json` | **0 usuários legados** | JSON válido, 18 bytes, somente a chave `users` com array vazio. O `DATA_FILE` resolvido a partir do diretório `backend` aponta para esse arquivo. A cópia privada `legacy-db.json` existe e conserva o mesmo SHA-256. Nenhum nome, e-mail, hash ou senha foi exibido. |
| Revogação JWT em arquivo | Sem arquivo atual | O caminho `revoked-tokens.json`, derivado de `DATA_FILE`, não existe. |
| Supabase Auth principal | **0 usuários, 0 identidades** | Consulta agregada e somente leitura em `auth.users` e `auth.identities`: zero identidades Google, zero contas com hash de senha. Logo, não há e-mails/IDs/datas a comparar nem duplicidades observadas neste projeto. |
| Dados públicos associados | Perfis, termos, sessões autorizadas e dispositivos: 0 | `public.security_events` contém 9 eventos, todos com `session_id` e sem `user_id`; preservá-los. `api_rate_limits` tinha 0 registros na consulta. O inventário não prova ausência de contas em outros projetos, backups ou deploys antigos. |

### 21.2 Componentes e classificação

| Componente | Classificação | Motivo / dependência |
|---|---|---|
| `frontend/src/lib/api.js`, `supabase.js`, `AuthCallback`, `AuthConfirm`, `RequireSession` e `backend/src/routes/session.routes.js`, `middleware/supabaseSession.js`, `services/supabase.service.js`, `services/session-authorization.service.js` | Necessários | Fluxo Supabase ativo, PKCE, confirmação, recuperação, OTP de seis dígitos, autorização por sessão, revogação e proteção de rota. `RequireSession` recusa acesso enquanto `/api/session/me` não confirma autorização adicional. |
| `backend/src/routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `middleware/auth.js` | Obsoletos após autorização de retirada | Endpoints JWT próprios; atualmente só podem ser habilitados com `NODE_ENV=test` e `LEGACY_AUTH_ENABLED=true`. Em uso normal `/api/auth/*` responde 410. |
| `repositories/user.repository.js`, `store/jsonStore.js`, `store/revokedTokens.js`, `services/verification.service.js`, `services/device.service.js`, `services/google-identity.service.js`, `validators/auth.validator.js` | Obsoletos após revisão de testes | Persistência JSON, revogação de JWT próprio, OTP em memória, device cookie legado e Google ID token legado. O Google OAuth ativo é o do Supabase, separado desse serviço. |
| `bcryptjs`, `jsonwebtoken`; `JWT_SECRET`, `JWT_EXPIRES_IN`, `DATA_FILE`, `REVOCATION_FILE`, `LEGACY_AUTH_ENABLED`, `GOOGLE_CLIENT_ID` e configuração JWT em `render.yaml`/`.env.example` | Dependentes da retirada do código | Uso encontrado apenas no fluxo legado e nos testes/smoke correspondentes. `OTP_SECRET` **permanece necessário** para OTP atual e HMAC do rate limiting; Gmail API, banco, migrations 002/003 e rate limiting não dependem de bcrypt/JWT próprio. Não retirar dependências antes de adaptar o smoke e a configuração. |
| `backend/scripts/smoke.js`, `test/verification.test.js`, partes de `test/architecture.test.js` e `package.json` (`check`, `test:smoke`) | Migráveis | Exercitam o legado ou o validam sintaticamente. Substituir por verificações de sessão Supabase e da recusa de `/api/auth/*` antes de apagar módulos. |
| `frontend/src/lib/auth.js`, chamadas `clearLocalAuthState` e detecção do token antigo em `RequireSession` | Necessários temporariamente | Removem chaves antigas do navegador e recusam JWT legado; não autenticam usuários. Retirar somente depois de avaliar sessões antigas nos navegadores. |
| `backend/data/db.json`, cópia privada e 9 eventos de segurança | Preservar | Nenhuma exclusão ou reinicialização foi autorizada. O JSON está vazio, mas é evidência de inventário; os eventos não têm vínculo de usuário atual. |

| Arquivo ou componente para retirada futura | Motivo | Dependências a resolver | Risco se removido antes da revisão |
|---|---|---|---|
| `routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `middleware/auth.js` | Login, cadastro, Google ID token e JWT próprios | `app.js`, smoke legado, configuração de testes | Quebrar smoke/contrato `/api/auth/*`; não reativar a rota durante a transição. |
| `repositories/user.repository.js`, `store/jsonStore.js`, `store/revokedTokens.js`, `services/verification.service.js`, `services/device.service.js`, `services/google-identity.service.js`, `validators/auth.validator.js` | Persistência e segurança exclusivas do legado | Rotas/serviço legado, testes e `DATA_FILE` | Perder acesso a registros históricos se aparecer outra base legada; revisar antes de excluir. |
| `bcryptjs`, `jsonwebtoken`, variáveis JWT/JSON e blocos correspondentes de `config.js`, `.env.example`, `render.yaml` | Sem consumidor após retirada do código antigo | `package.json`/lockfile, smoke, check, deploy config | Falha de inicialização ou teste se a ordem de retirada for incorreta. |
| `scripts/smoke.js` e testes legados | Exercitam endpoints a serem aposentados | Substituição por smoke Supabase/OTP e teste de resposta 410 | Perda de cobertura de regressão se apenas apagados. |
| Chaves antigas do navegador em `lib/auth.js`/`RequireSession` | Limpeza transitória após migração dos clientes | Navegadores ainda com JWT armazenado | UX confusa ou retorno de estado antigo se removida cedo. |

### 21.3 Migração de identidades e retirada proposta

**Método para o estado observado:** não há usuários legados a importar nem contas Supabase para conciliar. Preservar o backup e o JSON, confirmar que outros ambientes/deploys não possuem bases legadas diferentes e, após autorização específica, retirar o código JWT e os testes antigos em uma mudança focada. O Supabase Auth já é o único provedor habilitado no processo normal. A aplicação conserva `/api/auth/*` com resposta 410 até a decisão de contrato para clientes antigos. A limpeza local deste turno apenas tornou o carregamento das rotas legadas condicional, sem mudar a chave de habilitação de testes.

**Se surgirem registros legados em outro ambiente:** inventariar por identificador interno, e-mail normalizado, identidade Google `sub`, tipo de conta, hash, data de cadastro, aceite e referências. Não tratar igualdade de e-mail como prova de propriedade. Para contas com senha e hash bcrypt compatível, a documentação oficial do Supabase descreve importação por `auth.admin.createUser({ password_hash })`, executada somente no backend e depois de testar a compatibilidade; não escrever diretamente em `auth.users`. Confirmar e-mail apenas mediante evidência verificável. Para Google, usar um fluxo Supabase de vínculo iniciado pelo usuário autenticado e comprovado; nunca copiar `googleSub` diretamente para `auth.identities`. Se hash/identidade não puder ser migrado com segurança, convidar o titular a definir senha pelo fluxo oficial de recuperação. Criar um mapeamento auditável de ID legado para UUID Supabase antes de transportar perfis ou referências; não inventar senhas, datas ou consentimento. Nenhuma dessas operações foi necessária ou executada nesta revisão.

Fontes oficiais para esse plano condicional: [migração com `password_hash` pelo Admin API](https://supabase.com/kb/guides/migrate-from-auth0), [vínculo de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking) e [convite/recuperação de conta](https://supabase.com/docs/guides/auth/users).

**Reversão da limpeza local:** voltar ao import estático de `auth.routes.js` em `app.js` se a mudança causar problema; o comportamento externo permanece 410 quando o legado está desabilitado. Após a futura retirada definitiva, a reversão de código só deve ocorrer a partir de revisão isolada, sem religar as rotas JWT em produção nem reconstruir contas por e-mail. Os backups do JSON e do PostgreSQL devem continuar preservados.

### 21.4 Segurança, rate limiting local e validação

- `backend/.env` foi inspecionado somente quanto a nomes/configuração não secreta: `NODE_ENV=development`, `RATE_LIMIT_STORAGE=postgres`, `LEGACY_AUTH_ENABLED` ausente (portanto falso). Nenhum valor de credencial foi alterado. Para a instância local usar a tabela da migration 003, encerrar o processo backend atual, iniciar novamente em `backend/` com `npm run dev` ou `npm start`, confirmar `/api/health` e uma tentativa controlada em `/api/session/*` que incremente `api_rate_limits` sem bloquear conta/IP legítimo. O processo já em execução pode ter lido configuração anterior.
- A API normal não aceita JWT próprio: `/api/auth/*` responde 410 e as rotas privadas usam `verifyAccessToken` do Supabase, existência em `auth.sessions` e autorização adicional em PostgreSQL. As políticas RLS da 002 exigem a mesma sessão Auth e autorização não revogada. Testes reais A/B com JWTs comuns, incluindo Data API e revogação, permanecem pendentes; a ausência de usuários impede afirmar fechamento completo de P01.
- `frontend` usa apenas URL e chave publicável Supabase. Chaves privadas Gmail/PostgreSQL não foram adicionadas ao bundle. A confirmação de e-mail permanece exigida em `session-authorization.service.js`; o OAuth Google ativo continua no Supabase. Nenhuma mudança foi feita em OAuth, SMTP, Gmail, TLS ou migrations.
- Alterações locais deste turno: `backend/src/app.js` carrega `auth.routes.js` apenas quando o modo legado de teste estiver habilitado; `backend/test/legacy-auth-disabled.test.js` verifica que os módulos legados não carregam no modo normal e que `/api/auth/me` devolve 410 com bearer legado. Testes focados: 16/16 backend (`architecture`, recusa do legado, autorização/OTP Supabase) e 8/8 frontend (`api`, `auth`, `supabase`); `node --check src/app.js` e `git diff --check` sem erros. Nenhum e-mail real, usuário, sessão ou dado remoto foi modificado.

**Autorização ainda necessária:** após confirmar que não existem outras bases legadas relevantes, aprovar a retirada definitiva dos módulos, variáveis, dependências e smoke JWT listados acima. Essa etapa deverá manter o JSON/backups e preservar os fluxos Supabase, OTP, RLS e rate limiting.

## 22. Remoção definitiva da autenticação legada — 16/11/2026

Esta seção atualiza a proposta da seção 21. O usuário autorizou a retirada após o inventário final. A autenticação da aplicação passa exclusivamente pelo Supabase Auth e pela autorização adicional de sessão do Arboris.X; a resposta HTTP 410 de `/api/auth/*` permanece como contrato explícito para clientes antigos.

| Verificação | Resultado | Evidência / limite |
|---|---|---|
| Inventário final | Sem usuários ou dados de negócio legados no ambiente analisado | `backend/data/db.json` é JSON válido de 18 bytes, contém `users: []` e não foi alterado. `DATA_FILE` local apontava para esse arquivo. A cópia privada `legacy-db.json` existe e tem o mesmo SHA-256 do original. Em `C:\xampp\htdocs`, há uma instalação Arboris.X e um `db.json`; a busca nesse escopo não prova ausência de instalações externas. Consulta remota somente leitura: `auth.users=0`, `auth.identities=0`, `public.profiles=0`; nove `security_events` preservados. |
| Código legado | Removido | Excluídos `routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `middleware/auth.js`, `repositories/user.repository.js`, `store/jsonStore.js`, `store/revokedTokens.js`, `services/verification.service.js`, `services/device.service.js`, `services/google-identity.service.js` e `validators/auth.validator.js`. Excluído o teste exclusivo `test/verification.test.js`. A implementação antiga não pode mais ser ativada por `LEGACY_AUTH_ENABLED`, mesmo se a variável estiver presente. |
| Rotas antigas | HTTP 410 | `app.js` responde 410 em qualquer `/api/auth/*`, inclusive cadastro e `/me`, antes de qualquer autenticação ou escrita JSON. Um teste automatizado define `LEGACY_AUTH_ENABLED=true` e comprova a recusa. A instância local já em execução respondeu 410 em `/api/auth/me`; reiniciá-la ao validar o código final em operação. |
| Dependências | Removidas do backend | `bcryptjs`, `jsonwebtoken` e `google-auth-library` não tinham consumidores ativos após a retirada e saíram de `package.json`/`package-lock.json` com `npm uninstall --ignore-scripts` (30 pacotes transitivos removidos). `@supabase/supabase-js`, `pg`, `nodemailer` e demais dependências atuais permanecem. `GMAIL_CLIENT_ID` não é a antiga variável `GOOGLE_CLIENT_ID`. |
| Configuração | Limpa no código e exemplos | `config.js`, `.env.example` e `render.yaml` não configuram JWT próprio, arquivo de usuários ou ativação legada. Remoção manual recomendada de `backend/.env`: `JWT_SECRET`, `JWT_EXPIRES_IN`, `DATA_FILE` e `GOOGLE_CLIENT_ID`. `LEGACY_AUTH_ENABLED` não consta no `.env` local; se estiver em outro ambiente, removê-la. `REVOCATION_FILE` também pode ser removida se existir em outro ambiente. Preservar `OTP_SECRET`, `GMAIL_CLIENT_ID`, demais `GMAIL_*`, Supabase, PostgreSQL e TLS. Nenhum valor secreto foi impresso ou alterado. |
| Arquivos modificados nesta retirada | Mudança focada | `AGENTS.md`, este relatório, `backend/.env.example`, `backend/README.md`, `backend/package.json`, `backend/package-lock.json`, `backend/scripts/smoke.js`, `backend/src/app.js`, `backend/src/config.js`, `backend/src/middleware/errorHandler.js`, `backend/test/architecture.test.js`, `backend/test/legacy-auth-disabled.test.js`, `frontend/src/lib/api.test.js`, `frontend/src/lib/supabase.test.js` e `render.yaml`. O código de produção do frontend e os arquivos de migrations 002/003 não foram modificados nesta retirada. Há outras alterações locais anteriores no worktree, preservadas. |
| Volume de retirada | 993 linhas antigas no recorte | Comparação com `HEAD`: 769 linhas dos 12 arquivos legados/teste excluídos e 224 linhas da implementação anterior do smoke substituída. O novo smoke adiciona 55 linhas nesse diff; há ainda exclusões pontuais de configuração e documentação. Esta medida é relativa ao `HEAD` e pode incluir mudanças locais anteriores nesses arquivos. |
| Fluxos atuais | Preservados por revisão e testes automatizados | Login e cadastro Supabase, confirmação de e-mail, OAuth Google via Supabase e callback PKCE, recuperação de senha, OTP, autorização por sessão, logout, limpeza de tokens antigos do navegador, proteção de API, RLS, rate limiting PostgreSQL, Gmail e health check. Os testes de e-mail usam mocks, sem envio real. A limpeza de tokens antigos no navegador foi mantida para evitar estados inconsistentes; ela não autentica. |
| Verificação automatizada | Aprovada | Backend `npm run check`, `npm test` (23/23) e `npm run test:smoke` passaram. O smoke local simula Supabase/PostgreSQL e obteve health 200, rotas antigas 410, token ausente/inválido 401, sessão sem OTP 403, sessão autorizada 200, logout 200, sessão revogada 403 e sessão removida 401. Frontend `npm run build`, `npm run lint` e `npm test` (17/17) passaram. `git diff --check` passou. Estes resultados não substituem testes de autorização com JWTs reais. |
| Verificação real e pendência P01 | Parcial | O inventário remoto foi somente leitura e a instância local respondeu health 200 e rota antiga 410. Não foram criados usuários, sessões ou OTPs reais; os testes de RLS A/B, revogação e JWT antigo pela Data API e pelo Express continuam pendentes com contas comuns exclusivas. P01 ainda não deve ser declarada encerrada. Nenhum deploy foi feito, portanto não há validação da versão nova no ambiente publicado. |

**Próxima ação manual:** retirar as variáveis obsoletas indicadas do `backend/.env` e do painel de configuração do ambiente publicado quando for apropriado; reiniciar o backend para carregar o código novo e conferir health/410. Para encerrar P01, preparar contas comuns de teste A/B com sessões Supabase e executar os cenários reais de OTP, isolamento e revogação pela Data API e pelo Express, sem usar Service Role como prova de RLS.

## 23. Validação final de autenticação e segurança — 16/11/2026

As contas comuns A/B foram identificadas pelo usuário fora de qualquer troca de senhas, OTPs ou JWTs. Esta etapa fez apenas leituras agregadas do banco remoto e requisições HTTP sem credenciais válidas. Nenhuma conta, sessão ou dado de negócio foi criado, alterado ou revogado; não houve envio de e-mail, deploy nem teste de carga.

| Verificação | Resultado | Evidência / limite |
|---|---|---|
| Estado das contas A/B | **Existem e estão confirmadas** | Consulta remota somente leitura, sem imprimir e-mails/IDs: A e B tiveram uma correspondência cada, `email_confirmed_at` presente, perfil presente e uma identidade Google por conta. A tinha 0 sessões Auth e 0 autorizações ativas no instante da consulta; B tinha 2 sessões Auth e 1 autorização ativa. O projeto tinha 3 usuários, 5 identidades, 2 sessões Auth e 16 eventos de segurança. Esses números não comprovam que cadastro, confirmação, login Google ou vinculação ocorreram corretamente nesta execução. Não se desfez vínculo para repetir o teste. |
| Express sem token ou com JWT inválido | **Aprovado, teste HTTP real** | Backend local: `/api/health` 200; `/api/session/me` sem bearer 401 e com bearer inválido 401; `/api/auth/me` com token legado 410. Nenhum token válido foi obtido ou exibido. O resultado de um token inválido não substitui o teste de um JWT válido já expirado. |
| Data API anônima e com bearer inválido | **Aprovado, teste HTTP real limitado** | `GET /rest/v1/profiles?select=id&limit=1` com chave publicável, sem sessão comum, retornou 401/código `42501`; com bearer inválido, 401/código `PGRST301`. Não se usou Secret Key ou Service Role. Ainda falta repetir com JWTs comuns A/B antes/depois do OTP e após revogação. |
| Catálogo RLS e rate limiting | **Configuração presente, leitura real** | `profiles`, `authorized_sessions`, `login_challenges`, `terms_acceptances` e `api_rate_limits` têm RLS ativada. As políticas SELECT de `profiles` e `authorized_sessions` restringem por `auth.uid()` e `has_additional_authorization()`. A função continua `SECURITY DEFINER` com `search_path` vazio. Existem buckets `session:global`, `session:challenge`, `session:verify` e `session:logout` no PostgreSQL; esta leitura não prova, sozinha, bloqueio 429 nem persistência entre reinícios. Os testes reais anteriores da seção 20 continuam a evidência de persistência/concorrência. |
| Verificações automatizadas novas e focadas | **Aprovadas, com simulações** | Quatro testes existentes de recusa do legado e do store de rate limiting passaram (4/4). Um teste novo de `verifyAccessToken` passou (1/1): com `getUser` simulado, aceita claims coerentes e recusa `exp` passado, usuário/issuer/session_id divergentes e resposta inválida do Supabase. O teste não simula uma assinatura real nem substitui JWT expirado válido. ESLint dos dois componentes alterados e `git diff --check` passaram. |
| Tratamento de erro e texto de privacidade | **Corrigido localmente** | `GoogleSignInButton.jsx` continha texto literal `N?o foi poss?vel` e uma mensagem de progresso com `?`; `ModaisArboris.jsx` continha caracteres `?` no parágrafo de dados e provedores. Corrigidos para UTF-8 sem alterar layout ou fluxos. Arquivo novo: `backend/test/supabase-token.test.js`. Nenhum outro arquivo de produção foi alterado nesta etapa. |
| Fluxos com sessão comum válida | **Pendentes de ação no navegador** | Cadastro/confirmação observados ponta a ponta, login por senha, OTP real, proteção antes do OTP, Google login, vinculação, recuperação/redefinição, logout, isolamento A/B, JWT válido/expirado, revogação e JWT antigo no Express/Data API ainda não foram observados nesta execução. A presença de registros confirmados e vínculos Google é evidência de estado, não de cada sequência operacional. |

### 23.1 Checklist manual para concluir P01 sem compartilhar segredos

1. Usar perfis ou janelas de navegador separados para A e B. Não enviar senhas, OTPs, links de confirmação, refresh tokens ou JWTs no chat. Registrar somente resultado, status HTTP e horário aproximado.
2. Em A, entrar por senha e, antes do OTP, tentar `/dashboard` e consultar `/api/session/me`: a rota privada deve bloquear/redirecionar e o Express deve retornar 403. Pela Data API, `profiles` deve retornar zero linhas para a sessão ainda não autorizada. Repetir em B.
3. Concluir o OTP de seis dígitos de cada conta. `/api/session/me` deve retornar 200. A consulta `profiles` pela Data API com o JWT comum de A deve devolver somente o perfil de A; com o de B, somente o de B. Consultar todos os perfis disponíveis à conta (sem filtro) torna visível qualquer vazamento A/B. Não publicar IDs nem dados pessoais no relatório do teste.
4. Verificar login Google de cada conta e se o vínculo já registrado aparece na interface. Como ambas já têm uma identidade Google, não desvincular para repetir o ato de associação. Confirmar se a vinculação foi feita manualmente pelo fluxo da conta autenticada; se não houver evidência do ato, mantê-lo como pendente.
5. Em uma conta de teste, usar a recuperação, abrir o link no navegador, definir nova senha e entrar novamente. Confirmar erro legível para link inválido/expirado, sem compartilhar o link. O estado atual do banco não prova a entrega nem a redefinição.
6. Em uma sessão de teste autorizada, guardar o JWT antigo apenas em memória local durante o teste, encerrar a sessão pelo fluxo de logout e tentar o mesmo JWT novamente em `/api/session/me` e em `profiles` pela Data API. Esperado: Express 401/403; Data API 401/403 ou 200 com zero linhas, jamais dados privados. Depois conferir que outras sessões de teste não perderam autorização indevidamente. Executar essa revogação apenas por ação explícita do titular da conta de teste.
7. Para JWT expirado, usar um token genuíno de teste após expirar, sem expô-lo. Esperado: 401 no Express e na Data API. Um bearer artificial com assinatura inválida não comprova esse caso. Confirmar rate limiting persistente pelo registro da seção 20 ou com um único cenário controlado após reinício, sem tentar bloquear IP ou conta legítima.

**Situação de P01:** migration 002 aplicada e configuração RLS conferida; **validação real A/B e revogação com JWTs comuns ainda pendentes**. P01 permanece aberta. As ações no navegador dependem do titular das contas; compartilhar apenas resultados e códigos HTTP permite atualizar este relatório sem expor credenciais.

## 24. Acompanhamento P01 após testes manuais — 16/11/2026

O usuário informou que o Dashboard bloqueou acesso sem login, que o login com senha funcionou, que o Dashboard permaneceu bloqueado antes do OTP e que foi liberado após OTP válido. São **resultados manuais informados pelo titular**, sem captura independente de requisições/JWT nesta etapa. Não foram repetidos testes automatizados já aprovados.

| Verificação | Resultado comprovado / limite |
|---|---|
| Estado atual das contas de teste | Consulta SQL remota somente leitura, sem imprimir identificadores: A tinha **0** sessões em `auth.sessions`, **0** autorizações ativas e **6** registros de autorização revogados; B tinha **2** sessões Auth não expiradas, **1** autorização ativa ligada a uma sessão Auth existente e **1** registro revogado. A existência de uma sessão B no banco não entrega seu JWT ao agente. |
| Autorização adicional e isolamento A/B | Os quatro resultados de navegação/login/OTP acima foram informados pelo usuário. Ainda **não houve requisição Data API com JWT comum de A nem de B** nesta etapa; tampouco foi feita leitura de todos os perfis com cada identidade. O estado das tabelas e as políticas RLS não substituem essa prova. |
| Express e Data API após logout/revogação | **Pendentes de teste com o mesmo JWT comum anterior ao logout.** Nenhuma sessão foi revogada pelo agente: a instrução atual proíbe alterar sessões sem autorização específica e o JWT está apenas no navegador do titular. Registros revogados observados no banco não provam, por si, que o bearer antigo foi recusado por ambas as APIs. |
| Dados e ambiente | Nenhuma conta, sessão, autorização ou dado remoto foi alterado nesta etapa. Não foram usados Service Role, Secret Key, senhas, OTPs, refresh tokens ou JWTs no chat. Não houve deploy nem alteração de código da aplicação. |

### 24.1 Procedimento manual exato, sem expor tokens

Usar **a aplicação local via Vite** e o Console das ferramentas do navegador. Executar o primeiro bloco em janelas/perfis separados para A e B, uma vez **antes** do OTP e outra **após** o OTP. O bloco usa o JWT da sessão do próprio navegador e imprime somente status, contagem e um booleano; não imprime IDs ou tokens. Em cada conta, antes do OTP, esperar Express 403 e Data API com zero linhas; depois do OTP, esperar Express 200 e exatamente uma linha própria. Se a Data API responder erro, registrar apenas `dataApi`, `errorCode` e `rows`.

```js
await (async () => {
  const { supabase } = await import('/src/lib/supabase.js');
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!session || !user) throw new Error('Entre na conta de teste antes de executar.');
  const express = await fetch('http://localhost:3001/api/session/me', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const { data, error, status } = await supabase.from('profiles').select('id');
  console.log({
    express: express.status, dataApi: status, rows: data?.length ?? null,
    onlyOwn: data?.every((row) => row.id === user.id) ?? null,
    errorCode: error?.code ?? null,
  });
})();
```

Para testar revogação, o titular deve **autorizar a alteração da própria sessão de teste ao executar o próximo bloco**, já depois do OTP. O bloco chama o logout do Express, reutiliza em memória o JWT anterior nas duas APIs, imprime somente status/contagem e então faz `signOut` no Supabase. Executar em uma sessão de teste que pode ser encerrada; não executar em conta/sessão de uso real. Esperado: Express 403 ou 401 e Data API sem dados privados (401/403 ou 200 com zero linhas). Registrar também se outra sessão de teste ainda consegue usar somente seus próprios dados.

```js
await (async () => {
  const { supabase } = await import('/src/lib/supabase.js');
  const { sessionRequest } = await import('/src/lib/api.js');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Entre e confirme o OTP antes de executar.');
  const oldJwt = session.access_token;
  await sessionRequest('/logout', { method: 'POST', body: '{}' });
  const express = await fetch('http://localhost:3001/api/session/me', {
    headers: { Authorization: `Bearer ${oldJwt}` },
  });
  const dataApi = await fetch(`${supabase.supabaseUrl}/rest/v1/profiles?select=id`, {
    headers: { apikey: supabase.supabaseKey, Authorization: `Bearer ${oldJwt}` },
  });
  const payload = await dataApi.json().catch(() => null);
  console.log({ logout: 200, express: express.status, dataApi: dataApi.status,
    rows: Array.isArray(payload) ? payload.length : null });
  await supabase.auth.signOut();
})();
```

Se a aplicação estiver em build de produção em vez do Vite, os imports `/src/lib/...` acima não estarão disponíveis; nesse caso, usar a aba Network do navegador para repetir as mesmas requisições com a sessão atual, sem copiar o bearer para o chat. Nunca colar o resultado bruto de `getSession`, `getUser`, respostas com perfil ou cabeçalhos de autorização no relatório. Informar apenas os campos resumidos impressos e se o usuário clicou no logout da interface também.

**Estado final de P01 nesta etapa: ABERTA.** A aplicação da migration e os quatro fluxos manuais informados não comprovam isolamento A/B nem bloqueio do JWT antigo nas duas APIs. Encerrá-la requer resultados reais dos blocos acima, com A e B autorizados e posterior revogação de uma sessão de teste, sem divulgar os tokens.

## 25. Ferramenta local P01 sem Console — 16/11/2026

Esta seção substitui o procedimento de colagem no DevTools da seção 24.1. O Chrome bloqueou a colagem, então foi criada uma página local isolada em `frontend/p01-local.html` com lógica em `frontend/src/p01-local.js`. Ela é servida pelo Vite na mesma origem da aplicação, lê a sessão Supabase já aberta no navegador e consulta somente `GET /api/session/me` e `GET /rest/v1/profiles?select=id`. Só aceita as duas contas de teste autorizadas, reconhecidas por SHA-256 do e-mail normalizado, sem mostrar ou armazenar e-mails na página. Mostra apenas rótulo A/B, códigos HTTP, contagens e o resultado do isolamento. Não solicita nem imprime senha, OTP, JWT ou refresh token.

| Verificação | Resultado | Evidência / limite |
|---|---|---|
| Disponibilidade local | **Aprovada** | `http://localhost:5000/p01-local.html` e `/src/p01-local.js` responderam HTTP 200 no Vite local. A página exige `import.meta.env.DEV` e hostname `localhost`/`127.0.0.1`; fora dessas condições, desabilita os botões. |
| Exclusão do build | **Aprovada** | `npm run build` passou e `dist/p01-local.html`/`dist/assets/p01-local.js` não existem. A página não foi adicionada ao roteador React nem à entrada principal do app. Nenhum deploy foi feito. |
| Validação estática | **Aprovada** | `node --check src/p01-local.js`, `npx eslint src/p01-local.js` e `git diff --check` passaram. O módulo atualizado foi servido por HTTP 200 e reutiliza `fetchWithTimeout` para limitar a espera das duas APIs. O código não chama `/api/session/logout`, `signOut`, operações de escrita na Data API nem consultas a outras tabelas. Os GETs do Express ainda podem atualizar os contadores normais de rate limiting. |
| Isolamento real A/B com JWTs comuns | **Pendente** | O agente não tem acesso às sessões privadas dos perfis do Chrome. Nenhum clique na página de teste com A/B foi observado nesta etapa; não há status HTTP ou contagem com esses JWTs para registrar. |
| JWT antigo após logout manual | **Pendente** | O botão de captura guarda o access token apenas na memória da aba, depois de confirmar HTTP 200 e um único perfil próprio. A ferramenta não faz logout. Após o titular clicar em “Sair” em outra aba, o botão de verificação usa o JWT antigo nas duas APIs, mostra apenas status/contagens e o descarta. Recusa concluir revogação se o JWT já tiver expirado. Nenhuma sessão foi revogada pelo agente. |

**Procedimento manual:** manter o Vite local em execução (`cd frontend` e `npm run dev`, se necessário) e abrir `http://localhost:5000/p01-local.html` na mesma origem e no mesmo perfil de navegador em que a conta de teste estiver logada. Usar perfis separados para A e B. Em cada conta: antes do OTP, selecionar “Antes do OTP” e clicar “Verificar Express e Data API”; após concluir o OTP no app, selecionar “Após o OTP” e repetir. O resultado esperado é Express 403 e zero perfis antes do OTP; Express 200 e exatamente um perfil próprio, zero perfis de outro usuário, após o OTP. Se houver erro de rede ou ausência de sessão, o resultado será “inconclusivo”, não aprovação.

**Revogação manual:** após o OTP, clicar “Capturar sessão de teste em memória” na página local, mantê-la aberta, ir a outra aba **do mesmo perfil** e clicar em “Sair” no Arboris.X. Voltar à página local e clicar “Verificar após meu logout”. A página verifica o JWT anterior no Express e na Data API sem mostrá-lo. Esperado: Express 401/403 e Data API 401/403 ou HTTP 200 com zero perfis. Fechar/recarregar a página ou clicar “Descartar captura” apaga o JWT retido em memória. Executar essa etapa somente quando o titular decidir encerrar a própria sessão de teste.

**Estado de P01:** **ABERTA** até que os resultados reais A/B e do JWT antigo após logout sejam coletados pela página local. Compartilhar somente os resumos exibidos, sem cabeçalhos, IDs ou dados pessoais. A ferramenta pronta e as verificações de build/sintaxe não equivalem aos testes de autorização com JWTs comuns.

## 26. Encerramento delimitado de P01 — 16/11/2026

O titular das duas contas de teste autorizadas executou os testes reais no navegador e comunicou os resultados abaixo. São **evidências de execução manual informadas pelo usuário**; o agente não teve acesso aos JWTs, às sessões nem aos registros brutos do navegador e não repetiu os testes nesta atualização. Esta seção atualiza o estado pendente de P01 registrado nas seções 23 a 25.

| Verificação | Resultado informado | Alcance da evidência |
|---|---|---|
| Conta A após OTP | Express HTTP **200**; Data API HTTP **200**; **1** perfil próprio e **0** perfis de outros usuários | Autorização adicional e isolamento da leitura de `public.profiles` para A, com sessão comum de teste. |
| Conta B após OTP | Express HTTP **200**; Data API HTTP **200**; **1** perfil próprio e **0** perfis de outros usuários | Autorização adicional e isolamento da leitura de `public.profiles` para B, com sessão comum de teste. |
| Proteção do Dashboard | Bloqueado sem login e antes do OTP; liberado após OTP válido | Fluxo de navegação observado pelo titular. Não há nesta comunicação um status da Data API antes do OTP. |
| Conta B após logout, reutilizando o JWT anterior | Express HTTP **401**; Data API HTTP **200** com **0** perfis; o validador local indicou JWT antigo bloqueado nas duas APIs | O Express recusou a sessão antiga e a política RLS impediu que ela lesse perfis. HTTP 200 da Data API significa resposta vazia, **não** rejeição HTTP do JWT. |

**Estado de P01: ENCERRADA NO ESCOPO VERIFICADO.** A migration 002 e os testes A/B acima sustentam a correção da leitura de perfis com sessões autorizadas e a perda de acesso a esses perfis após o logout de B, tanto no Express (`GET /api/session/me`) quanto na Data API (`SELECT id` de `public.profiles`). O Dashboard também bloqueou a navegação sem login e antes do OTP. O encerramento não equivale à validação de todas as políticas RLS, tabelas, operações ou rotas privadas.

**Cobertura ainda não demonstrada por estes resultados:** consulta direta à Data API antes do OTP; leitura ou escrita de outros recursos privados; operações `INSERT`, `UPDATE` e `DELETE` em `profiles`; revogação de uma segunda sessão ou logout de A; JWT genuinamente expirado; comportamento do ambiente publicado. Esses cenários permanecem testes específicos futuros se fizerem parte do contrato de autorização. Nenhuma conta, dado ou sessão foi alterado pelo agente nesta atualização; não houve novo teste, alteração remota ou deploy.

### 26.1 Pendências de autenticação e infraestrutura fora do encerramento de P01

- **Autenticação ponta a ponta:** cadastro e confirmação recebida por e-mail, login Google e comprovação do ato de vinculação, recuperação/redefinição de senha e tratamento de links inválidos ou expirados ainda precisam de evidência humana completa. Os registros de identidade existentes e testes simulados não substituem esses percursos. A consulta direta à Data API antes do OTP e o JWT genuinamente expirado também não foram informados neste lote.
- **Aceite e conteúdo legal:** confirmar o registro persistido e versionado do aceite dos termos para os fluxos aplicáveis e aprovar o texto de privacidade, retenção e canal de contato, conforme P05/P09.
- **Recuperação operacional:** o backup lógico tem integridade e inspeção verificadas, mas a restauração integral em ambiente Supabase isolado permanece sem teste. Documentar o histórico das migrations 002/003 aplicadas manualmente antes de usar o CLI em migrações futuras.
- **Proteção e operação:** conferir os limites nativos do Supabase Auth para endpoints acessados diretamente; validar CSP e demais cabeçalhos no ambiente publicado quando houver publicação autorizada; concluir monitoramento/alertas externos e cobertura dos fluxos críticos. O rate limiting PostgreSQL da migration 003 já foi integrado e testado nos cenários descritos na seção 20, sem cobrir as chamadas diretas ao Auth.
