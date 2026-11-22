import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, HelpCircle, Leaf, Mail, Plus, Search, Settings, ShieldCheck, Thermometer, UserRound, X } from 'lucide-react';
import './FAQSection.css';

const Privacy = lazy(() => import('../ModaisArboris/ModaisArboris').then(({ PrivacidadeModal }) => ({ default: PrivacidadeModal })));
const CATEGORIES = [
  { id: 'project', label: 'Sobre o projeto', icon: Leaf, items: [
    ['about', 'O que é o Arboris.X?', 'O Arboris.X é um projeto educacional de inteligência ambiental que explora a relação entre tecnologia, temperatura ambiente e ilhas de calor urbanas.', 'objetivo educação tecnologia'],
    ['team', 'Quem desenvolveu o projeto?', 'O projeto é desenvolvido por sete estudantes da FUNEC Riacho, com liderança de Amanda Costa Silva, orientação do professor Walter Santos e coorientação da professora Adriana Aguiar.', 'equipe alunos escola professores'],
    ['purpose', 'Qual é o objetivo do Arboris.X?', 'Utilizar a tecnologia como ferramenta de observação ambiental e estimular a compreensão das variações de temperatura em ambientes urbanos.', 'finalidade missão ambiente'],
    ['heat-islands', 'O que são ilhas de calor urbanas?', 'São áreas urbanizadas que apresentam temperaturas mais elevadas em comparação com áreas próximas. Vegetação, construções e materiais das superfícies podem influenciar essas diferenças.', 'calor cidade vegetação sombra'],
    ['commercial', 'O Arboris.X é um produto comercial?', 'Atualmente, é um projeto educacional desenvolvido no contexto da XIII Mostra de Tecnologia da FUNEC Riacho, em 2026. A plataforma não realiza vendas.', 'comprar preço produto mostra'],
  ] },
  { id: 'device', label: 'Aparelho e monitoramento', icon: Compass, items: [
    ['measurement', 'O que o aparelho mede?', 'A função confirmada do protótipo físico é medir a temperatura ambiente.', 'sensor medição termômetro'],
    ['display', 'Onde posso visualizar a temperatura medida?', 'Atualmente, a leitura é exibida diretamente na tela do aparelho. Ela ainda não chega automaticamente à plataforma web.', 'tela sensor leitura visor'],
    ['quantity', 'Quantos aparelhos existem no projeto?', 'O projeto começa com um único protótipo físico.', 'sensor quantidade dispositivos'],
    ['integration', 'O protótipo já envia dados para o site?', 'Ainda não. O protótipo mostra a temperatura na própria tela. A integração automática com a plataforma está em preparação.', 'sensor conexão internet nuvem sincronizar'],
    ['remote', 'Posso controlar o aparelho pelo site?', 'A plataforma ainda não oferece controle remoto do protótipo.', 'sensor comando ligar desligar'],
  ] },
  { id: 'temperature', label: 'Temperatura e histórico', icon: Thermometer, items: [
    ['empty', 'Por que aparece “Nenhuma medição disponível”?', 'Porque a plataforma ainda não recebe automaticamente as medições realizadas pelo aparelho. A mensagem indica ausência de leituras reais disponíveis.', 'sem dados vazio leitura'],
    ['diagnosis', 'Uma temperatura elevada comprova uma ilha de calor?', 'Não. É necessário comparar diferentes locais e considerar horários, vegetação, superfícies e outras condições ambientais. Uma leitura isolada não comprova uma ilha de calor.', 'calor quente diagnóstico comparação'],
    ['threshold', 'O que significa o limite de alerta de temperatura?', 'É um valor ajustável nas Configurações para destacar leituras na interface. Ele não representa, sozinho, um diagnóstico ambiental ou um limite universal de segurança.', 'calor alerta limite ajuste'],
    ['demo', 'O que é o modo demonstração?', 'É um recurso das Configurações que apresenta valores simulados para demonstrar a interface. A sequência é local e não envia medições ao banco.', 'simulação demonstrar exemplo teste'],
    ['demo-real', 'Os valores da demonstração são reais?', 'Não. Os valores são fictícios, identificados como dados simulados e não representam medições do aparelho.', 'simulação fictício real'],
    ['demo-history', 'Os dados simulados aparecem no histórico real?', 'Não. O histórico exibe somente registros identificados como medições reais válidas. O modo demonstração não cria registros nesse histórico.', 'simulação histórico registros'],
    ['export', 'Por que não consigo exportar um relatório?', 'As opções de exportação do Histórico dependem de medições reais válidas disponíveis. Elas ficam indisponíveis quando não há registros ou quando a consulta não pode ser concluída.', 'baixar download csv pdf relatório'],
    ['unit', 'Em qual unidade a temperatura é apresentada?', 'A plataforma apresenta a temperatura em graus Celsius (°C).', 'unidade graus celsius'],
  ] },
  { id: 'account', label: 'Conta e acesso', icon: UserRound, items: [
    ['signup', 'Como posso criar uma conta?', 'Utilize a opção Criar conta na tela de acesso e siga as instruções apresentadas, incluindo a confirmação de e-mail quando solicitada.', 'cadastro cadastrar registrar login'],
    ['google', 'Posso entrar utilizando minha conta Google?', 'Sim. A tela de entrada oferece a opção Google. O acesso depende da disponibilidade do serviço e das verificações adicionais da plataforma.', 'google gmail login entrar autenticação'],
    ['password', 'Como redefinir minha senha?', 'Na tela de login, selecione “Esqueceu sua senha?” e siga as instruções do link enviado ao seu e-mail. Não compartilhe esse link.', 'esqueci recuperar recuperação senha acesso'],
    ['code', 'Por que recebi um código de seis dígitos?', 'O código enviado ao e-mail é utilizado para confirmar seu acesso quando uma verificação adicional é necessária.', 'código otp confirmação verificar seis dígitos'],
    ['missing-code', 'Por que não recebi o código de confirmação?', 'Confira sua caixa de entrada e a pasta de spam. Verifique o endereço informado e utilize a opção de reenvio quando estiver disponível. Se o problema continuar, entre em contato com a equipe.', 'código otp email spam reenviar envio'],
    ['repeat-code', 'Preciso confirmar meu acesso em todos os logins?', 'O acesso depende das verificações de segurança da plataforma. O reconhecimento de navegadores é opcional e só simplifica acessos quando estiver habilitado. Mesmo um navegador reconhecido pode precisar de nova confirmação.', 'código otp dispositivo navegador confiável login'],
    ['logout', 'Como sair da minha conta?', 'Acesse Configurações e selecione “Sair da conta”. Faça isso ao terminar de usar um computador compartilhado.', 'sair logout desconectar encerrar sessão', 'settings'],
  ] },
  { id: 'security', label: 'Segurança e privacidade', icon: ShieldCheck, items: [
    ['protection', 'Como minha conta é protegida?', 'A plataforma utiliza autenticação, validação de sessões, autorização adicional de acesso e limites de solicitações. Saiba mais na página Segurança.', 'proteger segurança autenticação', 'security'],
    ['permissions', 'Outra pessoa pode acessar minhas informações?', 'Existem controles de acesso destinados a restringir informações privadas às permissões autorizadas. Esses mecanismos reduzem riscos, mas nenhum sistema pode garantir proteção absoluta.', 'dados pessoais permissões privacidade'],
    ['secret', 'Devo compartilhar meu código de verificação?', 'Não. Códigos de verificação, senhas e credenciais devem permanecer privados. Não os envie à equipe nem a outras pessoas.', 'código otp senha compartilhar'],
    ['privacy', 'Onde posso consultar a Política de Privacidade?', 'Abra o documento oficial pelo botão abaixo ou pelos links no rodapé. Ele descreve o uso de dados, os serviços envolvidos e o canal para solicitações.', 'política privacidade dados documento', 'privacy'],
    ['personal-data', 'O aparelho coleta informações pessoais?', 'A função confirmada do protótipo é medir a temperatura ambiente. Ainda não há integração automática confirmada com o site. As informações da sua conta são tratadas pela plataforma web.', 'sensor dados pessoais aparelho'],
  ] },
  { id: 'preferences', label: 'Personalização', icon: Settings, items: [
    ['theme', 'Posso utilizar o tema claro ou escuro?', 'Sim. Nas Configurações, escolha Claro, Escuro ou Automático para acompanhar o tema do sistema. A barra lateral também oferece um controle de tema.', 'aparência cores claro escuro tema', 'settings'],
    ['contrast', 'Existe um modo de alto contraste?', 'Sim. Ative “Alto contraste para leitura externa” nas Configurações para reforçar a distinção entre texto e fundo.', 'acessibilidade contraste iluminação', 'settings'],
    ['font', 'Como aumentar o tamanho dos textos?', 'Use os controles A−, A e A+ nas Configurações para ajustar o tamanho do texto.', 'fonte tamanho ampliar letras zoom', 'settings'],
    ['motion', 'Posso reduzir as animações?', 'Sim. Ative “Reduzir animações” nas Configurações. A plataforma também respeita a preferência de redução de movimento do sistema.', 'movimento animação acessibilidade', 'settings'],
    ['restore', 'Como restaurar as configurações originais?', 'Use “Restaurar preferências padrão” nas Configurações. Essa ação restaura as preferências visuais e de leitura; não apaga sua conta.', 'restaurar redefinir padrão preferências', 'settings'],
  ] },
  { id: 'support', label: 'Suporte', icon: Mail, items: [
    ['error', 'O que fazer se o site apresentar um erro?', 'Tente novamente usando a opção disponível na interface. Se o problema continuar, fale com a equipe e descreva o que estava fazendo quando o erro ocorreu.', 'erro falha problema travou suporte', 'contact'],
    ['session', 'Por que aparece “Não foi possível confirmar seu acesso”?', 'A mensagem pode indicar uma dificuldade temporária na validação da sessão. Use “Tentar novamente”. Caso persista, entre em contato com a equipe.', 'sessão indisponível acesso confirmar erro', 'contact'],
    ['report', 'Como informar um problema encontrado?', 'Escreva para arborisx@gmail.com e descreva brevemente o comportamento observado. Nunca envie senhas, tokens, links de recuperação ou códigos de verificação.', 'contato opinião comentário ajuda problema email', 'contact'],
  ] },
];
const QUESTIONS = CATEGORIES.flatMap((category) => category.items.map(([id, question, answer, keywords, action]) => ({ id, question, answer, keywords, action, category: category.id, categoryLabel: category.label })));
const EQUIVALENTS = [['sensor', 'aparelho', 'prototipo'], ['senha', 'recuperacao', 'redefinir'], ['codigo', 'otp', 'verificacao'], ['calor', 'temperatura'], ['email', 'e-mail'], ['ajuda', 'suporte'], ['login', 'entrar', 'acesso']];
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const tokensFor = (query) => normalize(query).trim().split(/\s+/).filter(Boolean);

function Highlight({ text, tokens }) {
  const normalized = normalize(text);
  const ranges = [];
  for (const token of tokens) {
    let start = normalized.indexOf(token);
    while (start !== -1) { ranges.push([start, start + token.length]); start = normalized.indexOf(token, start + token.length); }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  let cursor = 0;
  const parts = merged.flatMap(([start, end]) => { const before = text.slice(cursor, start); cursor = end; return [before, <mark key={start}>{text.slice(start, end)}</mark>]; });
  return <>{parts}{text.slice(cursor)}</>;
}

function HelpQuestion({ item, tokens, open, onToggle, vote, onVote, onPrivacy }) {
  return <article className="help-question" data-open={open}>
    <h3><button type="button" id={`help-question-${item.id}`} aria-expanded={open} aria-controls={`help-answer-${item.id}`} onClick={onToggle}><HelpCircle size={18} aria-hidden="true" /><span><Highlight text={item.question} tokens={tokens} /></span><Plus className="help-question__toggle" size={18} aria-hidden="true" /></button></h3>
    <div className="help-question__expansion" id={`help-answer-${item.id}`} aria-labelledby={`help-question-${item.id}`} inert={!open} aria-hidden={!open}>
      <div><div className="help-question__answer"><p><Highlight text={item.answer} tokens={tokens} /></p>
        {item.action === 'privacy' && <button type="button" className="help-text-link" onClick={onPrivacy}>Política de Privacidade <ArrowRight size={15} aria-hidden="true" /></button>}
        {['settings', 'security'].includes(item.action) && <Link className="help-text-link" to={`/dashboard?section=${item.action}`}>{item.action === 'settings' ? 'Abrir Configurações' : 'Conhecer nossas proteções'} <ArrowRight size={15} aria-hidden="true" /></Link>}
        {item.action === 'contact' && <Link className="help-text-link" to="/dashboard?section=contact">Falar com a equipe <ArrowRight size={15} aria-hidden="true" /></Link>}
        <div className="help-question__feedback"><span>Esta resposta foi útil?</span><div role="group" aria-label={`Avaliar: ${item.question}`}><button type="button" aria-pressed={vote === 'yes'} onClick={() => onVote('yes')}>Sim</button><button type="button" aria-pressed={vote === 'no'} onClick={() => onVote('no')}>Não</button></div><small role="status">{vote ? 'Obrigado pela avaliação. Sua escolha fica apenas nesta página.' : ''}</small></div>
      </div></div>
    </div>
  </article>;
}

export default function FAQSection() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(new Set());
  const [votes, setVotes] = useState({});
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  useEffect(() => {
    const update = () => rootRef.current?.toggleAttribute('data-hidden', document.visibilityState === 'hidden');
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const tokens = tokensFor(query);
  const matching = QUESTIONS.filter((item) => {
    const text = normalize(`${item.question} ${item.answer} ${item.keywords} ${item.categoryLabel}`);
    return tokens.every((token) => (EQUIVALENTS.find((group) => group.includes(token)) || [token]).some((term) => text.includes(term)));
  });
  const results = matching.filter((item) => category === 'all' || item.category === category);
  const clearSearch = () => { setQuery(''); searchRef.current?.focus(); };
  const resetFilters = () => { setCategory('all'); clearSearch(); };
  const tilt = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--compass-x', `${((event.clientY - bounds.top) / bounds.height - .5) * -6}deg`);
    event.currentTarget.style.setProperty('--compass-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 6}deg`);
  };
  return <div className="help-center" ref={rootRef}>
    <section className="help-hero" aria-labelledby="help-title">
      <div className="help-hero__copy"><span className="help-eyebrow">ARBORIS.X / CENTRAL DE AJUDA</span><h1 id="help-title">Como podemos<br /><em>ajudar você?</em></h1><p>Encontre respostas sobre o projeto, o monitoramento ambiental, sua conta e os recursos da plataforma.</p>
        <div className="help-search" role="search"><Search size={21} aria-hidden="true" /><label className="help-sr-only" htmlFor="help-search">Pesquisar dúvidas</label><input ref={searchRef} id="help-search" type="search" placeholder="Digite sua dúvida..." value={query} autoComplete="off" maxLength={180} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') clearSearch(); }} aria-controls="help-results" />{query && <button type="button" aria-label="Limpar pesquisa" onClick={clearSearch}><X size={18} aria-hidden="true" /></button>}</div>
        <span className="help-search__hint">Busque por senha, sensor, código ou temperatura.</span>
      </div>
      <div className="help-compass" aria-hidden="true" onPointerMove={tilt} onPointerLeave={(event) => { event.currentTarget.style.removeProperty('--compass-x'); event.currentTarget.style.removeProperty('--compass-y'); }}><div className="help-compass__scene"><span className="help-compass__orbit" /><span className="help-compass__leaf help-compass__leaf--one" /><span className="help-compass__leaf help-compass__leaf--two" /><span className="help-compass__face"><span className="help-compass__cardinal">N</span><span className="help-compass__needle" /><i /></span><span className="help-compass__spark" /></div><span>UM CAMINHO PARA CADA DÚVIDA</span></div>
    </section>
    <nav className="help-shortcuts" aria-label="Acessos rápidos"><Link to="/dashboard?section=project"><Leaf size={17} aria-hidden="true" />Conheça o projeto<ArrowRight size={15} aria-hidden="true" /></Link><Link to="/dashboard?section=how"><Compass size={17} aria-hidden="true" />Como funciona<ArrowRight size={15} aria-hidden="true" /></Link><Link to="/dashboard?section=settings"><Settings size={17} aria-hidden="true" />Configurações<ArrowRight size={15} aria-hidden="true" /></Link><Link to="/dashboard?section=security"><ShieldCheck size={17} aria-hidden="true" />Nossas proteções<ArrowRight size={15} aria-hidden="true" /></Link></nav>
    <div className="help-content">
      <aside className="help-categories"><span className="help-eyebrow">EXPLORE POR ASSUNTO</span><div role="group" aria-label="Categorias de ajuda"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}><BookOpen size={18} aria-hidden="true" /><span>Todas as dúvidas</span><small>{matching.length}</small></button>{CATEGORIES.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={18} aria-hidden="true" /><span>{label}</span><small>{matching.filter((item) => item.category === id).length}</small></button>)}</div><p>Começando agora? Explore o projeto e descubra o que o protótipo já faz.</p></aside>
      <section className="help-results" id="help-results" aria-labelledby="help-results-title"><header><div><span className="help-eyebrow">RESPOSTAS PARA EXPLORAR</span><h2 id="help-results-title">{category === 'all' ? 'Encontre seu caminho.' : CATEGORIES.find((item) => item.id === category).label}</h2></div><span role="status" aria-live="polite" aria-atomic="true">{results.length} {results.length === 1 ? 'resposta encontrada' : 'respostas encontradas'}</span></header>
        {results.length ? CATEGORIES.map((group) => { const items = results.filter((item) => item.category === group.id); return items.length ? <section className="help-results__group" key={group.id} aria-labelledby={`help-group-${group.id}`}><h3 id={`help-group-${group.id}`}>{group.label}<span>{String(items.length).padStart(2, '0')}</span></h3>{items.map((item) => <HelpQuestion key={item.id} item={item} tokens={tokens} open={expanded.has(item.id)} onToggle={() => setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} vote={votes[item.id]} onVote={(vote) => setVotes((current) => ({ ...current, [item.id]: vote }))} onPrivacy={() => setPrivacyOpen(true)} />)}</section> : null; }) : <div className="help-empty"><Search size={30} strokeWidth={1.4} aria-hidden="true" /><h3>Vamos tentar outro caminho?</h3><p>Não encontramos uma resposta para essa pesquisa. Tente utilizar outras palavras.</p><button type="button" onClick={resetFilters}>Limpar pesquisa e filtros <ArrowRight size={16} aria-hidden="true" /></button></div>}
      </section>
    </div>
    <section className="help-support" aria-labelledby="help-support-title"><span className="help-support__icon"><Mail size={29} strokeWidth={1.4} aria-hidden="true" /></span><div><span className="help-eyebrow">CONVERSE COM A EQUIPE</span><h2 id="help-support-title">Ainda precisa de ajuda?</h2><p>Se sua dúvida não foi respondida, entre em contato com a equipe do Arboris.X.</p></div><Link to="/dashboard?section=contact">Entrar em contato <ArrowRight size={18} aria-hidden="true" /></Link></section>
    {privacyOpen && <Suspense fallback={<p role="status">Abrindo Política de Privacidade…</p>}><Privacy isOpen onClose={() => setPrivacyOpen(false)} /></Suspense>}
  </div>;
}
