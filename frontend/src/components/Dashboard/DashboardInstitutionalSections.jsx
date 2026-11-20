import {
  BookOpen,
  Code2,
  Database,
  KeyRound,
  Mail,
  Presentation,
  Server,
  ShieldCheck,
  Thermometer,
  Users,
} from 'lucide-react';
import { PageIntro } from './DashboardSections';

const TEAM_MEMBERS = [
  'Amanda Costa Silva',
  'Fábio Fernandes',
  'Thaís Vitória',
  'Victor Guimarães',
  'Victor Salomão',
  'Bruna Ester',
  'Izzy Souza',
];

const MENTORS = [
  { name: 'Walter Santos', role: 'Orientador' },
  { name: 'Adriana Aguiar', role: 'Coorientadora' },
];

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
}

function ProjectCard({ icon: Icon, eyebrow, title, children }) {
  return (
    <article className="dashboard-panel dashboard-project-card">
      {Icon && <span className="dashboard-project-card__icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>}
      {eyebrow && <span className="dashboard-panel__eyebrow">{eyebrow}</span>}
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export function TeamSection() {
  return (
    <>
      <PageIntro
        eyebrow="PESSOAS E INSTITUIÇÃO"
        title="Quem somos"
        description="Um projeto desenvolvido por estudantes da FUNEC Riacho."
      />
      <section className="dashboard-institution-banner">
        <div>
          <span>ARBORIS.X · INTELIGÊNCIA AMBIENTAL</span>
          <h2>Conhecimento feito em equipe.</h2>
        </div>
        <div className="dashboard-institution-banner__facts">
          <p><strong>Instituição</strong>FUNEC Riacho — Fundação de Ensino de Contagem</p>
          <p><strong>Evento</strong>XIII Mostra de Tecnologia da FUNEC Riacho · 2026</p>
        </div>
      </section>

      <section className="dashboard-people-section" aria-labelledby="team-members-title">
        <div className="dashboard-subsection-heading">
          <div>
            <span className="dashboard-panel__eyebrow">ESTUDANTES</span>
            <h2 id="team-members-title">Equipe do projeto</h2>
          </div>
          <span>{TEAM_MEMBERS.length} integrantes</span>
        </div>
        <div className="dashboard-team-grid">
          {TEAM_MEMBERS.map((name) => (
            <article className="dashboard-person-card" key={name}>
              <span className="dashboard-person-card__monogram" aria-hidden="true">{initials(name)}</span>
              <h3>{name}</h3>
              <p>Integrante</p>
              <small>Função em definição</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-people-section" aria-labelledby="mentors-title">
        <div className="dashboard-subsection-heading">
          <div>
            <span className="dashboard-panel__eyebrow">ACOMPANHAMENTO</span>
            <h2 id="mentors-title">Orientação</h2>
          </div>
        </div>
        <div className="dashboard-team-grid dashboard-team-grid--mentors">
          {MENTORS.map(({ name, role }) => (
            <article className="dashboard-person-card dashboard-person-card--mentor" key={name}>
              <span className="dashboard-person-card__monogram" aria-hidden="true">{initials(name)}</span>
              <h3>{name}</h3>
              <p>{role}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function ProjectSection() {
  return (
    <>
      <PageIntro
        eyebrow="PROPÓSITO"
        title="Sobre o projeto"
        description="Tecnologia e observação para compreender as ilhas de calor urbanas."
      />
      <section className="dashboard-project-lead">
        <span className="dashboard-panel__eyebrow">ILHAS DE CALOR URBANAS</span>
        <h2>Observar a temperatura é um primeiro passo para entender o ambiente.</h2>
        <p>
          Áreas urbanizadas podem ficar mais quentes que seus arredores. As superfícies construídas retêm calor, e a menor presença de vegetação pode contribuir para essa diferença.
        </p>
      </section>
      <div className="dashboard-project-grid">
        <ProjectCard icon={Thermometer} eyebrow="O QUE OBSERVAMOS" title="Temperatura ambiente">
          <p>O protótipo atual mede a temperatura do ambiente e mostra o resultado em sua própria tela.</p>
        </ProjectCard>
        <ProjectCard icon={BookOpen} eyebrow="POR QUE IMPORTA" title="Conhecer as variações">
          <p>Medições ajudam a observar como o calor se manifesta em diferentes contextos urbanos.</p>
        </ProjectCard>
        <ProjectCard icon={Presentation} eyebrow="OBJETIVO" title="Construir conhecimento">
          <p>O Arboris.X é um projeto educacional. A plataforma está em desenvolvimento e ainda não recebe dados do aparelho.</p>
        </ProjectCard>
      </div>
    </>
  );
}

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'O aparelho mede',
    description: 'O protótipo físico mede a temperatura ambiente.',
    icon: Thermometer,
  },
  {
    number: '02',
    title: 'A tela exibe',
    description: 'O valor é mostrado localmente na tela do próprio aparelho.',
    icon: Presentation,
  },
  {
    number: '03',
    title: 'A plataforma se prepara',
    description: 'O site está em desenvolvimento para receber e organizar dados no futuro. Essa integração ainda não existe.',
    icon: Database,
  },
];

export function HowItWorksSection() {
  return (
    <>
      <PageIntro
        eyebrow="ETAPAS DO PROJETO"
        title="Como funciona"
        description="O que o protótipo faz hoje — e o que ainda está em preparação."
      />
      <ol className="dashboard-process-list">
        {PROCESS_STEPS.map(({ number, title, description, icon: Icon }) => (
          <li className="dashboard-process-step" key={number}>
            <span className="dashboard-process-step__number">{number}</span>
            <span className="dashboard-process-step__icon"><Icon size={20} aria-hidden="true" /></span>
            <h2>{title}</h2>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

const TECHNOLOGIES = [
  {
    icon: Code2,
    title: 'Interface web',
    items: ['HTML', 'CSS', 'JavaScript', 'React', 'Vite'],
    description: 'Estrutura, estilos e aplicação que você acessa no navegador.',
  },
  {
    icon: Server,
    title: 'Serviços',
    items: ['Node.js', 'Express'],
    description: 'Serviços que atendem às funções existentes da plataforma.',
  },
  {
    icon: Database,
    title: 'Dados',
    items: ['PostgreSQL', 'Supabase'],
    description: 'Base de dados usada pelos recursos atuais do projeto.',
  },
  {
    icon: KeyRound,
    title: 'Acesso à conta',
    items: ['Supabase Auth', 'Google OAuth'],
    description: 'Recursos existentes para entrar e proteger a conta.',
  },
];

export function TechnologySection() {
  return (
    <>
      <PageIntro
        eyebrow="BASE DO PRODUTO"
        title="Tecnologias"
        description="Ferramentas presentes na aplicação atual."
      />
      <div className="dashboard-technology-grid">
        {TECHNOLOGIES.map(({ icon: Icon, title, items, description }) => (
          <ProjectCard icon={Icon} title={title} key={title}>
            <p>{description}</p>
            <ul className="dashboard-tech-tags">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </ProjectCard>
        ))}
      </div>
    </>
  );
}

const SECURITY_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Proteção de contas',
    description: 'A autenticação da conta é gerenciada pelo Supabase Auth.',
  },
  {
    icon: KeyRound,
    title: 'Sessão confirmada',
    description: 'O acesso à área interna só é liberado após a validação da sessão.',
  },
  {
    icon: Users,
    title: 'Acesso com Google',
    description: 'O login com Google está disponível pela tela de entrada.',
  },
  {
    icon: Mail,
    title: 'Recuperação de senha',
    description: 'A tela de entrada permite solicitar um link de recuperação por e-mail.',
  },
];

export function SecuritySection() {
  return (
    <>
      <PageIntro
        eyebrow="ACESSO À PLATAFORMA"
        title="Segurança"
        description="Recursos atuais para proteger a conta e validar o acesso."
      />
      <div className="dashboard-security-grid">
        {SECURITY_FEATURES.map(({ icon: Icon, title, description }) => (
          <ProjectCard icon={Icon} title={title} key={title}>
            <p>{description}</p>
          </ProjectCard>
        ))}
      </div>
      <p className="dashboard-security-note">
        O aparelho de medição ainda não envia informações pessoais ou ambientais para o site.
      </p>
    </>
  );
}

const FAQ_ITEMS = [
  {
    question: 'O protótipo já envia dados para o site?',
    answer: 'Ainda não. O protótipo mostra a temperatura na tela do próprio aparelho. A integração com o site está em preparação.',
  },
  {
    question: 'Por que aparece “Nenhuma medição disponível”?',
    answer: 'Porque a plataforma ainda não recebe leituras do aparelho.',
  },
  {
    question: 'Como acesso minha conta?',
    answer: 'Entre com seu e-mail e senha ou use a opção Google na tela de entrada. Pode ser necessário confirmar o acesso por código.',
  },
  {
    question: 'Posso entrar com Google?',
    answer: 'Sim. O acesso com Google está disponível na tela de entrada.',
  },
  {
    question: 'Como redefinir minha senha?',
    answer: 'Na tela de entrada, selecione “Esqueceu sua senha?” e siga o link enviado ao seu e-mail.',
  },
];

export function FAQSection() {
  return (
    <>
      <PageIntro
        eyebrow="AJUDA"
        title="Dúvidas frequentes"
        description="Respostas rápidas sobre o aparelho, a plataforma e sua conta."
      />
      <section className="dashboard-faq-list" aria-label="Perguntas e respostas">
        {FAQ_ITEMS.map(({ question, answer }) => (
          <details className="dashboard-faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </>
  );
}
