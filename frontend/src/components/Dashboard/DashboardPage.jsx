import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Battery, CheckCircle2, ChevronRight, Droplets, Leaf,
  MapPin, ThermometerSun, Wifi,
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { DashboardHero } from './DashboardHero';
import { HeatMapView } from './HeatMapView';
import { NetworkStatus } from './NetworkStatus';
import { SensorDetailsDrawer } from './SensorDetailsDrawer';
import { SensorFilters } from './SensorFilters';
import { SensorNetworkSummary } from './SensorNetworkSummary';
import { SensorTable } from './SensorTable';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Badge, EmptyState, MetricCard, SectionHeader, StatusBadge } from '../ui';
import './Dashboard.css';

const TODAS_AS_REGIOES = 'Todas as regiões';
const PERIODOS = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const numeroLocal = (valor, casas = 0) => Number(valor).toLocaleString('pt-BR', {
  minimumFractionDigits: casas,
  maximumFractionDigits: casas,
});

const formatarTemperatura = (valor) => `${numeroLocal(valor, 1)}°C`;

function TrendChart({ data, loading, range, setRange, kind, setKind, region }) {
  const [focusedPoint, setFocusedPoint] = useState(null);
  const values = data?.valores || [];

  const chartContent = (() => {
    if (loading) return <p className="workspace-empty">Carregando tendência...</p>;
    if (values.length < 2) return <EmptyState title="Nenhuma tendência disponível." />;

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
    const lastPoint = points[points.length - 1];
    const area = `${line} L ${lastPoint.x} 188 L ${points[0].x} 188 Z`;
    const selected = points[focusedPoint ?? points.length - 1];
    const unit = kind === 'temperatura' ? '°C' : '%';
    const trackPointer = (event) => {
      const { left, width } = event.currentTarget.getBoundingClientRect();
      const chartX = ((event.clientX - left) / width) * 760;
      const nearest = points.reduce((best, point, index) => Math.abs(point.x - chartX) < Math.abs(points[best].x - chartX) ? index : best, 0);
      setFocusedPoint(nearest);
    };

    return (
      <>
        <div className="workspace-chart-toolbar">
          <div className="workspace-switch" role="group" aria-label="Indicador do gráfico">
            <button onClick={() => { setKind('temperatura'); setFocusedPoint(null); }} aria-pressed={kind === 'temperatura'} className={kind === 'temperatura' ? 'is-selected' : ''}><ThermometerSun size={15} />Temperatura</button>
            <button onClick={() => { setKind('umidade'); setFocusedPoint(null); }} aria-pressed={kind === 'umidade'} className={kind === 'umidade' ? 'is-selected' : ''}><Droplets size={15} />Umidade</button>
          </div>
          <p><span />{numeroLocal(selected.value, 1)}{unit}<small>{selected.label}</small></p>
        </div>
        <svg className="workspace-chart-svg" viewBox="0 0 760 218" role="img" tabIndex="0" aria-label={`Tendência de ${kind} em ${data.rotulo}`} onPointerMove={trackPointer} onPointerLeave={() => setFocusedPoint(null)} onKeyDown={(event) => {
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
        <div className="workspace-chart-caption"><span>Dados do backend</span><span>{region}</span></div>
      </>
    );
  })();

  return (
    <section className="workspace-panel workspace-chart workspace-reveal">
      <SectionHeader eyebrow="Tendência ambiental" title={kind === 'temperatura' ? 'Temperatura por região' : 'Umidade por região'} action={(
        <label className="workspace-field"><span>Período</span><select value={range} onChange={(event) => { setRange(event.target.value); setFocusedPoint(null); }} aria-label="Período do gráfico">
          {PERIODOS.map((period) => <option value={period.value} key={period.value}>{period.label}</option>)}
        </select></label>
      )} />
      {chartContent}
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
      <StatusBadge status={sensor.estado} />
      {!condensed && <small className="workspace-sensor-time">{sensor.atualizacao}</small>}
      <ChevronRight size={15} className="workspace-row-chevron" aria-hidden="true" />
    </button>
  );
}

function parseUpdateMinutes(value) {
  const match = String(value || '').match(/(\d+)\s*min/iu);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function SensorsView({ sensors, loading, error, search, setSearch, region, setRegion, status, setStatus, sort, setSort, selected, setSelected }) {
  const regions = useMemo(() => [TODAS_AS_REGIOES, ...new Set(sensors.map((sensor) => sensor.regiao))], [sensors]);
  const visibleSensors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const filteredSensors = sensors.filter((sensor) => {
      const searchable = `${sensor.id} ${sensor.local} ${sensor.regiao}`.toLocaleLowerCase('pt-BR');
      return (!query || searchable.includes(query))
        && (region === TODAS_AS_REGIOES || sensor.regiao === region)
        && (status === 'Todos' || sensor.estado === status);
    });

    return [...filteredSensors].sort((first, second) => {
      if (sort === 'temperatura-desc') return Number(second.temperatura) - Number(first.temperatura);
      if (sort === 'temperatura-asc') return Number(first.temperatura) - Number(second.temperatura);
      if (sort === 'umidade-desc') return Number(second.umidade) - Number(first.umidade);
      if (sort === 'umidade-asc') return Number(first.umidade) - Number(second.umidade);
      return parseUpdateMinutes(first.atualizacao) - parseUpdateMinutes(second.atualizacao);
    });
  }, [region, search, sensors, sort, status]);

  const clearFilters = () => {
    setSearch('');
    setRegion(TODAS_AS_REGIOES);
    setStatus('Todos');
    setSort('recentes');
  };

  return (
    <section className="workspace-view workspace-sensors-view">
      <div className="workspace-view-heading workspace-reveal"><div><p>Pontos de acompanhamento</p><h2>Sensores ambientais</h2><span>Monitore a operação e as condições dos pontos ambientais.</span></div><strong>{sensors.length} pontos monitorados</strong></div>
      <SensorNetworkSummary loading={loading} sensors={sensors} />
      <SensorFilters onClear={clearFilters} region={region} regions={regions} search={search} setRegion={setRegion} setSearch={setSearch} setSort={setSort} setStatus={setStatus} sort={sort} status={status} />
      <section className="workspace-panel workspace-sensor-table-panel workspace-reveal" aria-live="polite">
        <div className="workspace-table-heading"><div><p>Lista operacional</p><h3>{visibleSensors.length} {visibleSensors.length === 1 ? 'sensor encontrado' : 'sensores encontrados'}</h3></div><span>Selecione uma linha para abrir os detalhes.</span></div>
        <SensorTable error={error} loading={loading} onChoose={setSelected} sensors={visibleSensors} />
      </section>
      <SensorDetailsDrawer sensor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('Visão geral');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(TODAS_AS_REGIOES);
  const [period, setPeriod] = useState('24h');
  const [measure, setMeasure] = useState('temperatura');
  const [sensorSearch, setSensorSearch] = useState('');
  const [sensorRegion, setSensorRegion] = useState(TODAS_AS_REGIOES);
  const [sensorStatus, setSensorStatus] = useState('Todos');
  const [sensorSort, setSensorSort] = useState('recentes');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const {
    alerts,
    baseError,
    baseLoading,
    error,
    markAllAlertsAsRead,
    sensors,
    summary,
    summaryError,
    summaryLoading,
    trend,
    zones,
  } = useDashboardData({ region: selectedRegion, period, measure });

  const regionOptions = useMemo(() => [
    TODAS_AS_REGIOES,
    ...new Set(sensors.map((sensor) => sensor.regiao)),
  ], [sensors]);
  const activeRegion = regionOptions.includes(selectedRegion) ? selectedRegion : TODAS_AS_REGIOES;
  const regionSensors = useMemo(() => sensors.filter((sensor) => activeRegion === TODAS_AS_REGIOES || sensor.regiao === activeRegion), [activeRegion, sensors]);
  const pageTitle = activeSection === 'Sensores' ? 'Sensores ambientais' : activeSection === 'Mapa de calor' ? 'Mapa de calor urbano' : 'Painel de controle';

  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') { setNotificationsOpen(false); setMobileMenuOpen(false); setSelectedSensor(null); } };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const changeSection = (section) => {
    setActiveSection(section);
    if (section === 'Sensores') setSensorRegion(activeRegion);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setSelectedSensor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeGlobalRegion = (region) => {
    setSelectedRegion(region);
    if (activeSection === 'Sensores') setSensorRegion(region);
    if (activeSection === 'Mapa de calor') setSelectedZone(region === TODAS_AS_REGIOES ? null : zones.find((zone) => zone.regiao === region) || null);
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      alerts={alerts}
      error={activeSection === 'Sensores' || activeSection === 'Mapa de calor' ? summaryError : error}
      mobileMenuOpen={mobileMenuOpen}
      notificationsOpen={notificationsOpen}
      onCloseMobileMenu={() => setMobileMenuOpen(false)}
      onCloseNotifications={() => setNotificationsOpen(false)}
      onMarkAllRead={markAllAlertsAsRead}
      onLogout={() => navigate('/')}
      onOpenMobileMenu={() => setMobileMenuOpen(true)}
      onSectionChange={changeSection}
      onToggleNotifications={() => setNotificationsOpen((current) => !current)}
      pageTitle={pageTitle}
      regionOptions={regionOptions}
      selectedRegion={activeRegion}
      setSelectedRegion={changeGlobalRegion}
    >
      {activeSection === 'Visão geral' && <>
        <DashboardHero loading={summaryLoading} region={activeRegion} summary={summary} />
        <section className="workspace-metrics" aria-label="Indicadores ambientais">
          <MetricCard loading={summaryLoading} icon={ThermometerSun} title="Temperatura atual" value={summary ? formatarTemperatura(summary.temperaturaAtual) : '—'} detail="Leitura ambiental atual" />
          <MetricCard loading={summaryLoading} icon={Droplets} title="Umidade do ar" value={summary ? `${summary.umidadeAr}%` : '—'} detail="Umidade registrada pela API" tone="blue" />
          <MetricCard loading={summaryLoading} icon={Wifi} title="Sensores operacionais" value={summary ? summary.sensoresAtivos : '—'} detail="Sensores em operação" tone="lime" />
          <MetricCard loading={summaryLoading} icon={Leaf} title="Redução térmica" value={summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : '—'} detail="Impacto estimado na área urbana" />
        </section>
        <div className="workspace-overview-grid">
          <TrendChart data={trend} loading={summaryLoading} range={period} setRange={setPeriod} kind={measure} setKind={setMeasure} region={activeRegion} />
          <section className="workspace-panel workspace-attention workspace-reveal"><SectionHeader eyebrow="Acompanhamento" title="Pontos de atenção" action={<div className="workspace-panel-action"><span className="workspace-count">{alerts.filter((alert) => alert.tipo === 'Atenção').length}</span><button type="button" className="workspace-text-action" disabled title="Central de alertas disponível em uma próxima fase">Ver todos <ArrowRight size={15} /></button></div>} /><div>{alerts.length > 0 ? alerts.map((alert) => <div className="workspace-attention-row" key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <Battery size={16} /> : <CheckCircle2 size={16} />}</span><div><strong>{alert.titulo}</strong><small>{alert.descricao}</small><Badge tone={alert.tipo === 'Atenção' ? 'warning' : 'neutral'} className="workspace-attention-type">{alert.tipo}</Badge></div><time>{alert.horario}</time></div>) : <EmptyState title="Nenhum ponto de atenção." description="A API não retornou alertas para esta área." />}</div><p className="workspace-disclaimer">Avisos sincronizados com o backend.</p></section>
        </div>
        <section className="workspace-panel workspace-recent-sensors workspace-reveal"><SectionHeader eyebrow="Leituras recentes" title="Sensores por região" action={<button type="button" className="workspace-text-action" onClick={() => changeSection('Sensores')}>Ver todos <ArrowRight size={15} /></button>} /><div>{regionSensors.length > 0 ? regionSensors.slice(0, 4).map((sensor) => <SensorRow key={sensor.id} sensor={sensor} onChoose={setSelectedSensor} condensed />) : <EmptyState title="Nenhuma leitura disponível." description="A API não retornou sensores para a área selecionada." />}</div>{selectedSensor && <SensorDetailsDrawer sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}</section>
        <NetworkStatus loading={baseLoading || summaryLoading} sensors={regionSensors} summary={summary} />
      </>}
      {activeSection === 'Sensores' && <SensorsView error={baseError} loading={baseLoading} region={sensorRegion} search={sensorSearch} sensors={sensors} setRegion={setSensorRegion} setSearch={setSensorSearch} setSort={setSensorSort} setStatus={setSensorStatus} sort={sensorSort} status={sensorStatus} selected={selectedSensor} setSelected={setSelectedSensor} />}
      {activeSection === 'Mapa de calor' && <HeatMapView error={baseError} loading={baseLoading} selectedRegion={activeRegion} selectedZone={selectedZone} setRegion={setSelectedRegion} setSelectedZone={setSelectedZone} updatedAt={summary?.atualizadoEm} zones={zones} />}
    </DashboardLayout>
  );
}
