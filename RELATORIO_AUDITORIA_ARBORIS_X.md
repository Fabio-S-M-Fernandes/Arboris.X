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
