import { ArrowRight, ArrowUpRight, Leaf, Mail, MapPin, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { DOCUMENTS } from './ModaisArboris/documentos';
import './PublicPages.css';

const legalLinks = [
  ['/privacidade', 'Política de Privacidade'],
  ['/cookies', 'Política de Cookies'],
  ['/termos', 'Termos de Uso'],
];

function PublicHeader() {
  return <header className="public-header">
    <Link className="public-brand" to="/" aria-label="Arboris.X — página inicial">
      <span className="public-brand__emblem"><img src="/arboris-tree.webp" alt="" /></span>
      <span className="public-brand__wordmark">ARBORIS<span>.X</span></span>
    </Link>
    <nav aria-label="Navegação principal">
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
        <p>Tecnologia e educação ambiental para observar o calor nas cidades.</p>
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
        <p>O Arboris.X é um projeto educacional que une tecnologia e educação ambiental para explorar a temperatura e as ilhas de calor urbanas.</p>
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
      <div className="public-project__heading"><span className="public-eyebrow">UM PROJETO DE EDUCAÇÃO AMBIENTAL</span><h2 id="public-project-title">Tecnologia para olhar o ambiente de perto.</h2><p>Em áreas urbanizadas, pavimentação, construções e menor presença de vegetação podem contribuir para temperaturas mais elevadas. Observar essas relações ajuda a compreender por que as ilhas de calor merecem atenção.</p></div>
      <div className="public-facts">
        <article><span className="public-facts__icon"><MapPin size={21} aria-hidden="true" /></span><span className="public-eyebrow">ONDE NASCE</span><h3>FUNEC Riacho</h3><p>Fundação de Ensino de Contagem. Projeto desenvolvido por estudantes com acompanhamento de professores.</p></article>
        <article><span className="public-facts__icon"><Thermometer size={21} aria-hidden="true" /></span><span className="public-eyebrow">O OBJETIVO</span><h3>Medir e compreender</h3><p>Explorar a temperatura ambiente e discutir como as condições do espaço urbano se relacionam com o calor.</p></article>
        <article><span className="public-facts__icon"><Leaf size={21} aria-hidden="true" /></span><span className="public-eyebrow">O PROTÓTIPO HOJE</span><h3>Uma etapa em evolução</h3><p>O aparelho físico inicial mede a temperatura e mostra o resultado na própria tela. A integração automática com a plataforma web ainda está em desenvolvimento.</p></article>
      </div>
      <aside className="public-prototype-note"><span className="public-prototype-note__pulse" aria-hidden="true" /><p><strong>Funcionamento atual</strong> A plataforma oferece interface web, autenticação e modo de demonstração identificado. As leituras físicas ainda não são enviadas automaticamente ao site.</p></aside>
    </section>

    <PublicFooter />
  </main>;
}

export function LegalPage({ type }) {
  const rootRef = useScreenReady();
  const document = DOCUMENTS[type];
  return <main className="public-page public-document" ref={rootRef}>
    <PublicHeader />
    <article className="public-document__card">
      <Link className="public-document__back" to="/">← Página inicial</Link>
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
