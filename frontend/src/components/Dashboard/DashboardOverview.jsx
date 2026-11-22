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
          {simulated ? 'DADOS SIMULADOS' : valid ? 'Leitura disponível' : 'Integração em preparação'}
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
            <p>O protótipo apresenta a temperatura localmente. O envio dessas leituras para a plataforma ainda está em desenvolvimento.</p>
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
          <p>O Arboris.X explora a relação entre temperatura e ambiente urbano, com foco no estudo das ilhas de calor.</p>
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
          <p>Em regiões urbanizadas, pavimentação, construções e menor presença de vegetação podem contribuir para temperaturas mais elevadas. Esse fenômeno ajuda a explicar por que as ilhas de calor merecem atenção.</p>
          <p>O Arboris.X parte dessa pergunta para aproximar a observação ambiental do cotidiano.</p>
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
          <p>O protótipo inicial é um único aparelho físico. Hoje, a leitura acontece nele.</p>
        </div>
        <ol className="dashboard-overview__steps">
          <li><span className="dashboard-overview__step-number">01</span><div><h3>Temperatura ambiente</h3><p>O protótipo realiza a medição da temperatura no local.</p></div></li>
          <li><span className="dashboard-overview__step-number">02</span><div><h3>Exibição local</h3><p>O valor é apresentado na tela do próprio aparelho.</p></div></li>
          <li><span className="dashboard-overview__step-number">03</span><div><h3>Plataforma digital <span>EM DESENVOLVIMENTO</span></h3><p>O Arboris.X está sendo preparado para apresentar leituras na interface web. A integração ainda não foi concluída.</p></div></li>
        </ol>
      </section>

      <OverviewMonitoring {...props} />

      <section className="dashboard-overview__closing dashboard-overview__reveal" aria-labelledby="overview-closing-title">
        <div>
          <span className="dashboard-overview__eyebrow">03 / CONHEÇA O ARBORIS.X</span>
          <h2 id="overview-closing-title">Uma pergunta ambiental, um projeto em construção.</h2>
          <p>Desenvolvido na FUNEC Riacho para a XIII Mostra de Tecnologia da FUNEC Riacho — 2026, o Arboris.X reúne pessoas interessadas em observar a temperatura e compreender melhor o ambiente urbano.</p>
          <Link className="dashboard-overview__button dashboard-overview__button--primary" to="/dashboard?section=team">Conheça nossa equipe <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
