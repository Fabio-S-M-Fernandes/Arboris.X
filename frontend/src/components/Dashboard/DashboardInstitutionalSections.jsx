import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Database,
  KeyRound,
  Mail,
  Server,
  ShieldCheck,
  Thermometer,
  Users,
  Leaf,
  Monitor,
  Lightbulb,
  Wind,
  Sun,
  CircuitBoard,
  Braces,
  Boxes,
  Cloud,
  GitBranch,
  Layers3,
  LockKeyhole,
  Package,
  Route,
  TestTube2,
  Fingerprint,
  Eye,
  LogOut,
  SlidersHorizontal,
  AlertCircle,
  Check,
  ExternalLink,
} from 'lucide-react';
export { default as FAQSection } from './FAQSection';
import './TeamSection.css';
import './ProjectSection.css';
import './HowItWorksSection.css';
import './TechnologySection.css';
import './SecuritySection.css';

const TEAM_MEMBERS = [
  { name: 'Amanda Costa Silva', role: 'Líder do projeto', activity: 'Registro', schoolClass: '3º A', variant: 'branches' },
  { name: 'Victor Guimarães', activity: 'Pesquisa', schoolClass: '1º B', variant: 'organic-grid' },
  { name: 'Thaís Vitória', activity: 'Construção', schoolClass: '3º B', variant: 'leaves' },
  { name: 'Fábio Fernandes', activity: 'Construção', schoolClass: '2º B', variant: 'orbit' },
  { name: 'Victor Salomão', activity: 'Construção', schoolClass: '2º A', variant: 'trails' },
  { name: 'Bruna Ester', activity: 'Pesquisa', schoolClass: '1º A', variant: 'aurora' },
  { name: 'Izzy Souza', activity: 'Registro', schoolClass: '1º A', variant: 'seeds' },
];

const MENTORS = [
  { name: 'Walter Santos', role: 'Professor orientador', variant: 'tree' },
  { name: 'Adriana Aguiar', role: 'Professora coorientadora', variant: 'roots' },
];

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
}

function localTeamPhoto(photo) {
  if (typeof photo !== 'string' || !photo.startsWith('/') || photo.startsWith('//')) return null;
  try {
    const url = new URL(photo, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

function TeamPersonCard({ person, mentor = false, leader = false, index }) {
  const photo = localTeamPhoto(person.photo);
  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty('--team-rotate-x', `${(-y * 3).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--team-rotate-y', `${(x * 3).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--team-light-x', `${((x + .5) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty('--team-light-y', `${((y + .5) * 100).toFixed(1)}%`);
  };
  const resetPointer = (event) => {
    event.currentTarget.style.removeProperty('--team-rotate-x');
    event.currentTarget.style.removeProperty('--team-rotate-y');
    event.currentTarget.style.removeProperty('--team-light-x');
    event.currentTarget.style.removeProperty('--team-light-y');
  };

  return (
    <article
      className={`team-person${mentor ? ' team-person--mentor' : ''}${leader ? ' team-person--leader' : ''}`}
      data-variant={person.variant}
      data-reveal=""
      style={{ '--team-delay': `${mentor ? index * 30 : leader ? 0 : 30 + Math.floor((index - 1) / 2) * 40 + ((index - 1) % 2) * 20}ms` }}
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onBlur={resetPointer}
    >
      <span className="team-person__motif" aria-hidden="true"><i /><i /><i /><i /></span>
      {leader && <span className="team-person__edge" aria-hidden="true" />}
      <div className="team-person__body">
        <span className="team-person__avatar" aria-hidden="true">
          {photo ? <img src={photo} alt="" /> : initials(person.name)}
        </span>
        <div className="team-person__copy">
          <span className="team-person__role">{person.role || 'Integrante do projeto'}</span>
          <h3>{person.name}</h3>
          {person.activity && <div className="team-person__details"><span className="team-person__activity">Atividade: {person.activity}</span><span className="team-person__class">Turma {person.schoolClass}</span></div>}
        </div>
      </div>
      <span className="team-person__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
    </article>
  );
}

function useSectionReveal(experienceRef, ambientSelector) {
  useLayoutEffect(() => {
    const root = experienceRef.current;
    if (!root || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return undefined;
    const targets = [...root.querySelectorAll('[data-reveal]')];
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.setAttribute('data-visible', ''));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-visible', '');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px 45px 0px' });
    targets.forEach((target) => observer.observe(target));
    const ambientObserver = ambientSelector ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.toggleAttribute('data-in-view', entry.isIntersecting));
    }, { rootMargin: '120px 0px' }) : null;
    if (ambientObserver) root.querySelectorAll(ambientSelector).forEach((card) => ambientObserver.observe(card));
    root.setAttribute('data-animate', 'true');
    return () => { observer.disconnect(); ambientObserver?.disconnect(); };
  }, [experienceRef, ambientSelector]);
}

export function TeamSection() {
  const experienceRef = useRef(null);
  useSectionReveal(experienceRef, '.team-person');

  return (
    <div className="team-experience" ref={experienceRef}>
      <section className="team-hero" aria-labelledby="team-hero-title" data-reveal="">
        <span className="team-hero__mist" aria-hidden="true" />
        <div className="team-hero__copy">
          <span className="team-eyebrow">ARBORIS.X / INTELIGÊNCIA AMBIENTAL</span>
          <h1 id="team-hero-title"><span>Conhecimento feito</span>{' '}<span>em <em>equipe.</em></span></h1>
          <p>O Arboris.X é desenvolvido por estudantes da FUNEC Riacho, com acompanhamento de professores, para explorar a relação entre tecnologia e ambiente.</p>
          <p className="team-hero__motto">“Construindo sonhos Tech”</p>
          <div className="team-hero__context"><span>FUNEC Riacho <small>Fundação de Ensino de Contagem</small></span><span>XIII Mostra de Tecnologia <small>2026</small></span><span>Grupo 09 <small>CosSoTech</small></span></div>
        </div>
        <div className="team-hero__art" aria-hidden="true"><img src="/imagem2.png" alt="" /></div>
        <span className="team-hero__guide" aria-hidden="true" />
      </section>

      <section className="team-section team-section--students" aria-labelledby="team-members-title">
        <div className="team-section__heading" data-reveal="">
          <div>
            <span className="team-eyebrow">01 / ESTUDANTES</span>
            <h2 id="team-members-title">Nossa equipe<span className="team-section__period">.</span></h2>
            <p>Sete pessoas construindo uma forma de observar o ambiente.</p>
          </div>
          <span className="team-section__count">07 / INTEGRANTES</span>
        </div>
        <div className="team-gallery">
          <TeamPersonCard person={TEAM_MEMBERS[0]} leader index={0} />
          <div className="team-gallery__members">
            {TEAM_MEMBERS.slice(1).map((person, index) => <TeamPersonCard key={person.name} person={person} index={index + 1} />)}
          </div>
        </div>
        <p className="team-section__note">Atividades registradas na ficha de identificação do grupo.</p>
      </section>

      <section className="team-section team-section--mentors" aria-labelledby="mentors-title">
        <div className="team-section__heading" data-reveal="">
          <div>
            <span className="team-eyebrow">02 / PROFESSORES</span>
            <h2 id="mentors-title">Orientação que faz o conhecimento crescer<span className="team-section__period">.</span></h2>
            <p>O desenvolvimento do Arboris.X conta com o acompanhamento dos professores da FUNEC Riacho.</p>
          </div>
        </div>
        <div className="team-mentors">
          {MENTORS.map((person, index) => <TeamPersonCard key={person.name} person={person} mentor index={index} />)}
        </div>
      </section>
      <div className="team-closing" data-reveal=""><span className="team-closing__line" aria-hidden="true" /><span>Conhecimento, tecnologia e ambiente.</span></div>
    </div>
  );
}

const PROJECT_GOALS = [
  { icon: Thermometer, title: 'Medir', text: 'Observar a temperatura do lugar com o protótipo físico e reconhecer que cada leitura descreve condições específicas de local e horário.' },
  { icon: Monitor, title: 'Mostrar', text: 'Apresentar o valor em graus Celsius na tela do aparelho, tornando a observação fácil de acompanhar.' },
  { icon: BookOpen, title: 'Compreender', text: 'Relacionar sombra, vegetação, materiais e circulação do ar às diferenças térmicas, sem tirar conclusões a partir de uma única leitura.' },
  { icon: Lightbulb, title: 'Desenvolver', text: 'Construir conhecimento em educação ambiental por meio de conteúdos e experiências digitais interativas.' },
];

const PROJECT_ODS = [
  { number: '3', title: 'Saúde e Bem-Estar', relation: 'Conversar sobre calor, conforto e cuidado com as pessoas no ambiente urbano.' },
  { number: '9', title: 'Indústria, inovação e infraestrutura', relation: 'Conhecer etapas de pesquisa, prototipagem e desenvolvimento de tecnologia.' },
  { number: '7', title: 'Energia limpa e acessível', relation: 'Discutir de onde vem a energia usada por dispositivos e como usá-la com responsabilidade.' },
  { number: '11', title: 'Cidades e comunidades sustentáveis', relation: 'Observar como vegetação, construções e espaços públicos compõem a cidade.' },
  { number: '12', title: 'Consumo e produção responsáveis', relation: 'Refletir sobre materiais, resíduos e escolhas ao desenvolver um protótipo.' },
  { number: '13', title: 'Ação contra a mudança global do clima', relation: 'Aproximar observação ambiental e educação climática, sem atribuir ao projeto impactos ainda não medidos.' },
];

const PROJECT_STAGES = [
  'Concepção do projeto ambiental',
  'Desenvolvimento do protótipo físico',
  'Desenvolvimento da plataforma web',
  'Exploração de possibilidades futuras',
];

export function ProjectSection() {
  const projectRef = useRef(null);
  useSectionReveal(projectRef);

  return (
    <div className="project-story" ref={projectRef}>
      <section className="project-story__hero" aria-labelledby="project-hero-title" data-reveal="">
        <div className="project-story__hero-copy">
          <span className="project-story__eyebrow">SOBRE O PROJETO / ARBORIS.X</span>
          <h1 id="project-hero-title"><span>Observar o ambiente</span>{' '}<span>é o primeiro passo</span>{' '}<span>para <em>transformá-lo.</em></span></h1>
          <p>Desenvolvido por estudantes da FUNEC Riacho com acompanhamento de professores, o Arboris.X combina observação ambiental, prototipagem e educação. A pergunta que guia o trabalho é como as condições do espaço urbano se relacionam com a temperatura.</p>
          <div className="project-story__meta"><span>FUNEC Riacho</span><span>XIII Mostra de Tecnologia · 2026</span></div>
        </div>
        <div className="project-story__hero-art" aria-hidden="true"><span className="project-story__sun" /><span className="project-story__leaf project-story__leaf--one" /><span className="project-story__leaf project-story__leaf--two" /><span className="project-story__orbit" /><span className="project-story__ground" /></div>
      </section>

      <section className="project-story__section project-story__heat" aria-labelledby="project-heat-title">
        <div className="project-story__section-heading" data-reveal=""><span className="project-story__eyebrow">01 / O CONTEXTO</span><h2 id="project-heat-title">Por que algumas áreas urbanas são mais quentes?</h2><p>Uma ilha de calor urbana é uma diferença de temperatura entre áreas construídas e seus arredores. Pavimentação, edificações, cor e composição dos materiais podem mudar quanto da energia solar é refletida, absorvida e retida; sombra, vento e umidade também contam.</p><p>Árvores oferecem sombra e liberam vapor de água pela evapotranspiração. Nesse processo, a água líquida passa ao estado gasoso e consome energia do entorno, o que pode contribuir para moderar o aquecimento. O efeito varia conforme o clima e as condições do local.</p></div>
        <div className="project-story__landscapes" data-reveal="">
          <figure className="project-story__landscape project-story__landscape--green"><div className="project-story__landscape-scene" aria-hidden="true"><i /><i /><i /></div><figcaption><strong>Mais vegetação</strong><span>Árvores, sombra e superfícies naturais.</span></figcaption></figure>
          <figure className="project-story__landscape project-story__landscape--urban"><div className="project-story__landscape-scene" aria-hidden="true"><i /><i /><i /></div><figcaption><strong>Mais superfícies construídas</strong><span>Pavimento e edificações alteram o ambiente.</span></figcaption></figure>
        </div>
        <p className="project-story__disclaimer">Ilustrações conceituais para explicar o tema; não representam medições do Arboris.X.</p>
      </section>

      <section className="project-story__section project-story__proposal" aria-labelledby="project-proposal-title">
        <div className="project-story__section-heading" data-reveal=""><span className="project-story__eyebrow">02 / A PROPOSTA</span><h2 id="project-proposal-title">Tecnologia para observar e compreender.</h2><p>O projeto começa com uma leitura local e transforma uma pergunta em investigação: observar o lugar, anotar as condições, comparar momentos e discutir o que pode explicar as diferenças. Assim, a tecnologia serve como apoio à aprendizagem ambiental.</p></div>
        <ol className="project-story__goals">{PROJECT_GOALS.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal=""><span className="project-story__goal-number">{String(index + 1).padStart(2, '0')}</span><Icon size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </section>

      <section className="project-story__section project-story__prototype" aria-labelledby="project-prototype-title" data-reveal="">
        <div><span className="project-story__eyebrow">03 / PROTÓTIPO FÍSICO</span><h2 id="project-prototype-title">A observação começa no aparelho.</h2><p>O protótipo físico inicial mede a temperatura ambiente e apresenta a leitura em sua própria tela. Hoje, há um único aparelho; por isso, a leitura serve para observar o ponto onde ele está, não para representar toda a cidade.</p><p>Em um sistema embarcado, um programa executado na placa interpreta a leitura do sensor e orienta a atualização do display. A placa, o sensor e o código específicos usados no protótipo não estão descritos nesta página.</p><p className="project-story__status">Na versão apresentada, a experiência digital explora o tema de forma independente do protótipo físico.</p></div>
        <ol className="project-story__flow" aria-label="Fluxo atual da medição"><li><Leaf aria-hidden="true" /><span>Ambiente</span></li><li><Thermometer aria-hidden="true" /><span>Sensor de temperatura</span></li><li><Monitor aria-hidden="true" /><span>Tela do aparelho</span></li></ol>
      </section>

      <section className="project-story__section project-story__platform" aria-labelledby="project-platform-title" data-reveal="">
        <div className="project-story__platform-window" aria-hidden="true"><div className="project-story__platform-bar"><i /><i /><i /></div><div className="project-story__platform-body"><span /><div><i /><i /><i /></div></div><small>Conceito visual da interface</small></div>
        <div><span className="project-story__eyebrow">04 / PLATAFORMA WEB</span><h2 id="project-platform-title">Uma plataforma para explorar.</h2><p>O Arboris.X oferece conteúdos ambientais, quiz, recursos de acessibilidade e uma experiência digital de navegação. O modo demonstração usa valores simulados identificados como exemplos.</p><p>A prévia ao lado é uma composição visual e não exibe leituras reais. A integração com sensores físicos pode ser estudada como uma expansão futura.</p></div>
      </section>

      <section className="project-story__section project-story__ods" aria-labelledby="project-ods-title">
        <div className="project-story__section-heading" data-reveal=""><span className="project-story__eyebrow">05 / DIÁLOGO COM A AGENDA 2030</span><h2 id="project-ods-title">Temas que se conectam aos ODS.</h2><p>Os ODS abaixo oferecem referências para a discussão educativa. A associação não significa que o projeto já tenha medido impacto ou alcançado suas metas.</p></div>
        <ul className="project-story__ods-list">{PROJECT_ODS.map(({ number, title, relation }) => <li key={number} data-reveal=""><span>ODS {number}</span><div><h3>{title}</h3><p>{relation}</p></div></li>)}</ul>
      </section>

      <section className="project-story__section project-story__timeline" aria-labelledby="project-timeline-title">
        <div className="project-story__section-heading" data-reveal=""><span className="project-story__eyebrow">06 / DESENVOLVIMENTO</span><h2 id="project-timeline-title">Um projeto construído por etapas.</h2></div>
        <ol>{PROJECT_STAGES.map((title, index) => <li key={title} data-reveal=""><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><small>{index === 3 ? 'Em estudo' : 'Nesta versão'}</small></li>)}</ol>
      </section>

      <section className="project-story__closing" aria-labelledby="project-closing-title" data-reveal=""><span className="project-story__eyebrow">CONTINUE EXPLORANDO</span><h2 id="project-closing-title">Conhecimento que cresce com a observação.</h2><p>O Arboris.X é um projeto educacional desenvolvido na FUNEC Riacho, que utiliza a tecnologia para estimular a compreensão das condições ambientais.</p><div><Link to="/dashboard?section=how">Como funciona <ArrowRight size={17} aria-hidden="true" /></Link><Link to="/dashboard?section=team">Conheça nossa equipe <ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    </div>
  );
}

const HOW_STAGES = [
  { label: 'O ambiente', title: 'Tudo começa no lugar onde o aparelho está.', description: 'O protótipo mede a temperatura do ambiente em que foi instalado. Uma leitura representa aquele ponto e momento, não as condições de toda a região.', note: 'Anote o horário e observe sombra, vegetação, vento e superfícies: esse contexto ajuda a interpretar e comparar valores.', icon: Wind },
  { label: 'O aparelho', title: 'O sensor mede; o programa atualiza a tela.', description: 'O protótipo físico mede a temperatura ambiente e mostra o resultado localmente. Em sistemas embarcados, o programa da placa interpreta os dados do sensor e controla o display.', note: 'Esta explicação apresenta o fluxo geral. O modelo da placa, o sensor e o código específicos do Arboris.X não estão documentados aqui. “-- °C” nesta ilustração não é uma leitura real.', icon: Thermometer },
  { label: 'A plataforma', title: 'O aprendizado continua no ambiente digital.', description: 'A plataforma oferece conteúdos sobre temperatura e ambiente urbano, quiz e uma demonstração com valores simulados identificados.', note: 'PERSPECTIVAS FUTURAS — a integração com sensores físicos é uma possibilidade em estudo.', icon: Monitor },
];

function HowStageArt({ activeStage }) {
  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--how-tilt-x', `${((event.clientY - bounds.top) / bounds.height - .5) * -3}deg`);
    event.currentTarget.style.setProperty('--how-tilt-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 4}deg`);
  };
  const resetPointer = (event) => {
    event.currentTarget.style.removeProperty('--how-tilt-x');
    event.currentTarget.style.removeProperty('--how-tilt-y');
  };

  return (
    <div className="how-story__stage-art" data-stage={activeStage} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} aria-hidden="true">
      {activeStage === 0 && <div className="how-story__nature-art"><span className="how-story__nature-sun" /><span className="how-story__nature-leaf how-story__nature-leaf--one" /><span className="how-story__nature-leaf how-story__nature-leaf--two" /><span className="how-story__nature-air" /></div>}
      {activeStage === 1 && <div className="how-story__device"><span className="how-story__device-pin how-story__device-pin--left" /><span className="how-story__device-pin how-story__device-pin--right" /><div className="how-story__device-face"><span className="how-story__device-sensor"><Thermometer size={21} /></span><span className="how-story__device-trace" /><span className="how-story__device-screen">-- °C</span><span className="how-story__device-label">LEITURA LOCAL</span></div></div>}
      {activeStage === 2 && <div className="how-story__web-art"><div className="how-story__web-bar"><i /><i /><i /></div><div className="how-story__web-body"><span /><div><i /><i /><i /></div></div><small>INTERFACE CONCEITUAL</small></div>}
    </div>
  );
}

export function HowItWorksSection() {
  const howRef = useRef(null);
  const [activeStage, setActiveStage] = useState(0);
  useSectionReveal(howRef);
  const stage = HOW_STAGES[activeStage];

  return (
    <div className="how-story" ref={howRef}>
      <section className="how-story__hero" aria-labelledby="how-hero-title" data-reveal="">
        <div className="how-story__hero-copy">
          <span className="how-story__eyebrow">COMO FUNCIONA / ARBORIS.X</span>
          <h1 id="how-hero-title"><span>Da natureza</span>{' '}<span>à <em>informação.</em></span></h1>
          <p>Conheça o caminho da temperatura ambiente: o contexto do local, a observação feita pelo protótipo e as experiências educativas disponíveis na plataforma digital.</p>
          <a className="how-story__explore" href="#how-demonstration">Explore o funcionamento <span aria-hidden="true">↓</span></a>
        </div>
        <div className="how-story__hero-visual" aria-hidden="true"><span className="how-story__hero-light" /><span className="how-story__hero-orbit" /><span className="how-story__hero-leaf" /><span className="how-story__hero-chip"><CircuitBoard size={64} strokeWidth={.8} /></span></div>
      </section>

      <section className="how-story__section how-story__demonstration" id="how-demonstration" aria-labelledby="how-demonstration-title">
        <div className="how-story__section-heading" data-reveal=""><span className="how-story__eyebrow">A JORNADA DA MEDIÇÃO</span><h2 id="how-demonstration-title">Do ambiente à leitura.</h2><p>Escolha uma etapa para entender a observação local e o papel educativo da plataforma. A versão apresentada não utiliza coleta automática de sensores.</p></div>
        <div className="how-story__stage-nav" role="group" aria-label="Etapas do funcionamento" data-reveal="">{HOW_STAGES.map(({ label, icon: Icon }, index) => <button type="button" key={label} aria-pressed={activeStage === index} onClick={() => setActiveStage(index)}><span>{String(index + 1).padStart(2, '0')}</span><Icon size={18} aria-hidden="true" />{label}</button>)}</div>
        <div className="how-story__stage-panel" aria-live="polite" data-reveal=""><HowStageArt activeStage={activeStage} /><div className="how-story__stage-copy"><span className="how-story__eyebrow">ETAPA {String(activeStage + 1).padStart(2, '0')} / {stage.label.toUpperCase()}</span><h3>{stage.title}</h3><p>{stage.description}</p><p className={activeStage === 2 ? 'how-story__stage-note how-story__stage-note--planned' : 'how-story__stage-note'}>{stage.note}</p></div></div>
        <div className="how-story__flow" aria-label="Fluxo atual e possibilidade futura" data-reveal=""><div className="how-story__flow-current"><span>AMBIENTE</span><i aria-hidden="true" /><span>MEDIÇÃO</span><i aria-hidden="true" /><span>EXIBIÇÃO LOCAL</span></div><div className="how-story__flow-future"><span>APARELHO</span><i aria-hidden="true" /><span>PLATAFORMA WEB</span><small>POSSIBILIDADE FUTURA</small></div></div>
      </section>

      <section className="how-story__section how-story__reality" aria-labelledby="how-reality-title">
        <div className="how-story__section-heading" data-reveal=""><span className="how-story__eyebrow">ESTADO ATUAL</span><h2 id="how-reality-title">O que já funciona.</h2><p>O aparelho e a aplicação têm funções diferentes: um apresenta a medição no local e a outra oferece acesso digital e uma demonstração identificada.</p></div>
        <div className="how-story__reality-grid"><article data-reveal=""><span className="how-story__reality-icon"><Thermometer aria-hidden="true" /></span><h3>Protótipo físico</h3><p>Mede a temperatura ambiente e mostra o resultado na tela do próprio aparelho.</p></article><article data-reveal=""><span className="how-story__reality-icon"><Monitor aria-hidden="true" /></span><h3>Plataforma digital</h3><p>Oferece conteúdos ambientais, quiz, acessibilidade e um modo demonstração identificado.</p></article><article className="how-story__reality-planned" data-reveal=""><span className="how-story__reality-icon"><CircuitBoard aria-hidden="true" /></span><h3>Perspectivas futuras</h3><p>A equipe considera explorar a integração com sensores e Arduino para ampliar a coleta e visualização de dados, sem prazo definido.</p></article></div>
      </section>

      <section className="how-story__section how-story__measurement" aria-labelledby="how-measurement-title" data-reveal=""><div className="how-story__measurement-art" aria-hidden="true"><span /><span /><Sun size={47} strokeWidth={1} /></div><div><span className="how-story__eyebrow">ENTENDENDO A MEDIÇÃO</span><h2 id="how-measurement-title">O lugar da leitura importa.</h2><p>Temperatura indica o estado térmico do ar; calor é energia transferida quando existe diferença de temperatura. Sombra, vegetação e superfícies construídas ajudam a explicar o contexto de uma leitura.</p><p>A evaporação da água é uma mudança física: o líquido passa a vapor e precisa de energia. As plantas também liberam vapor pela transpiração. Esses processos podem influenciar as condições locais, mas seus efeitos variam com umidade, vento, clima e horário.</p><p>Uma leitura isolada descreve um ponto e um momento; sozinha, não comprova uma ilha de calor. Para comparar observações, registre onde e quando foram feitas e considere condições semelhantes.</p></div></section>
      <div className="how-story__closing" data-reveal=""><span className="how-story__eyebrow">CONTINUE EXPLORANDO</span><p>Quer conhecer a ideia por trás do projeto?</p><Link to="/dashboard?section=project">Sobre o projeto <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </div>
  );
}

const FRONTEND_TECH = [
  { name: 'HTML5', role: 'Estrutura', description: 'Organiza o conteúdo, formulários e áreas semânticas que você acessa no navegador.', icon: Code2, mark: '5', motion: 'structure' },
  { name: 'CSS3', role: 'Apresentação', description: 'Define a identidade visual, os layouts responsivos e as transições da interface.', icon: Layers3, mark: '3', motion: 'style' },
  { name: 'JavaScript', role: 'Interação', description: 'Conecta ações, estados e respostas da aplicação às escolhas de quem usa o site.', icon: Braces, mark: 'JS', motion: 'signal' },
  { name: 'React', role: 'Componentes', description: 'Constrói as telas com componentes reutilizáveis e atualiza o conteúdo conforme o estado.', icon: Boxes, mark: 'R', motion: 'orbit' },
  { name: 'Vite', role: 'Desenvolvimento e build', description: 'Inicia o ambiente local e gera os arquivos otimizados do frontend.', icon: Package, mark: 'V', motion: 'beam' },
];

const ARCHITECTURE = [
  { id: 'person', name: 'Pessoa', subtitle: 'Navegação e escolhas', icon: Users, description: 'Uma pessoa usa a interface para consultar conteúdo e iniciar ações. O diagrama mostra o caminho da aplicação, não uma medição do aparelho.' },
  { id: 'interface', name: 'Interface web', subtitle: 'React no navegador', icon: Monitor, description: 'A interface apresenta as páginas. Para autenticação, ela conversa diretamente com o Supabase Auth; para operações protegidas, envia o token à API.' },
  { id: 'backend', name: 'Serviços da API', subtitle: 'Node.js e Express', icon: Server, description: 'A API valida a identidade, confirma a autorização adicional da sessão e atende às operações existentes. Respostas seguem de volta para a interface.' },
  { id: 'data', name: 'Dados', subtitle: 'PostgreSQL e Supabase', icon: Database, description: 'O PostgreSQL organiza perfis, desafios, sessões autorizadas e limites de taxa. Os valores do modo demonstração são simulados e não são medições físicas.' },
  { id: 'identity', name: 'Supabase Auth', subtitle: 'Identidade da conta', icon: KeyRound, description: 'O navegador usa o Supabase Auth para entrar. A API valida o token e exige confirmação adicional antes de liberar as áreas protegidas.' },
];

function TechnologyHeading({ number, eyebrow, title, children, id }) {
  return <div className="technology-story__heading" data-reveal=""><span className="technology-story__eyebrow">{number} / {eyebrow}</span><h2 id={id}>{title}</h2>{children && <p>{children}</p>}</div>;
}

function TechnologyCore({ compact = false }) {
  return <div className={`technology-core${compact ? ' technology-core--compact' : ''}`} aria-hidden="true">
    <svg className="technology-core__paths" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet"><path d="M250 250 C194 218 197 128 109 99 M250 250 C304 205 296 126 393 92 M250 250 C195 291 210 373 95 414 M250 250 C315 282 309 374 410 411 M250 250 C130 240 112 269 34 255 M250 250 C360 230 393 258 468 250" /></svg>
    <span className="technology-core__halo" /><span className="technology-core__chip"><CircuitBoard size={compact ? 34 : 58} strokeWidth={1.1} /></span>
    <span className="technology-core__leaf technology-core__leaf--one" /><span className="technology-core__leaf technology-core__leaf--two" />
    <span className="technology-core__spark technology-core__spark--one" /><span className="technology-core__spark technology-core__spark--two" /><span className="technology-core__spark technology-core__spark--three" />
  </div>;
}

export function TechnologySection() {
  const experienceRef = useRef(null);
  const [selectedLayer, setSelectedLayer] = useState('interface');
  const selected = ARCHITECTURE.find((layer) => layer.id === selectedLayer);
  useSectionReveal(experienceRef);

  return <div className="technology-story" ref={experienceRef}>
    <section className="technology-story__hero" aria-labelledby="technology-hero-title" data-reveal="">
      <div className="technology-story__hero-copy"><span className="technology-story__eyebrow">ARBORIS.X / ENGENHARIA DIGITAL</span><h1 id="technology-hero-title"><span>A tecnologia por trás</span> <span>da <em>natureza.</em></span></h1><p>Uma arquitetura que conecta desenvolvimento web, gerenciamento de dados e proteção de acesso para construir uma plataforma de inteligência ambiental.</p><div className="technology-story__hero-note"><CircuitBoard size={19} aria-hidden="true" /><span>Interface, serviços e dados trabalhando em conjunto.</span></div><a className="technology-story__hero-link" href="#technology-frontend">Explorar tecnologias <ArrowRight size={18} aria-hidden="true" /></a></div>
      <div className="technology-story__hero-visual"><TechnologyCore /><span className="technology-story__visual-caption">Representação artística da engenharia digital</span></div>
    </section>

    <section className="technology-story__section" id="technology-frontend" aria-labelledby="technology-frontend-title"><TechnologyHeading number="01" eyebrow="FRONTEND" title="A experiência que você vê." id="technology-frontend-title">Cinco peças com funções diferentes formam a interface no navegador.</TechnologyHeading><div className="technology-story__frontend-grid">{FRONTEND_TECH.map(({ name, role, description, icon: Icon, mark, motion }) => <article className="technology-story__tech" data-motion={motion} data-reveal="" key={name}><span className="technology-story__tech-symbol" aria-hidden="true"><Icon size={28} strokeWidth={1.4} /><b>{mark}</b></span><span className="technology-story__tech-role">{role}</span><h3>{name}</h3><p>{description}</p><span className="technology-story__tech-trace" aria-hidden="true" /></article>)}</div><p className="technology-story__footnote">Vite é uma ferramenta de desenvolvimento e build; HTML, CSS, JavaScript e React compõem a experiência executada no navegador.</p></section>

    <section className="technology-story__section technology-story__section--split" aria-labelledby="technology-backend-title"><div><TechnologyHeading number="02" eyebrow="BACKEND" title="A estrutura por trás da interface." id="technology-backend-title">A API recebe solicitações da interface, aplica as verificações necessárias, consulta os serviços de dados e devolve uma resposta.</TechnologyHeading><div className="technology-story__pair"><article data-reveal=""><span><Server size={22} aria-hidden="true" /></span><h3>Node.js</h3><p>Executa os serviços JavaScript do servidor.</p></article><article data-reveal=""><span><Route size={22} aria-hidden="true" /></span><h3>Express</h3><p>Organiza as rotas, os middlewares e as respostas da API.</p></article></div></div><div className="technology-story__request" data-reveal="" aria-label="Ilustração conceitual: interface envia solicitação à API, que consulta serviços de dados e devolve uma resposta"><span className="technology-story__diagram-label">FLUXO CONCEITUAL</span><div className="technology-story__request-flow"><span><Monitor size={23} aria-hidden="true" /> Interface</span><i aria-hidden="true" /><span><Server size={23} aria-hidden="true" /> API</span><i aria-hidden="true" /><span><Database size={23} aria-hidden="true" /> Dados</span></div><div className="technology-story__request-return"><ArrowRight size={18} aria-hidden="true" /> Resposta para a interface</div><p>A animação ilustra a comunicação; ela não envia requisições.</p></div></section>

    <section className="technology-story__section technology-story__section--data" aria-labelledby="technology-data-title"><div className="technology-story__data-art" data-reveal="" aria-hidden="true"><span className="technology-story__data-orbit" /><span className="technology-story__data-layer technology-story__data-layer--one" /><span className="technology-story__data-layer technology-story__data-layer--two" /><span className="technology-story__data-layer technology-story__data-layer--three" /><Database size={38} strokeWidth={1.1} /></div><div><TechnologyHeading number="03" eyebrow="DADOS" title="Informações organizadas." id="technology-data-title">A plataforma usa serviços de dados para recursos atuais de conta e proteção de acesso.</TechnologyHeading><div className="technology-story__data-list"><article data-reveal=""><h3>PostgreSQL</h3><p>Banco relacional usado para perfis, desafios por código, sessões autorizadas e limites de taxa persistentes.</p></article><article data-reveal=""><h3>Supabase</h3><p>Fornece a plataforma de dados e o serviço de identidade utilizado pela aplicação.</p></article></div><p className="technology-story__footnote">Os valores exibidos no modo demonstração são simulados e não representam medições físicas.</p></div></section>

    <section className="technology-story__section technology-story__section--trust" aria-labelledby="technology-trust-title"><TechnologyHeading number="04" eyebrow="AUTENTICAÇÃO" title="Acesso e confiança." id="technology-trust-title">A identidade da conta e a autorização para entrar no Dashboard são verificações distintas.</TechnologyHeading><div className="technology-story__trust-layout"><div className="technology-story__trust-art" data-reveal="" aria-hidden="true"><span /><span /><span /><LockKeyhole size={46} strokeWidth={1.15} /></div><div className="technology-story__trust-list"><article data-reveal=""><KeyRound size={21} aria-hidden="true" /><div><h3>Supabase Auth e Google OAuth</h3><p>Gerenciam a entrada por e-mail e senha ou pela conta Google.</p></div></article><article data-reveal=""><Mail size={21} aria-hidden="true" /><div><h3>Confirmação adicional por e-mail</h3><p>O backend envia um código pelo Gmail API para confirmar o acesso da sessão.</p></div></article><article data-reveal=""><ShieldCheck size={21} aria-hidden="true" /><div><h3>Sessão protegida</h3><p>A API valida a identidade, a autorização adicional e os limites de taxa antes de atender operações protegidas.</p></div></article></div></div></section>

    <section className="technology-story__section technology-story__section--architecture" aria-labelledby="technology-architecture-title">
      <TechnologyHeading number="05" eyebrow="ARQUITETURA INTERATIVA" title="Como as partes se conectam." id="technology-architecture-title">Selecione uma camada para entender seu papel. As conexões mostram o fluxo atual da aplicação.</TechnologyHeading>
      <div className="technology-story__architecture" data-reveal="">
        <div className="technology-story__arch-flow">{ARCHITECTURE.slice(0, 4).map(({ id, name, subtitle, icon: Icon }, index) => <div className="technology-story__arch-step" key={id}>{index > 0 && <span className="technology-story__arch-connector" data-active={selectedLayer === id || selectedLayer === ARCHITECTURE[index - 1].id || (selectedLayer === 'identity' && id === 'backend')} aria-hidden="true"><ArrowRight size={19} /></span>}<button type="button" className="technology-story__arch-node" aria-pressed={selectedLayer === id} onClick={() => setSelectedLayer(id)}><Icon size={25} strokeWidth={1.4} aria-hidden="true" /><strong>{name}</strong><small>{subtitle}</small></button></div>)}</div>
        <div className="technology-story__arch-branch"><span data-active={['interface', 'backend', 'identity'].includes(selectedLayer)} aria-hidden="true" /><button type="button" className="technology-story__arch-node technology-story__arch-node--identity" aria-pressed={selectedLayer === 'identity'} onClick={() => setSelectedLayer('identity')}><KeyRound size={23} strokeWidth={1.4} aria-hidden="true" /><strong>Supabase Auth</strong><small>Navegador ↔ identidade · API ↔ validação</small></button></div>
        <div className="technology-story__arch-detail" aria-live="polite"><span>CAMADA SELECIONADA</span><h3>{selected.name}</h3><p>{selected.description}</p></div>
      </div>
    </section>

      <section className="technology-story__section technology-story__section--hardware" aria-labelledby="technology-hardware-title"><div><TechnologyHeading number="06" eyebrow="PROTÓTIPO FÍSICO" title="A leitura começa fora da tela." id="technology-hardware-title">O aparelho inicial mede a temperatura ambiente e apresenta o valor em sua própria tela.</TechnologyHeading><p>Em um sistema embarcado, o firmware é o programa que roda na placa: ele lê os dados do sensor, interpreta o valor e orienta a exibição no display. Esse fluxo ajuda a entender a programação de hardware sem depender de detalhes avançados.</p><p>O modelo da placa, do sensor e o código específico do protótipo não estão confirmados na documentação disponível. A ilustração ao lado representa apenas o funcionamento conhecido.</p><p className="technology-story__hardware-status">Perspectivas futuras: estudar a integração com Arduino e sensores, a coleta automatizada e novas ferramentas de análise ambiental. São possibilidades sem prazo definido.</p></div><div className="technology-story__hardware-art" data-reveal=""><div className="technology-story__hardware-step"><Wind size={25} aria-hidden="true" /><span>Ambiente</span></div><ArrowRight size={20} aria-hidden="true" /><div className="technology-story__hardware-step technology-story__hardware-device"><Thermometer size={27} aria-hidden="true" /><span>Sensor e programa</span></div><ArrowRight size={20} aria-hidden="true" /><div className="technology-story__hardware-step"><Monitor size={25} aria-hidden="true" /><span>Tela do aparelho</span></div><small>Ilustração conceitual · sem leitura real</small></div></section>

    <section className="technology-story__section technology-story__section--compact" aria-labelledby="technology-tools-title"><TechnologyHeading number="07" eyebrow="CONSTRUÇÃO" title="Ferramentas de desenvolvimento." id="technology-tools-title">Apoiam a construção do projeto; não são etapas da experiência de quem visita o site.</TechnologyHeading><div className="technology-story__tools"><span><GitBranch size={19} aria-hidden="true" /><strong>Git</strong><small>Controle de versões</small></span><span><Package size={19} aria-hidden="true" /><strong>npm</strong><small>Dependências e scripts</small></span><span><TestTube2 size={19} aria-hidden="true" /><strong>Vitest</strong><small>Testes do frontend</small></span><span><ShieldCheck size={19} aria-hidden="true" /><strong>ESLint</strong><small>Qualidade de código</small></span></div></section>

    <section className="technology-story__section technology-story__section--infra" aria-labelledby="technology-infra-title"><TechnologyHeading number="08" eyebrow="INFRAESTRUTURA" title="Do ambiente local à publicação." id="technology-infra-title">A infraestrutura documentada distingue serviços em uso de configuração de hospedagem.</TechnologyHeading><div className="technology-story__infra-grid"><article data-reveal=""><Database size={22} aria-hidden="true" /><span>EM USO</span><h3>Supabase</h3><p>Identidade e serviços de dados utilizados pela aplicação.</p></article><article data-reveal=""><Cloud size={22} aria-hidden="true" /><span>CONFIGURAÇÃO DE PUBLICAÇÃO</span><h3>Render</h3><p>Há uma configuração de implantação da API no repositório. Ela não comprova que o site já esteja publicado.</p></article></div></section>

    <section className="technology-story__closing" aria-labelledby="technology-closing-title" data-reveal=""><TechnologyCore compact /><div><span className="technology-story__eyebrow">CONTINUE EXPLORANDO</span><h2 id="technology-closing-title">Engenharia para observar melhor.</h2><p>Conheça o caminho da medição física e o propósito ambiental do projeto.</p><div><Link to="/dashboard?section=how">Como funciona <ArrowRight size={17} aria-hidden="true" /></Link><Link to="/dashboard?section=project">Sobre o projeto <ArrowRight size={17} aria-hidden="true" /></Link></div></div></section>
  </div>;
}

const PrivacidadeModal = lazy(() => import('../ModaisArboris/ModaisArboris').then(({ PrivacidadeModal: Modal }) => ({ default: Modal })));

const SECURITY_LAYERS = [
  { icon: Fingerprint, short: 'Identidade', title: 'Identidade', detail: 'O acesso começa com a autenticação da conta por e-mail e senha ou pelo provedor Google, usando o Supabase Auth.' },
  { icon: Mail, short: 'Confirmação', title: 'Verificação adicional', detail: 'Quando necessário, um código temporário de seis dígitos enviado ao e-mail confirma o acesso antes de autorizar esta área.' },
  { icon: ShieldCheck, short: 'Sessão', title: 'Proteção da sessão', detail: 'Cada entrada na área interna depende de uma sessão de identidade válida e de autorização adicional vinculada a ela. Encerrar a conta revoga esse acesso.' },
  { icon: Database, short: 'Informações', title: 'Proteção das informações', detail: 'Dados de conta e registros de autorização ficam em serviços de dados com controles de acesso. As políticas de acesso por linha restringem a leitura de dados vinculados à conta.' },
  { icon: SlidersHorizontal, short: 'Solicitações', title: 'Prevenção de abusos', detail: 'Limites de solicitações e tentativas ajudam a reduzir usos excessivos dos fluxos de acesso e confirmação.' },
];

const SECURITY_ACCOUNT = [
  { icon: KeyRound, title: 'E-mail e senha', text: 'Você pode entrar com as credenciais da sua conta. A autenticação é gerenciada pelo Supabase Auth.' },
  { icon: Users, title: 'Acesso com Google', text: 'A tela de entrada também oferece autenticação com sua conta Google.' },
  { icon: Mail, title: 'Código de confirmação', text: 'Uma verificação adicional por código de seis dígitos pode ser exigida antes do acesso ao Dashboard.' },
  { icon: Eye, title: 'Navegador confiável', text: 'Quando este recurso estiver habilitado, um navegador reconhecido poderá simplificar acessos posteriores conforme as regras da conta.' },
  { icon: LockKeyhole, title: 'Recuperação de senha', text: 'Na tela de entrada, você pode solicitar por e-mail um link para recuperar o acesso.' },
  { icon: LogOut, title: 'Encerramento de sessão', text: 'A opção “Sair da conta” fica em Configurações e encerra a autorização da sessão atual.' },
];

const SECURITY_PRACTICES = [
  'Use uma senha forte e exclusiva para sua conta.',
  'Nunca compartilhe códigos de verificação.',
  'Mantenha o acesso ao seu e-mail protegido.',
  'Encerre sua sessão em computadores compartilhados.',
  'Confira o endereço do site antes de entrar.',
  'Desconfie de mensagens que peçam credenciais ou códigos.',
];

function SecurityShield({ onPointerMove, onPointerLeave }) {
  return (
    <div className="security-shield" aria-hidden="true" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="security-shield__scene">
        <span className="security-shield__halo security-shield__halo--outer" />
        <span className="security-shield__halo security-shield__halo--inner" />
        <svg className="security-shield__roots" viewBox="0 0 500 500" fill="none">
          <path d="M250 326 C 248 382, 199 389, 167 432 M250 326 C 254 380, 311 393, 333 435 M250 332 C 221 373, 226 402, 208 450 M251 332 C 283 373, 274 408, 291 451" />
          <circle cx="167" cy="432" r="3" /><circle cx="333" cy="435" r="3" /><circle cx="208" cy="450" r="2" /><circle cx="291" cy="451" r="2" />
        </svg>
        <span className="security-shield__shell security-shield__shell--rear" />
        <span className="security-shield__shell security-shield__shell--front" />
        <span className="security-shield__glass" />
        <span className="security-shield__core"><Leaf size={72} strokeWidth={1.1} /></span>
        <span className="security-shield__node security-shield__node--one" />
        <span className="security-shield__node security-shield__node--two" />
        <span className="security-shield__node security-shield__node--three" />
      </div>
      <span className="security-shield__caption">Representação conceitual das camadas de proteção</span>
    </div>
  );
}

export function SecuritySection() {
  const experienceRef = useRef(null);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  useSectionReveal(experienceRef, '.security-story__ambient');
  useEffect(() => {
    const updateVisibility = () => experienceRef.current?.toggleAttribute('data-hidden', document.visibilityState === 'hidden');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);
  const activeLayer = SECURITY_LAYERS[selectedLayer];
  const ActiveLayerIcon = activeLayer.icon;
  const moveShield = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--shield-y', `${(((event.clientX - bounds.left) / bounds.width - .5) * 7).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--shield-x', `${(((event.clientY - bounds.top) / bounds.height - .5) * -7).toFixed(2)}deg`);
  };
  const resetShield = (event) => {
    event.currentTarget.style.removeProperty('--shield-y');
    event.currentTarget.style.removeProperty('--shield-x');
  };
  const scrollToProtections = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    document.getElementById('security-layers')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return <div className="security-story" ref={experienceRef}>
    <section className="security-story__hero" aria-labelledby="security-title">
      <div className="security-story__hero-copy" data-reveal="">
        <span className="security-story__eyebrow">ARBORIS.X / SEGURANÇA E PRIVACIDADE</span>
        <h1 id="security-title">Confiança se constrói com <em>transparência.</em></h1>
        <p>Adotamos mecanismos de proteção de contas, validação de acesso e tratamento responsável das informações para oferecer uma experiência mais segura.</p>
        <p className="security-story__hero-aside">Conheça os recursos utilizados para proteger sua conta e entenda como suas informações são tratadas.</p>
        <div className="security-story__actions">
          <button type="button" className="security-story__button security-story__button--primary" onClick={scrollToProtections}>Conhecer nossas proteções <ArrowRight size={18} aria-hidden="true" /></button>
          <button type="button" className="security-story__button security-story__button--ghost" onClick={() => setPrivacyOpen(true)}>Política de Privacidade <ExternalLink size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <SecurityShield onPointerMove={moveShield} onPointerLeave={resetShield} />
    </section>

    <section className="security-story__section security-story__section--layers" id="security-layers" aria-labelledby="security-layers-title">
      <div className="security-story__heading" data-reveal=""><span className="security-story__eyebrow">01 / PROTEÇÃO EM CAMADAS</span><h2 id="security-layers-title">Segurança em diferentes etapas.</h2><p>Selecione uma etapa para entender seu papel no acesso à plataforma.</p></div>
      <div className="security-story__layers" data-reveal="">
        <div className="security-story__layer-list" aria-label="Etapas de proteção">
          {SECURITY_LAYERS.map(({ icon: Icon, short }, index) => <button type="button" className="security-story__layer" key={short} aria-pressed={selectedLayer === index} onClick={() => setSelectedLayer(index)}><span className="security-story__layer-number">{String(index + 1).padStart(2, '0')}</span><Icon size={21} strokeWidth={1.6} aria-hidden="true" /><strong>{short}</strong><span className="security-story__layer-dot" aria-hidden="true" /></button>)}
        </div>
        <div className="security-story__layer-detail" aria-live="polite"><span>CAMADA {String(selectedLayer + 1).padStart(2, '0')} / 05</span><ActiveLayerIcon size={34} strokeWidth={1.3} aria-hidden="true" /><h3>{activeLayer.title}</h3><p>{activeLayer.detail}</p><small>Diagrama explicativo · sem monitoramento em tempo real</small></div>
      </div>
    </section>

    <section className="security-story__section security-story__section--account" aria-labelledby="security-account-title">
      <div className="security-story__heading" data-reveal=""><span className="security-story__eyebrow">02 / CONTA E ACESSO</span><h2 id="security-account-title">Proteção desde o primeiro acesso.</h2><p>Recursos presentes no fluxo atual, com as condições de uso indicadas.</p></div>
        <div className="security-story__account-grid">{SECURITY_ACCOUNT.map(({ icon: Icon, title, text }, index) => <article className="security-story__account-item security-story__ambient" key={title} data-reveal="" style={{ '--security-index': index }}><span className="security-story__account-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span><div><span className="security-story__item-number">{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p>{title === 'Navegador confiável' && <small>Recurso opcional. Consulte Configurações para saber se está disponível nesta instalação.</small>}</div></article>)}</div>
    </section>

    <section className="security-story__section security-story__section--privacy" aria-labelledby="security-privacy-title">
      <div className="security-story__privacy-copy" data-reveal=""><span className="security-story__eyebrow">03 / PRIVACIDADE</span><h2 id="security-privacy-title">Suas informações merecem respeito.</h2><p>O Arboris.X usa dados de conta e registros de acesso para autenticar, autorizar e manter a plataforma. Serviços externos participam dessas etapas.</p><button type="button" className="security-story__text-link" onClick={() => setPrivacyOpen(true)}>Ler a Política de Privacidade <ArrowRight size={17} aria-hidden="true" /></button></div>
      <div className="security-story__privacy-list security-story__ambient" data-reveal="">
        <div><span>01</span><strong>O que usamos</strong><p>E-mail, nome informado, identidade de acesso, dados de sessão e registros necessários à confirmação e à proteção da conta.</p></div>
        <div><span>02</span><strong>Para quê</strong><p>Permitir entrada, recuperação de acesso, autorização da área interna e prevenção de solicitações abusivas.</p></div>
        <div><span>03</span><strong>Quem participa</strong><p>Supabase processa autenticação e dados; o serviço de e-mail configurado entrega mensagens de acesso. O Google participa quando você escolhe esse método.</p></div>
        <div><span>04</span><strong>Seus pedidos</strong><p>Consulte os dados da conta em Configurações. Para dúvidas ou solicitações sobre dados, fale com a equipe pelo canal abaixo.</p></div>
      </div>
    </section>

    <section className="security-story__prototype security-story__ambient" aria-labelledby="security-prototype-title" data-reveal=""><div className="security-story__prototype-icon"><Thermometer size={34} strokeWidth={1.3} aria-hidden="true" /></div><div><span className="security-story__eyebrow">PROTÓTIPO FÍSICO</span><h2 id="security-prototype-title">Medição ambiental e conta são coisas diferentes.</h2><p>O protótipo mede a temperatura ambiente e mostra a leitura em sua própria tela. A versão digital apresentada funciona de forma independente e identifica os dados de demonstração como simulados.</p></div></section>

    <section className="security-story__section security-story__section--control" aria-labelledby="security-control-title"><div className="security-story__heading" data-reveal=""><span className="security-story__eyebrow">04 / AUTONOMIA</span><h2 id="security-control-title">Você no controle.</h2><p>As opções disponíveis ficam reunidas em lugares claros da plataforma.</p></div><div className="security-story__control-grid"><article data-reveal=""><SlidersHorizontal size={27} aria-hidden="true" /><h3>Conta e preferências</h3><p>Consulte nome e e-mail, ajuste aparência e acessibilidade e, quando disponível, gerencie navegadores confiáveis em Configurações.</p><Link to="/dashboard?section=settings">Abrir Configurações <ArrowRight size={17} aria-hidden="true" /></Link></article><article data-reveal=""><LockKeyhole size={27} aria-hidden="true" /><h3>Acesso e documentos</h3><p>Solicite recuperação de senha pela tela de entrada, consulte a política de privacidade e encerre a sessão usando “Sair da conta” em Configurações.</p><button type="button" onClick={() => setPrivacyOpen(true)}>Consultar privacidade <ArrowRight size={17} aria-hidden="true" /></button></article></div></section>

    <section className="security-story__section security-story__section--practices" aria-labelledby="security-practices-title"><div className="security-story__heading" data-reveal=""><span className="security-story__eyebrow">05 / BOAS PRÁTICAS</span><h2 id="security-practices-title">Pequenos cuidados fazem a diferença.</h2><p>Proteção também depende de escolhas simples no dia a dia.</p></div><ol className="security-story__practice-list">{SECURITY_PRACTICES.map((item, index) => <li key={item} data-reveal="" style={{ '--security-index': index }}><span><Check size={17} aria-hidden="true" /></span>{item}</li>)}</ol></section>

    <section className="security-story__closing security-story__ambient" aria-labelledby="security-closing-title" data-reveal=""><div><AlertCircle size={26} strokeWidth={1.4} aria-hidden="true" /><span className="security-story__eyebrow">COMPROMISSO CONTÍNUO</span><h2 id="security-closing-title">Segurança é um compromisso contínuo.</h2><p>O Arboris.X utiliza mecanismos de proteção e controle de acesso que são revisados durante seu desenvolvimento. Como qualquer sistema digital, nenhuma aplicação pode garantir proteção absoluta contra todos os riscos.</p></div><div className="security-story__contact"><Mail size={27} strokeWidth={1.4} aria-hidden="true" /><h3>Encontrou algo que devemos melhorar?</h3><p>Se você identificar um comportamento inesperado ou tiver dúvidas sobre a proteção das suas informações, entre em contato com a equipe responsável pelo projeto.</p><Link to="/dashboard?section=contact">Entrar em contato <ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    {privacyOpen && <Suspense fallback={null}><PrivacidadeModal isOpen onClose={() => setPrivacyOpen(false)} /></Suspense>}
  </div>;
}
