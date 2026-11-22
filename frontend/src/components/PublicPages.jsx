import { ArrowDown, ArrowRight, Leaf, MapPin, Thermometer, Trees } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { DOCUMENTS } from './ModaisArboris/documentos';
import './PublicPages.css';

const legalLinks = [
  ['/privacidade', 'Política de Privacidade'],
  ['/termos', 'Termos de Uso'],
  ['/cookies', 'Política de Cookies'],
];

function PublicHeader() {
  return <header className="public-header">
    <Link className="public-brand" to="/" aria-label="Arboris.X — página inicial">
      <img src="/arboris-tree.webp" alt="" /><span>ARBORIS<span>.X</span></span>
    </Link>
    <nav aria-label="Navegação principal">
      <a href="/#projeto">O projeto</a>
      <Link to="/privacidade">Privacidade</Link>
      <Link className="public-header__login" to="/login">Entrar <ArrowRight size={15} aria-hidden="true" /></Link>
    </nav>
  </header>;
}

function PublicFooter() {
  return <footer className="public-footer">
    <span>ARBORIS<span>.X</span> · FUNEC Riacho</span>
    <nav aria-label="Documentos públicos">{legalLinks.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</nav>
    <a href="mailto:arborisx@gmail.com">arborisx@gmail.com</a>
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
        <div className="public-hero__actions"><Link className="public-button" to="/login">Entrar <ArrowRight size={17} aria-hidden="true" /></Link><Link className="public-button public-button--quiet" to="/cadastro">Criar conta</Link></div>
        <a className="public-scroll" href="#projeto"><span>Conheça o projeto</span><ArrowDown size={15} aria-hidden="true" /></a>
      </div>
      <div className="public-hero__art" aria-hidden="true"><div className="public-orbit public-orbit--one" /><div className="public-orbit public-orbit--two" /><div className="public-hero__core"><img src="/arboris-tree.webp" alt="" /><span>ARBORIS.X</span></div><span className="public-art-label public-art-label--top"><Thermometer size={17} /> TEMPERATURA</span><span className="public-art-label public-art-label--bottom"><Trees size={17} /> AMBIENTE URBANO</span></div>
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

    <section className="public-cta" aria-label="Acesse a plataforma"><div><span className="public-eyebrow">ARBORIS.X · FUNEC RIACHO</span><h2>Continue acompanhando o projeto.</h2></div><div><Link className="public-button" to="/login">Entrar <ArrowRight size={17} aria-hidden="true" /></Link><Link className="public-button public-button--quiet" to="/cadastro">Criar conta</Link></div></section>
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
      <span className="public-eyebrow">ARBORIS.X · DOCUMENTO PÚBLICO</span>
      <h1>{document.title}</h1><p className="public-document__intro">{document.subtitle}</p>
      <div className="public-document__sections">{document.sections.map(([heading, text], index) => <section key={heading}><h2><span>{String(index + 1).padStart(2, '0')}</span>{heading}</h2><p>{text}</p></section>)}</div>
      <p className="public-document__contact">Dúvidas ou solicitações? <a href="mailto:arborisx@gmail.com">arborisx@gmail.com</a></p>
    </article>
    <PublicFooter />
  </main>;
}
