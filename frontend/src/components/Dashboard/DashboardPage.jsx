import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Battery, Bell,
  Check, CheckCircle2, ChevronRight, CloudRain, Droplets, Gauge,
  LayoutDashboard, Leaf, LogOut, Map, MapPin, Menu, Search,
  ThermometerSun, Wifi, X,
} from 'lucide-react';
import { alertas, formatarTemperatura, regioes, sensores, tendencias, zonasCalor } from './dashboardData';
import './Dashboard.css';

const secoes = [
  { nome: 'Visão geral', icon: LayoutDashboard },
  { nome: 'Sensores', icon: Gauge },
  { nome: 'Mapa de calor', icon: Map },
];

const numeroLocal = (valor, casas = 0) => valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

function MetricCard({ icon: Icon, title, value, detail, trend, tone = 'green' }) {
  const TrendIcon = trend?.startsWith('↓') ? ArrowDownRight : ArrowUpRight;
  return (
    <article className={`workspace-metric workspace-metric-${tone} workspace-reveal`}>
      <div className="workspace-metric-top"><span className="workspace-metric-icon"><Icon size={19} aria-hidden="true" /></span><span className="workspace-demo-tag">Exemplo</span></div>
      <p>{title}</p>
      <div className="workspace-metric-value"><strong>{value}</strong>{trend && <span><TrendIcon size={14} />{trend.replace(/^[↓↑]\s*/, '')}</span>}</div>
      <small>{detail}</small>
    </article>
  );
}

function PanelTitle({ label, title, action }) {
  return <div className="workspace-panel-title"><div><p>{label}</p><h2>{title}</h2></div>{action}</div>;
}

function TrendChart({ range, setRange, kind, setKind, region }) {
  const [focusedPoint, setFocusedPoint] = useState(null);
  const data = tendencias[range];
  const source = data[kind];
  const offset = region === 'Setor Leste' ? 1.2 : region === 'Parque Central' ? -1.8 : region === 'Setor Norte' ? -0.6 : region === 'Todas as regiões' ? 0 : 0.3;
  const values = kind === 'temperatura' ? source.map((value) => value + offset) : source;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.18, kind === 'temperatura' ? 1 : 3);
  const points = values.map((value, index) => ({
    x: 42 + index * (676 / (values.length - 1)),
    y: 22 + ((high + padding - value) / (high - low + padding * 2)) * 148,
    value,
    label: data.horarios[index],
  }));
  const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const area = `${line} L ${points.at(-1).x} 188 L ${points[0].x} 188 Z`;
  const selected = points[focusedPoint ?? points.length - 1];
  const unit = kind === 'temperatura' ? '°C' : '%';
  const trackPointer = (event) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - left) / width) * 760;
    const nearest = points.reduce((best, point, index) => Math.abs(point.x - chartX) < Math.abs(points[best].x - chartX) ? index : best, 0);
    setFocusedPoint(nearest);
  };

  return (
    <section className="workspace-panel workspace-chart workspace-reveal">
      <PanelTitle label="Tendência ambiental" title={kind === 'temperatura' ? 'Temperatura por região' : 'Umidade por região'} action={(
        <label className="workspace-field"><span>Período</span><select value={range} onChange={(event) => { setRange(event.target.value); setFocusedPoint(null); }} aria-label="Período do gráfico">
          {Object.entries(tendencias).map(([key, item]) => <option value={key} key={key}>{item.rotulo}</option>)}
        </select></label>
      )} />
      <div className="workspace-chart-toolbar">
        <div className="workspace-switch" role="group" aria-label="Indicador do gráfico">
          <button onClick={() => { setKind('temperatura'); setFocusedPoint(null); }} aria-pressed={kind === 'temperatura'} className={kind === 'temperatura' ? 'is-selected' : ''}><ThermometerSun size={15} />Temperatura</button>
          <button onClick={() => { setKind('umidade'); setFocusedPoint(null); }} aria-pressed={kind === 'umidade'} className={kind === 'umidade' ? 'is-selected' : ''}><Droplets size={15} />Umidade</button>
        </div>
        <p><span />{numeroLocal(selected.value, 1)}{unit}<small>{selected.label}</small></p>
      </div>
      <svg className="workspace-chart-svg" viewBox="0 0 760 218" role="img" tabIndex="0" aria-label={`Tendência demonstrativa de ${kind} em ${data.rotulo}`} onPointerMove={trackPointer} onPointerLeave={() => setFocusedPoint(null)} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const current = focusedPoint ?? points.length - 1;
        setFocusedPoint(Math.max(0, Math.min(points.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
      }}>
        <defs>
          <linearGradient id="workspace-chart-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".2" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient>
          <linearGradient id="workspace-chart-line"><stop stopColor="#6ee7b7" /><stop offset="100%" stopColor="#a3e635" /></linearGradient>
        </defs>
        {[36, 72, 108, 144, 180].map((y) => <line key={y} x1="42" x2="718" y1={y} y2={y} className="workspace-chart-gridline" />)}
        <path d={area} fill="url(#workspace-chart-area)" />
        <path d={line} fill="none" stroke="url(#workspace-chart-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <g key={point.label} className="workspace-chart-point" onPointerEnter={() => setFocusedPoint(index)}><circle cx={point.x} cy={point.y} r={index === (focusedPoint ?? points.length - 1) ? 6 : 3.5} /><text x={point.x} y="208" textAnchor="middle">{point.label}</text></g>)}
      </svg>
      <div className="workspace-chart-caption"><span>Valores de exemplo</span><span>{region}</span></div>
    </section>
  );
}

function SensorRow({ sensor, onChoose, condensed = false }) {
  return (
    <button className={`workspace-sensor-row ${condensed ? 'is-condensed' : ''}`} onClick={() => onChoose(sensor)}>
      <span className="workspace-sensor-place"><strong>{sensor.id}</strong><small><MapPin size={12} />{sensor.local}</small></span>
      {!condensed && <span className="workspace-sensor-region">{sensor.regiao}</span>}
      <span><strong>{formatarTemperatura(sensor.temperatura)}</strong><small>Temperatura</small></span>
      <span><strong>{sensor.umidade}%</strong><small>Umidade</small></span>
      <span className={`workspace-status ${sensor.estado === 'Atenção' ? 'is-warning' : ''}`}><i />{sensor.estado}</span>
      {!condensed && <small className="workspace-sensor-time">{sensor.atualizacao}</small>}
      <ChevronRight size={15} className="workspace-row-chevron" aria-hidden="true" />
    </button>
  );
}

function SensorDetails({ sensor, onClose }) {
  if (!sensor) return null;
  return (
    <aside className="workspace-sensor-detail" aria-label={`Detalhes de ${sensor.id}`}>
      <div className="workspace-detail-heading"><div><p>Detalhes do ponto</p><h2>{sensor.id}</h2></div><button className="workspace-icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={18} /></button></div>
      <p className="workspace-detail-location"><MapPin size={15} />{sensor.local}, {sensor.regiao}</p>
      <dl>{[['Temperatura', formatarTemperatura(sensor.temperatura)], ['Umidade do ar', `${sensor.umidade}%`], ['Estado', sensor.estado], ['Bateria', `${sensor.bateria}%`], ['Última leitura', sensor.atualizacao]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="workspace-battery-track"><span style={{ width: `${sensor.bateria}%` }} /></div>
      <small>Leituras demonstrativas para visualização do painel.</small>
    </aside>
  );
}

function SensorsView({ sensors, search, setSearch, status, setStatus, selected, setSelected }) {
  const visibleSensors = sensors.filter((sensor) => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const matchesQuery = !query || `${sensor.id} ${sensor.local} ${sensor.regiao}`.toLocaleLowerCase('pt-BR').includes(query);
    return matchesQuery && (status === 'Todos' || sensor.estado === status);
  });
  return (
    <section className="workspace-view">
      <div className="workspace-view-heading workspace-reveal"><div><p>Pontos de acompanhamento</p><h2>Sensores ambientais</h2><span>Encontre uma leitura por local, região ou código.</span></div><strong>{visibleSensors.length} pontos demonstrativos</strong></div>
      <div className={`workspace-sensor-layout ${selected ? 'has-selection' : ''}`}>
        <section className="workspace-panel workspace-sensor-list workspace-reveal">
          <div className="workspace-list-tools"><label className="workspace-search"><Search size={17} /><span className="sr-only">Buscar sensores</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por local, região ou código" /></label><label className="workspace-field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar pelo estado"><option>Todos</option><option>Estável</option><option>Atenção</option></select></label></div>
          <div className="workspace-sensor-list-labels" aria-hidden="true"><span>Local e código</span><span>Região</span><span>Temperatura</span><span>Umidade</span><span>Estado</span><span>Atualização</span></div>
          <div className="workspace-sensor-list" aria-live="polite">{visibleSensors.map((sensor) => <SensorRow key={sensor.id} sensor={sensor} onChoose={setSelected} />)}{visibleSensors.length === 0 && <p className="workspace-empty">Nenhum ponto encontrado. Tente outro termo ou ajuste o filtro.</p>}</div>
        </section>
        <SensorDetails sensor={selected} onClose={() => setSelected(null)} />
      </div>
    </section>
  );
}

function HeatMapView({ selectedZone, setSelectedZone, setRegion }) {
  return (
    <section className="workspace-view">
      <div className="workspace-view-heading workspace-reveal"><div><p>Distribuição por região</p><h2>Mapa de calor urbano</h2><span>Compare a temperatura média dos pontos de cada área.</span></div><strong>Representação demonstrativa</strong></div>
      <div className="workspace-heat-layout">
        <section className="workspace-panel workspace-heat-panel workspace-reveal"><PanelTitle label="Temperatura ambiente" title="Visão por região" />
          <div className="workspace-heat-grid">{zonasCalor.map((zone) => <button key={zone.regiao} className={`workspace-heat-zone ${selectedZone?.regiao === zone.regiao ? 'is-selected' : ''}`} style={{ '--heat-strength': zone.nivel / 100 }} onClick={() => { setSelectedZone(zone); setRegion(zone.regiao); }} aria-pressed={selectedZone?.regiao === zone.regiao}><span><i />{zone.regiao}</span><strong>{formatarTemperatura(zone.temperatura)}</strong><small>{zone.sensores} pontos acompanhados</small><i className="workspace-heat-meter"><b style={{ width: `${zone.nivel}%` }} /></i></button>)}</div>
          <div className="workspace-heat-legend"><span><i className="is-cool" />Mais ameno</span><span><i className="is-warm" />Intermediário</span><span><i className="is-hot" />Mais quente</span></div>
        </section>
        <aside className="workspace-heat-summary workspace-reveal"><p>Resumo da área</p><MapPin size={20} /><h2>{selectedZone?.regiao ?? 'Escolha uma região'}</h2>{selectedZone ? <><strong>{formatarTemperatura(selectedZone.temperatura)}</strong><span>{selectedZone.sensores} pontos acompanhados</span><small>{selectedZone.tendencia}</small></> : <span>Selecione uma área para consultar o resumo.</span>}<small>Os valores são demonstrativos.</small></aside>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  const [activeSection, setActiveSection] = useState('Visão geral');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('Todas as regiões');
  const [period, setPeriod] = useState('24h');
  const [measure, setMeasure] = useState('temperatura');
  const [sensorSearch, setSensorSearch] = useState('');
  const [sensorStatus, setSensorStatus] = useState('Todos');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readAlerts, setReadAlerts] = useState([]);

  const regionSensors = useMemo(() => sensores.filter((sensor) => selectedRegion === 'Todas as regiões' || sensor.regiao === selectedRegion), [selectedRegion]);
  const averageTemperature = regionSensors.reduce((sum, sensor) => sum + sensor.temperatura, 0) / Math.max(regionSensors.length, 1);
  const averageHumidity = Math.round(regionSensors.reduce((sum, sensor) => sum + sensor.umidade, 0) / Math.max(regionSensors.length, 1));
  const activeCount = regionSensors.filter((sensor) => sensor.estado === 'Estável').length;
  const unreadCount = alertas.filter((alert) => alert.naoLido && !readAlerts.includes(alert.id)).length;
  const pageTitle = activeSection === 'Sensores' ? 'Sensores ambientais' : activeSection === 'Mapa de calor' ? 'Mapa de calor urbano' : 'Painel de controle';

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo('.workspace-reveal', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out', clearProps: 'transform', scrollTrigger: { trigger: '.workspace-content', start: 'top 96%', once: true } });
    }, dashboardRef);
    return () => context.revert();
  }, [activeSection]);

  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') { setNotificationsOpen(false); setMobileMenuOpen(false); setSelectedSensor(null); } };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const changeSection = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setSelectedSensor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main ref={dashboardRef} className="dashboard-shell workspace-shell">
      <div className="dashboard-grid" aria-hidden="true" /><div className="dashboard-orb dashboard-orb-one" aria-hidden="true" /><div className="dashboard-orb dashboard-orb-two" aria-hidden="true" />
      <aside className={`workspace-sidebar ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Menu principal">
        <a href="/dashboard" className="workspace-brand" onClick={(event) => { event.preventDefault(); changeSection('Visão geral'); }}><span className="workspace-brand-icon"><Leaf size={20} /></span><span><strong>ARBORIS<span>.X</span></strong><small>Monitoramento ambiental</small></span></a>
        <p className="workspace-sidebar-label">Painel</p>
        <nav className="workspace-nav" aria-label="Seções do painel">{secoes.map(({ nome, icon: Icon }) => <button key={nome} className={`workspace-nav-item ${activeSection === nome ? 'is-active' : ''}`} onClick={() => changeSection(nome)} aria-current={activeSection === nome ? 'page' : undefined}><Icon size={18} /><span>{nome}</span>{activeSection === nome && <ChevronRight size={15} />}</button>)}</nav>
        <div className="workspace-sidebar-bottom"><div className="workspace-status"><i /><span><strong>Monitoramento ativo</strong><small>Dados demonstrativos</small></span></div><button className="workspace-signout" onClick={() => navigate('/')}><LogOut size={17} />Voltar ao acesso</button></div>
      </aside>
      {mobileMenuOpen && <button className="workspace-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" />}

      <section className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header-title"><button className="workspace-icon-button workspace-mobile-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button><div><p>ARBORIS.X <span>/</span> {activeSection}</p><h1>{pageTitle}</h1></div></div>
          <div className="workspace-header-actions">
            <label className="workspace-field workspace-region"><MapPin size={15} /><span className="sr-only">Região</span><select aria-label="Filtrar por região" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>{regioes.map((region) => <option key={region}>{region}</option>)}</select></label>
            <span className="workspace-demo-badge"><i />Painel demonstrativo</span>
            <div className="workspace-notification-wrap"><button className="workspace-icon-button" aria-label={`Avisos${unreadCount ? `, ${unreadCount} não lidos` : ''}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{unreadCount > 0 && <span className="workspace-notification-count">{unreadCount}</span>}</button>
              {notificationsOpen && <section className="workspace-notification-panel" aria-label="Avisos do painel"><div className="workspace-notification-title"><div><p>Acompanhamento</p><h2>Avisos</h2></div><button className="workspace-icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Fechar avisos"><X size={17} /></button></div>{unreadCount > 0 && <button className="workspace-mark-read" onClick={() => setReadAlerts(alertas.map((alert) => alert.id))}><Check size={14} />Marcar todos como lidos</button>}<div className="workspace-alert-list">{alertas.map((alert) => <article className={`workspace-alert ${readAlerts.includes(alert.id) ? 'is-read' : ''}`} key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}</span><div><strong>{alert.titulo}</strong><p>{alert.descricao}</p><small>{alert.horario}</small></div></article>)}</div></section>}
            </div>
            <span className="workspace-avatar" aria-label="Perfil da comunidade">AX</span>
          </div>
        </header>

        <div className="workspace-content">
          {activeSection === 'Visão geral' && <>
            <div className="workspace-welcome workspace-reveal"><div><p>Resumo ambiental</p><h2>Olá, seja bem-vindo!</h2><span>Acompanhe as condições das áreas monitoradas.</span></div><small><Activity size={15} />Valores de exemplo para demonstração</small></div>
            <section className="workspace-metrics" aria-label="Indicadores ambientais">
              <MetricCard icon={ThermometerSun} title="Temperatura média" value={formatarTemperatura(averageTemperature)} detail={`${regionSensors.length} pontos demonstrativos`} trend="↓ 3,2%" />
              <MetricCard icon={Droplets} title="Umidade do ar" value={`${averageHumidity}%`} detail="Condições favoráveis à vegetação" trend="↑ 2,4%" tone="blue" />
              <MetricCard icon={Wifi} title="Pontos funcionando" value={`${activeCount} / ${regionSensors.length}`} detail={`${regionSensors.length - activeCount} precisam de atenção`} tone="lime" />
              <MetricCard icon={Leaf} title="Redução estimada do calor" value="18,6%" detail="Impacto estimado na área urbana" trend="↑ 4,2%" />
            </section>
            <div className="workspace-overview-grid">
              <TrendChart range={period} setRange={setPeriod} kind={measure} setKind={setMeasure} region={selectedRegion} />
              <section className="workspace-panel workspace-attention workspace-reveal"><PanelTitle label="Acompanhamento" title="Pontos de atenção" action={<span className="workspace-count">{alertas.filter((alert) => alert.tipo === 'Atenção').length}</span>} /><div>{alertas.map((alert) => <div className="workspace-attention-row" key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <Battery size={16} /> : <CheckCircle2 size={16} />}</span><div><strong>{alert.titulo}</strong><small>{alert.descricao}</small></div><time>{alert.horario}</time></div>)}</div><p className="workspace-disclaimer">Avisos e leituras de exemplo; não representam medições ao vivo.</p></section>
            </div>
            <section className="workspace-panel workspace-recent-sensors workspace-reveal"><PanelTitle label="Leituras recentes" title="Sensores por região" action={<button className="workspace-text-action" onClick={() => changeSection('Sensores')}>Ver todos <ArrowRight size={15} /></button>} /><div>{regionSensors.slice(0, 4).map((sensor) => <SensorRow key={sensor.id} sensor={sensor} onChoose={setSelectedSensor} condensed />)}</div>{selectedSensor && <SensorDetails sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}</section>
            <section className="workspace-summary workspace-reveal"><div><CloudRain /><span><small>Precipitação prevista</small><strong>12% nas próximas 6 h</strong></span></div><div><Leaf /><span><small>Impacto Arboris</small><strong>18,4 t de CO₂ reduzidas</strong></span></div><div><CheckCircle2 /><span><small>Pontos em funcionamento</small><strong>{numeroLocal((activeCount / Math.max(regionSensors.length, 1)) * 100)}% nesta seleção</strong></span></div></section>
          </>}
          {activeSection === 'Sensores' && <SensorsView sensors={regionSensors} search={sensorSearch} setSearch={setSensorSearch} status={sensorStatus} setStatus={setSensorStatus} selected={selectedSensor} setSelected={setSelectedSensor} />}
          {activeSection === 'Mapa de calor' && <HeatMapView selectedZone={selectedZone} setSelectedZone={setSelectedZone} setRegion={setSelectedRegion} />}
          <footer className="workspace-footer"><span>Arboris.X · Cuidado ambiental compartilhado</span><span>Informações demonstrativas</span></footer>
        </div>
      </section>
    </main>
  );
}