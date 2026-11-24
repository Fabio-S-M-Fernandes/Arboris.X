import { useEffect, useLayoutEffect, useRef } from 'react';
import { ArrowRight, Building2, Leaf, Sun, Trees } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DemoTrend, StatusIndicator, TemperatureReading } from './DashboardSections';

const HOW_URL = '/dashboard?section=how';

function OverviewMonitoring({ readings = [], dataSource = 'none' }) {
  const reading = readings.at(-1);
  const valid = reading && Number.isFinite(reading.valueCelsius)
    && !Number.isNaN(new Date(reading.measuredAt).getTime());
  const simulated = dataSource === 'demo';

  return (
    <section className="dashboard-overview__monitor dashboard-overview__reveal" aria-labelledby="overview-monitor-title">
      <div className="dashboard-overview__monitor-head">
        <div>
          <span className="dashboard-overview__eyebrow">ESTADO ATUAL / PLATAFORMA</span>
          <h2 id="overview-monitor-title">Monitoramento digital</h2>
        </div>
        <StatusIndicator tone={simulated ? 'amber' : valid ? 'positive' : 'neutral'}>
          {simulated ? 'DADOS SIMULADOS' : valid ? 'Leitura disponível' : 'Conteúdo educativo'}
        </StatusIndicator>
      </div>
      {valid ? (
        <div className="dashboard-overview__monitor-reading">
          <p>{simulated ? 'Exemplo local para demonstração. Nenhum valor veio do aparelho.' : 'Última leitura disponível do aparelho.'}</p>
          <TemperatureReading
            valueCelsius={reading.valueCelsius}
            measuredAt={reading.measuredAt}
          />
          {simulated && <DemoTrend readings={readings} />}
        </div>
      ) : (
        <div className="dashboard-overview__monitor-empty">
          <div className="dashboard-overview__monitor-mark" aria-hidden="true"><span /></div>
          <div>
            <p>Explore os conteúdos sobre temperatura e ambiente urbano. Para conhecer os recursos visuais, ative o modo demonstração com dados simulados nas Configurações.</p>
            <Link to={HOW_URL} className="dashboard-overview__text-link">Entenda como funciona <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default function OverviewSection(props) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const update = () => { if (root) root.dataset.hidden = String(document.visibilityState === 'hidden'); };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced'
      || document.documentElement.dataset.contrast === 'high') return undefined;

    const sections = [...root.querySelectorAll('.dashboard-overview__reveal')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('is-revealed');
        observer.unobserve(target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    sections.forEach((section) => {
      section.classList.add('is-reveal-pending');
      observer.observe(section);
    });
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.classList.remove('is-reveal-pending'));
    };
  }, []);

  return (
    <div className="dashboard-overview" ref={rootRef}>
      <section className="dashboard-overview__hero" aria-labelledby="overview-title">
        <div className="dashboard-overview__hero-copy">
          <span className="dashboard-overview__eyebrow dashboard-overview__hero-eyebrow">ARBORIS.X / INTELIGÊNCIA AMBIENTAL</span>
          <h2 id="overview-title">Entender o ambiente começa por <em>observar.</em></h2>
          <p>O Arboris.X investiga como a temperatura, a vegetação e as superfícies construídas se relacionam com o ambiente urbano. A proposta é transformar uma leitura simples em uma oportunidade de observar, comparar e aprender.</p>
          <div className="dashboard-overview__actions">
            <Link className="dashboard-overview__button dashboard-overview__button--primary" to="/dashboard?section=project">Conheça o projeto <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="dashboard-overview__button dashboard-overview__button--quiet" to={HOW_URL}>Como funciona <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <p className="dashboard-overview__hero-footnote">Um projeto da <strong>FUNEC Riacho</strong> · Fundação de Ensino de Contagem</p>
        </div>
        <div className="dashboard-overview__hero-art" aria-hidden="true">
          <div className="dashboard-overview__hero-forest" />
          <div className="dashboard-overview__hero-sun" />
          <div className="dashboard-overview__hero-mist" />
          <div className="dashboard-overview__hero-canopy" />
          <div className="dashboard-overview__hero-fern" />
          <img className="dashboard-overview__hero-art-mark" src="/imagem1.png" alt="" />
          <span className="dashboard-overview__hero-art-label">A observação começa aqui <span>↗</span></span>
        </div>
      </section>

      <section className="dashboard-overview__study dashboard-overview__reveal" aria-labelledby="overview-study-title">
        <div className="dashboard-overview__section-copy">
          <span className="dashboard-overview__eyebrow">01 / O CONTEXTO</span>
          <h2 id="overview-study-title">Por que observar a temperatura?</h2>
          <p>Uma ilha de calor urbana ocorre quando áreas mais construídas registram temperaturas superiores às de áreas próximas. Pavimentos e edificações podem absorver e reter energia; sombra, vegetação, vento, umidade e horário também influenciam a leitura.</p>
          <p>Temperatura descreve o estado térmico de um lugar; calor é energia transferida quando há diferença de temperatura. Uma única leitura não confirma uma ilha de calor: é preciso comparar locais e momentos e observar as condições de cada medição.</p>
          <Link to="/dashboard?section=project" className="dashboard-overview__text-link">Conheça a proposta <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <figure className="dashboard-overview__study-figure">
          <div className="dashboard-overview__study-scene" aria-hidden="true">
            <div className="dashboard-overview__study-city"><Sun size={31} /><Building2 size={104} strokeWidth={1.1} /></div>
            <div className="dashboard-overview__study-vegetation"><Trees size={119} strokeWidth={1.05} /><Leaf size={27} /></div>
          </div>
          <figcaption>Ilustração conceitual dos elementos do ambiente urbano. Não representa uma medição do projeto.</figcaption>
        </figure>
      </section>

      <section className="dashboard-overview__process dashboard-overview__reveal" aria-labelledby="overview-process-title">
        <div className="dashboard-overview__section-head">
          <div>
            <span className="dashboard-overview__eyebrow">02 / O PROTÓTIPO ATUAL</span>
            <h2 id="overview-process-title">Do ambiente à leitura.</h2>
          </div>
          <p>O protótipo físico permite observar a temperatura no local. Nesta versão, a plataforma digital reúne conteúdos, ferramentas interativas e uma demonstração identificada.</p>
        </div>
        <ol className="dashboard-overview__steps">
          <li><span className="dashboard-overview__step-number">01</span><div><h3>Temperatura ambiente</h3><p>O sensor registra a condição térmica do local onde o aparelho está instalado.</p></div></li>
          <li><span className="dashboard-overview__step-number">02</span><div><h3>Programa e exibição local</h3><p>Em um sistema embarcado, o programa da placa interpreta a leitura e atualiza a tela. O modelo da placa e o código específicos deste protótipo não estão documentados aqui.</p></div></li>
          <li><span className="dashboard-overview__step-number">03</span><div><h3>Plataforma digital <span>DISPONÍVEL</span></h3><p>O Arboris.X oferece conteúdos ambientais, quiz e uma demonstração com valores simulados identificados.</p></div></li>
        </ol>
      </section>

      <OverviewMonitoring {...props} />

      <section className="dashboard-overview__closing dashboard-overview__reveal" aria-labelledby="overview-closing-title">
        <div>
          <span className="dashboard-overview__eyebrow">03 / CONHEÇA O ARBORIS.X</span>
          <h2 id="overview-closing-title">Uma pergunta ambiental, uma plataforma para explorar.</h2>
          <p>Desenvolvido por estudantes com acompanhamento de professores da FUNEC Riacho para a XIII Mostra de Tecnologia, em 2026, o Arboris.X reúne pesquisa, educação ambiental e experiências digitais. A integração com sensores físicos é uma possibilidade de evolução futura em estudo.</p>
          <Link className="dashboard-overview__button dashboard-overview__button--primary" to="/dashboard?section=team">Conheça nossa equipe <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
