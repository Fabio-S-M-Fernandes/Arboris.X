import { ArrowLeft, ArrowRight, ArrowUpRight, Leaf, Mail, MapPin, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { DOCUMENTS } from './ModaisArboris/documentos';
import './PublicPages.css';

const legalLinks = [
  ['/privacidade', 'Política de Privacidade'],
  ['/cookies', 'Política de Cookies'],
  ['/termos', 'Termos de Uso'],
];

function PublicHeader({ showHomeButton = false }) {
  return <header className="public-header">
    <Link className="public-brand" to="/" aria-label="Arboris.X — página inicial">
      <span className="public-brand__emblem"><img src="/arboris-tree.webp" alt="" /></span>
      <span className="public-brand__wordmark">ARBORIS<span>.X</span></span>
    </Link>
    <nav aria-label="Navegação principal">
      {showHomeButton && <Link className="public-header__home" to="/"><ArrowLeft size={15} aria-hidden="true" /> Voltar à página pública</Link>}
      {legalLinks.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
      <Link className="public-header__login" to="/login">Entrar <ArrowRight size={15} aria-hidden="true" /></Link>
      <span className="public-header__separator" aria-hidden="true">ou</span>
      <Link className="public-header__signup" to="/cadastro">Criar conta</Link>
    </nav>
  </header>;
}

function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-footer__main">
      <div className="public-footer__identity">
        <Link className="public-footer__brand" to="/" aria-label="Arboris.X — página inicial">
          <span className="public-footer__emblem"><img src="/arboris-tree.webp" alt="" /></span>
          <span>ARBORIS<span>.X</span></span>
        </Link>
        <p>Um projeto educativo da FUNEC Riacho que aproxima tecnologia, observação ambiental e aprendizagem sobre o calor nas cidades.</p>
      </div>
      <div className="public-footer__documents">
        <span className="public-footer__label">INFORMAÇÕES</span>
        <nav aria-label="Documentos públicos">{legalLinks.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</nav>
      </div>
      <a className="public-footer__contact" href="mailto:arborisx@gmail.com">
        <span className="public-footer__contact-icon"><Mail size={18} aria-hidden="true" /></span>
        <span><small>FALE COM A EQUIPE</small><strong>arborisx@gmail.com</strong></span>
        <ArrowUpRight className="public-footer__contact-arrow" size={18} aria-hidden="true" />
      </a>
    </div>
    <div className="public-footer__bottom">
      <span>ARBORIS.X · FUNEC Riacho</span>
      <span>Contagem, Minas Gerais</span>
    </div>
  </footer>;
}

export function HomePage() {
  const rootRef = useScreenReady();
  return <main className="public-page public-home" ref={rootRef}>
    <PublicHeader />
    <section className="public-hero" aria-labelledby="public-hero-title">
      <div className="public-hero__copy">
        <span className="public-eyebrow"><Leaf size={15} aria-hidden="true" /> INTELIGÊNCIA AMBIENTAL · FUNEC RIACHO</span>
        <h1 id="public-hero-title">Observar a temperatura. <em>Compreender a cidade.</em></h1>
        <p>Desenvolvido por estudantes da FUNEC Riacho, o Arboris.X combina tecnologia e educação ambiental para observar a temperatura e investigar como vegetação, sombra e superfícies construídas se relacionam com o calor urbano.</p>
        <div className="public-hero__actions">
          <a className="public-action public-action--primary" href="#projeto">Conhecer o projeto <ArrowRight size={18} aria-hidden="true" /></a>
          <a className="public-action public-action--quiet" href="#equipe">Conhecer a equipe</a>
        </div>
      </div>
      <div className="public-hero__art" aria-hidden="true">
        <span className="public-orbit public-orbit--one" />
        <div className="public-meter-card">
          <div className="public-meter-card__face">
            <div className="public-meter-card__screen">
              <div className="public-meter-card__screen-label">TEMPERATURA AMBIENTE</div>
              <div className="public-meter-card__body">
                <span className="public-meter-card__halo"><Thermometer size={43} strokeWidth={1.4} /></span>
                <div className="public-meter-card__reading"><strong>--</strong><span>°C</span></div>
              </div>
              <div className="public-meter-card__signal"><i /><span>Leitura ainda não conectada ao site</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="public-project" id="projeto" aria-labelledby="public-project-title">
      <div className="public-project__heading"><span className="public-eyebrow">UM PROJETO DE EDUCAÇÃO AMBIENTAL</span><h2 id="public-project-title">Tecnologia para olhar o ambiente de perto.</h2><p>Uma ilha de calor urbana acontece quando certos trechos construídos ficam mais quentes do que áreas próximas. Pavimentos, edificações, cor e composição dos materiais, sombra, vegetação e circulação do ar podem influenciar essa diferença. Por isso, observar a temperatura é um ponto de partida: comparar lugares e horários ajuda a formular perguntas melhores sobre a cidade.</p></div>
      <div className="public-facts">
        <article><span className="public-facts__icon"><MapPin size={21} aria-hidden="true" /></span><span className="public-eyebrow">ONDE NASCE</span><h3>FUNEC Riacho</h3><p>A Fundação de Ensino de Contagem é o espaço educativo onde estudantes desenvolvem o projeto com acompanhamento de professores, unindo pesquisa, construção e comunicação.</p></article>
        <article><span className="public-facts__icon"><Thermometer size={21} aria-hidden="true" /></span><span className="public-eyebrow">O OBJETIVO</span><h3>Medir e compreender</h3><p>Investigar a temperatura ambiente e conversar sobre os fatores que influenciam o calor urbano. Uma leitura isolada não basta para confirmar uma ilha de calor: é preciso considerar o local, o horário e as condições da observação.</p></article>
        <article><span className="public-facts__icon"><Leaf size={21} aria-hidden="true" /></span><span className="public-eyebrow">O PROTÓTIPO HOJE</span><h3>Uma etapa em evolução</h3><p>O protótipo físico inicial mede a temperatura e mostra o resultado na tela do próprio aparelho. A plataforma web tem um modo de demonstração identificado; a integração automática com o aparelho continua em desenvolvimento.</p></article>
      </div>
      <aside className="public-prototype-note"><span className="public-prototype-note__pulse" aria-hidden="true" /><p><strong>Funcionamento atual</strong> A plataforma oferece interface web, autenticação e um modo de demonstração com valores simulados, claramente identificados. Esses valores não vêm do aparelho. As leituras físicas ainda não são enviadas automaticamente ao site.</p></aside>
    </section>

    <section className="public-team" id="equipe" aria-labelledby="public-team-title">
      <div className="public-team__heading"><span className="public-eyebrow">AS PESSOAS POR TRÁS DO ARBORIS.X</span><h2 id="public-team-title">Um projeto feito em equipe.</h2><p>Estudantes e professores da FUNEC Riacho reúnem pesquisa, construção do protótipo e comunicação para aproximar tecnologia e educação ambiental.</p></div>
      <div className="public-team__people">
        <div><h3>Estudantes</h3><p>Amanda Costa Silva, Victor Guimarães, Thaís Vitória, Fábio Fernandes, Victor Salomão, Bruna Ester e Izzy Souza.</p></div>
        <div><h3>Orientação</h3><p>Professor Walter Santos e professora Adriana Aguiar.</p></div>
      </div>
      <Link className="public-action public-action--primary" to="/cadastro">Explorar a plataforma <ArrowRight size={18} aria-hidden="true" /></Link>
      <p className="public-team__access-note">O acesso ao Dashboard exige uma conta e a verificação de segurança.</p>
    </section>

    <PublicFooter />
  </main>;
}

export function LegalPage({ type }) {
  const rootRef = useScreenReady();
  const document = DOCUMENTS[type];
  return <main className="public-page public-document" ref={rootRef}>
    <PublicHeader showHomeButton />
    <article className="public-document__card">
      <header className="public-document__heading">
        <span className="public-eyebrow">ARBORIS.X <span aria-hidden="true">/</span> DOCUMENTO PÚBLICO</span>
        <h1>{document.title}</h1><p className="public-document__intro">{document.subtitle}</p>
      </header>
      <nav className="public-document__toc" aria-label="Seções deste documento">
        <span>NESTA PÁGINA</span>
        {document.sections.map(([heading], index) => <a key={heading} href={`#document-section-${index + 1}`}>{String(index + 1).padStart(2, '0')} {heading}</a>)}
      </nav>
      <div className="public-document__sections">{document.sections.map(([heading, text], index) => <section id={`document-section-${index + 1}`} key={heading}><h2><span>{String(index + 1).padStart(2, '0')}</span>{heading}</h2><p>{text}</p></section>)}</div>
      <aside className="public-document__contact"><span className="public-eyebrow">FALE COM A EQUIPE</span><p>Para dúvidas ou solicitações relacionadas a este documento, escreva para <a href="mailto:arborisx@gmail.com">arborisx@gmail.com</a>.</p></aside>
    </article>
    <PublicFooter />
  </main>;
}
