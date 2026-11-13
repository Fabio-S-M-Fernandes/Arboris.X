# Arboris.X API

API Node.js/Express do Arboris.X. A arquitetura segue `routes → controllers → services → repositories → jsonStore`; a persistência atual usa um arquivo JSON local.

## Executar

```powershell
cd backend
npm install
npm run dev
```

O servidor usa `http://localhost:3001`. A base é criada em `backend/data/db.json` se ainda não existir. Preserve esse arquivo e seus usuários.

## Rotas

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/resend`
- `POST /api/auth/cancel`
- `POST /api/auth/google/nonce`
- `POST /api/auth/google`
- `POST /api/auth/google/link` (JWT obrigatório)
- `GET /api/auth/me`
- `POST /api/auth/logout`

Login por senha, cadastro e Login com Google iniciam um desafio enviado ao e-mail. A API só entrega o JWT depois da confirmação. O código dura cinco minutos, é armazenado como HMAC vinculado ao desafio, aceita uma única confirmação, permite até cinco tentativas e respeita 60 segundos entre reenvios. O backend nunca devolve nem registra o código. O reenvio também tem limite por conta e IP.

Os desafios e nonces do Google ficam em memória e expiram automaticamente. Essa implementação atende a uma instância do Node.js: antes de executar múltiplas instâncias ou reiniciar processos sem interromper verificações pendentes, mova esses dados e os limites por IP para um armazenamento compartilhado com operações atômicas.

## Login Google e e-mail

O frontend usa o botão oficial do Google Identity Services. A API verifica assinatura, emissor, audiência, expiração, nonce e `email_verified` do ID token com `google-auth-library`; nenhum dado de perfil enviado separadamente pelo navegador é confiado. Novas contas Google também confirmam os Termos e a Política antes da criação. Um e-mail que já pertence a uma conta local nunca é associado automaticamente.

Para vincular uma identidade a uma conta local, o usuário deve primeiro entrar com senha e código de segurança. Depois, um cliente autenticado pode obter um nonce em `POST /api/auth/google/nonce` e chamar `POST /api/auth/google/link` com `{ "idToken": "…", "nonce": "…" }`. A API exige que o e-mail Google verificado corresponda ao e-mail da sessão e que a identidade ainda não esteja vinculada a outra conta.

O envio usa SMTP com Nodemailer. Copie as variáveis dos arquivos `.env.example` e configure host, porta, remetente e credenciais do seu provedor. Em produção, configure também um `OTP_SECRET` aleatório exclusivo com ao menos 32 bytes.

### Configuração do Google Cloud

1. Configure a tela de consentimento OAuth e cadastre os usuários de teste enquanto o aplicativo estiver em modo de teste.
2. Em **APIs e serviços → Credenciais**, crie um **ID do cliente OAuth → Aplicativo da Web**.
3. Em **Origens JavaScript autorizadas**, adicione a origem exata do frontend, incluindo esquema e porta, por exemplo `http://localhost:5173` e a origem HTTPS de produção. Este fluxo usa o callback JavaScript do GIS, portanto não precisa de URI de redirecionamento.
4. Copie o mesmo Client ID para `VITE_GOOGLE_CLIENT_ID` em `frontend/.env` e `GOOGLE_CLIENT_ID` em `backend/.env`. Não há Client Secret neste fluxo; não crie nem publique um no frontend.
5. Configure o SMTP real e os segredos `JWT_SECRET` e `OTP_SECRET`, reinicie os serviços e teste com uma conta Google autorizada.

## Configuração e implantação

Copie `.env.example` para `.env`. Configure `FRONTEND_URL` com a origem exata do frontend, `DATA_FILE` fora de qualquer diretório público e `JWT_SECRET` com pelo menos 32 bytes aleatórios. Gere um segredo com:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Em produção, defina `NODE_ENV=production`, use HTTPS, proteja os arquivos de configuração e dados com permissões do sistema operacional e sirva publicamente somente `frontend/dist`. Não publique `backend/` nem a pasta de dados. As rotas de autenticação usam limites por endereço IP e respostas sem cache.

O JWT expira em 8 horas por padrão; `JWT_EXPIRES_IN` aceita durações de 1 segundo a 24 horas. Logout revoga o token até o vencimento em `revoked-tokens.json`, junto ao arquivo de dados. Essa lista em arquivo atende a uma instância única do Node.js; antes de usar múltiplas instâncias, mova sessões/revogações para um armazenamento compartilhado e atômico.

`TRUST_PROXY_HOPS` fica em `0` por padrão. Só o altere para a quantidade exata de proxies reversos controlados que encaminham solicitações à API; uma configuração incorreta pode permitir falsificação de IP ou agrupar os limites de requisição.

## HTTPS, senhas e segredos

Em desenvolvimento, a API e o Vite continuam usando HTTP em localhost. Em producao (`NODE_ENV=production`), todas as origens de `FRONTEND_URL` devem ser HTTPS e a API responde `426 HTTPS_REQUIRED` a qualquer requisicao que Express nao reconheca como segura. O frontend bloqueia a chamada antes de enviar senha, JWT ou codigo se a pagina ou a URL da API nao usar HTTPS. Configure `VITE_API_URL` como `https://api.seu-dominio/api`, ou use `/api` quando a hospedagem fizer proxy HTTPS para a API.

Configure TLS valido na plataforma de hospedagem (por exemplo, certificado gerenciado pela Vercel ou Let's Encrypt) e force HTTP para HTTPS na borda antes da aplicacao. O Vercel fornece TLS e HSTS para deployments; `frontend/vercel.json` tambem define HSTS e cabecalhos de seguranca. Para outro servidor web, configure TLS, redirect HTTP->HTTPS e HSTS na propria infraestrutura. O backend usa Helmet e ativa HSTS por um ano somente em producao. Nao use certificados autoassinados em producao.

Se um proxy reverso terminar TLS antes do Node, defina `TRUST_PROXY_HOPS` para a quantidade exata de proxies controlados. O default `0` serve para conexao TLS direta; valor incorreto pode permitir falsificacao de `X-Forwarded-Proto` e IP. A API recusa HTTP em producao mesmo que a borda nao esteja configurada corretamente. Mantenha `FRONTEND_URL` como lista exata de origens HTTPS, sem caminho.

Configure no host os segredos `JWT_SECRET`, `OTP_SECRET`, `SMTP_PASS` e o Client ID publico `GOOGLE_CLIENT_ID`; nunca os inclua no bundle frontend. Use `VITE_GOOGLE_CLIENT_ID` somente para o Client ID publico. O OAuth GIS usa a origem JavaScript HTTPS autorizada no Google Cloud, sem Client Secret ou URL de redirect neste fluxo. SMTP usa TLS implicito com porta 465 ou exige STARTTLS para outras portas.

Cadastro e login local continuam usando bcrypt com custo 12 e salt individual gerado pelo bcrypt. Os hashes existentes nao sao migrados; as respostas publicas selecionam apenas os campos de perfil e nunca incluem `passwordHash`. Contas Google nao recebem hash ou senha ficticia. Senhas, codigos, tokens e corpos nao sao incluidos nos logs HTTP. JWT continua em `localStorage` e e enviado como Bearer; esta aplicacao nao usa cookies de autenticacao.

`backend/data/`, arquivos `.env` e formatos comuns de chave/certificado estao ignorados pelo Git. O historico deste repositorio foi verificado quanto a caminhos `.env`, banco e chaves; somente arquivos `.env.example` aparecem nesses caminhos. Se credenciais reais forem encontradas em outro clone, artifact ou historico remoto, revogue-as e gere substitutas.

Para producao: defina `NODE_ENV=production`, `FRONTEND_URL=https://app.seu-dominio`, `VITE_API_URL=https://api.seu-dominio/api` (ou `/api` com proxy same-origin), `TRUST_PROXY_HOPS` conforme a topologia, segredos fortes fora do Git, SMTP com TLS e domínios autorizados no Google Cloud. A hospedagem ainda precisa associar os dominios, provisionar certificados validos e ativar o redirect HTTP->HTTPS na borda.
### Reconhecimento de dispositivos e alertas

Depois que a senha ou a identidade Google e o código de seis dígitos forem confirmados, a API define o cookie `arboris_device`. Ele contém um identificador aleatório de alta entropia; o servidor armazena apenas um HMAC do identificador, junto com tipo do dispositivo, navegador, sistema operacional e datas do primeiro e último acesso. O cookie é HttpOnly; em produção HTTPS usa `Secure` e `SameSite=None`, e em localhost usa `SameSite=Lax` sem exigir certificado. São mantidos até 25 dispositivos por conta.

Um dispositivo novo gera um aviso pelo SMTP já configurado. Falhas no envio não cancelam a autenticação e são registradas apenas como mensagem genérica. Não há integração de geolocalização: nenhum IP é salvo para esse recurso e o aviso informa `Localização não identificada`. Configure e teste o SMTP para habilitar a entrega dos avisos.

### Vinculação de conta Google existente

Se um e-mail Google corresponder a uma conta Arboris.X local, o login Google não associa as contas automaticamente. O usuário inicia um login normal com e-mail e senha e envia a identidade Google validada junto ao código de seis dígitos em `POST /api/auth/verify`. A API vincula o `sub` verificado antes de emitir o JWT. Também existe `POST /api/auth/google/link`, que exige JWT emitido nos últimos cinco minutos por autenticação com senha e OTP. A identidade precisa usar o mesmo e-mail verificado e não pode pertencer a outra conta.