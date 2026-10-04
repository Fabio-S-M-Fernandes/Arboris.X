import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Battery, CheckCircle2, ChevronRight, Droplets, Leaf,
  MapPin, ThermometerSun, Wifi,
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { DashboardHero } from './DashboardHero';
import { AlertsView } from './AlertsView';
import { EnvironmentalTrend } from './EnvironmentalTrend';
import { HeatMapView } from './HeatMapView';
import { ImpactView } from './ImpactView';
import { AdministrationView } from './AdministrationView';
import { OperationsView } from './OperationsView';
import { ReportsView } from './ReportsView';
import { NetworkStatus } from './NetworkStatus';
import { SensorDetailsDrawer } from './SensorDetailsDrawer';
import { SensorFilters } from './SensorFilters';
import { SensorNetworkSummary } from './SensorNetworkSummary';
import { SensorTable } from './SensorTable';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageHeader } from '../layout/PageHeader';
import { Badge, EmptyState, MetricCard, SectionHeader, StatusBadge } from '../ui';
import './Dashboard.css';

const TODAS_AS_REGIOES = 'Todas as regiões';
const ROUTE_SECTIONS = {
  '/dashboard/operacoes': 'Operações',
  '/dashboard/alertas': 'Alertas',
  '/dashboard/impacto': 'Impacto',
  '/dashboard/relatorios': 'Relatórios',
  '/dashboard/administracao': 'Administração',
};
const OPERATIONS_SECTIONS = ['Locais', 'Ambientes', 'Intervenções'];

const numeroLocal = (valor, casas = 0) => Number(valor).toLocaleString('pt-BR', {
  minimumFractionDigits: casas,
  maximumFractionDigits: casas,
});

const formatarTemperatura = (valor) => `${numeroLocal(valor, 1)}°C`;

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
      <PageHeader aside={<strong>{sensors.length} pontos monitorados</strong>} description="Monitore a operação e as condições dos pontos ambientais." eyebrow="Pontos de acompanhamento" title="Sensores ambientais" />
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

export default function DashboardPage({ initialSection = 'Visão geral' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [operationsSection, setOperationsSection] = useState('Locais');
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
    markAlertAsRead,
    sensors,
    summary,
    summaryError,
    summaryLoading,
    trend,
    zones,
  } = useDashboardData({ region: selectedRegion, period, measure });

  const routeSection = ROUTE_SECTIONS[location.pathname];
  const visibleSection = routeSection || (Object.values(ROUTE_SECTIONS).includes(activeSection) ? 'Visão geral' : activeSection);

  const regionOptions = useMemo(() => [
    TODAS_AS_REGIOES,
    ...new Set(sensors.map((sensor) => sensor.regiao)),
  ], [sensors]);
  const activeRegion = regionOptions.includes(selectedRegion) ? selectedRegion : TODAS_AS_REGIOES;
  const regionSensors = useMemo(() => sensors.filter((sensor) => activeRegion === TODAS_AS_REGIOES || sensor.regiao === activeRegion), [activeRegion, sensors]);
  const pageTitle = visibleSection === 'Sensores' ? 'Sensores ambientais' : visibleSection === 'Mapa de calor' ? 'Mapa de calor urbano' : visibleSection === 'Alertas' ? 'Central de alertas' : visibleSection === 'Impacto' ? 'Impacto ambiental' : visibleSection === 'Relatórios' ? 'Relatórios' : visibleSection === 'Operações' ? 'Operações' : visibleSection === 'Administração' ? 'Administração' : 'Painel de controle';

  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') { setNotificationsOpen(false); setMobileMenuOpen(false); setSelectedSensor(null); } };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const changeSection = (section) => {
    if (OPERATIONS_SECTIONS.includes(section)) {
      setOperationsSection(section);
      setActiveSection('Operações');
      if (location.pathname !== '/dashboard/operacoes') navigate('/dashboard/operacoes');
      setMobileMenuOpen(false);
      setNotificationsOpen(false);
      setSelectedSensor(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveSection(section);
    const targetPath = Object.entries(ROUTE_SECTIONS).find(([, routeSectionName]) => routeSectionName === section)?.[0];
    if (targetPath && location.pathname !== targetPath) navigate(targetPath);
    if (!targetPath && routeSection) navigate('/dashboard');
    if (section === 'Sensores') setSensorRegion(activeRegion);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setSelectedSensor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeGlobalRegion = (region) => {
    setSelectedRegion(region);
    if (visibleSection === 'Sensores') setSensorRegion(region);
    if (visibleSection === 'Mapa de calor') setSelectedZone(region === TODAS_AS_REGIOES ? null : zones.find((zone) => zone.regiao === region) || null);
  };

  const viewSensorFromAlert = (sensorId) => {
    setSensorSearch(sensorId);
    changeSection('Sensores');
  };

  const viewRegionFromAlert = (region) => {
    setSelectedRegion(region);
    setSelectedZone(zones.find((zone) => zone.regiao === region) || null);
    changeSection('Mapa de calor');
  };

  const viewAlertsFromOperations = () => changeSection('Alertas');
  const viewMapFromOperations = (locationData) => {
    setSelectedRegion(locationData.region);
    setSelectedZone(zones.find((zone) => zone.regiao === locationData.region) || null);
    changeSection('Mapa de calor');
  };
  const viewSensorsFromOperations = (locationData) => {
    setSensorSearch(locationData.name);
    setSensorRegion(locationData.region);
    changeSection('Sensores');
  };

  return (
    <DashboardLayout
      activeSection={visibleSection}
      alerts={alerts}
      error={visibleSection === 'Sensores' || visibleSection === 'Mapa de calor' || visibleSection === 'Alertas' || visibleSection === 'Impacto' || visibleSection === 'Relatórios' ? summaryError : error}
      mobileMenuOpen={mobileMenuOpen}
      navigationSection={visibleSection === 'Operações' ? operationsSection : visibleSection}
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
      {visibleSection === 'Visão geral' && <>
        <DashboardHero loading={summaryLoading} region={activeRegion} summary={summary} />
        <section className="workspace-metrics" aria-label="Indicadores ambientais">
          <MetricCard loading={summaryLoading} icon={ThermometerSun} title="Temperatura atual" value={summary ? formatarTemperatura(summary.temperaturaAtual) : '—'} detail="Leitura ambiental atual" />
          <MetricCard loading={summaryLoading} icon={Droplets} title="Umidade do ar" value={summary ? `${summary.umidadeAr}%` : '—'} detail="Umidade registrada pela API" tone="blue" />
          <MetricCard loading={summaryLoading} icon={Wifi} title="Sensores operacionais" value={summary ? summary.sensoresAtivos : '—'} detail="Sensores em operação" tone="lime" />
          <MetricCard loading={summaryLoading} icon={Leaf} title="Redução térmica" value={summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : '—'} detail="Impacto estimado na área urbana" />
        </section>
        <div className="workspace-overview-grid">
          <EnvironmentalTrend data={trend} loading={summaryLoading} range={period} setRange={setPeriod} kind={measure} setKind={setMeasure} region={activeRegion} />
          <section className="workspace-panel workspace-attention workspace-reveal"><SectionHeader eyebrow="Acompanhamento" title="Pontos de atenção" action={<div className="workspace-panel-action"><span className="workspace-count">{alerts.filter((alert) => alert.tipo === 'Atenção').length}</span><button type="button" className="workspace-text-action" onClick={() => changeSection('Alertas')}>Ver todos <ArrowRight size={15} /></button></div>} /><div>{alerts.length > 0 ? alerts.map((alert) => <div className="workspace-attention-row" key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <Battery size={16} /> : <CheckCircle2 size={16} />}</span><div><strong>{alert.titulo}</strong><small>{alert.descricao}</small><Badge tone={alert.tipo === 'Atenção' ? 'warning' : 'neutral'} className="workspace-attention-type">{alert.tipo}</Badge></div><time>{alert.horario}</time></div>) : <EmptyState title="Nenhum ponto de atenção." description="A API não retornou alertas para esta área." />}</div><p className="workspace-disclaimer">Avisos sincronizados com o backend.</p></section>
        </div>
        <section className="workspace-panel workspace-recent-sensors workspace-reveal"><SectionHeader eyebrow="Leituras recentes" title="Sensores por região" action={<button type="button" className="workspace-text-action" onClick={() => changeSection('Sensores')}>Ver todos <ArrowRight size={15} /></button>} /><div>{regionSensors.length > 0 ? regionSensors.slice(0, 4).map((sensor) => <SensorRow key={sensor.id} sensor={sensor} onChoose={setSelectedSensor} condensed />) : <EmptyState title="Nenhuma leitura disponível." description="A API não retornou sensores para a área selecionada." />}</div>{selectedSensor && <SensorDetailsDrawer sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}</section>
        <NetworkStatus loading={baseLoading || summaryLoading} sensors={regionSensors} summary={summary} />
        <section className="workspace-panel workspace-impact-teaser workspace-reveal"><SectionHeader eyebrow="Impacto ambiental" title="Visão executiva" action={<button type="button" className="workspace-text-action" onClick={() => changeSection('Impacto')}>Ver impacto <ArrowRight size={15} /></button>} /><div className="workspace-impact-teaser-grid"><div><span>Temperatura</span><strong>{summary ? formatarTemperatura(summary.temperaturaAtual) : 'Dados indisponíveis'}</strong></div><div><span>Redução térmica</span><strong>{summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : 'Dados indisponíveis'}</strong></div><p>Indicadores ambientais disponíveis na fonte atual.</p></div></section>
      </>}
      {visibleSection === 'Sensores' && <SensorsView error={baseError} loading={baseLoading} region={sensorRegion} search={sensorSearch} sensors={sensors} setRegion={setSensorRegion} setSearch={setSensorSearch} setSort={setSensorSort} setStatus={setSensorStatus} sort={sensorSort} status={sensorStatus} selected={selectedSensor} setSelected={setSelectedSensor} />}
      {visibleSection === 'Mapa de calor' && <HeatMapView error={baseError} loading={baseLoading} selectedRegion={activeRegion} selectedZone={selectedZone} setRegion={setSelectedRegion} setSelectedZone={setSelectedZone} updatedAt={summary?.atualizadoEm} zones={zones} />}
      {visibleSection === 'Alertas' && <AlertsView alerts={alerts} error={baseError} loading={baseLoading} onRecognize={markAlertAsRead} onViewRegion={viewRegionFromAlert} onViewSensor={viewSensorFromAlert} sensors={sensors} />}
      {visibleSection === 'Impacto' && <ImpactView error={baseError} loading={summaryLoading} measure={measure} period={period} selectedRegion={activeRegion} setMeasure={setMeasure} setPeriod={setPeriod} setRegion={setSelectedRegion} summary={summary} trend={trend} zones={zones} zonesLoading={baseLoading} />}
      {visibleSection === 'Relatórios' && <ReportsView alerts={alerts} baseError={baseError} baseLoading={baseLoading} measure={measure} onMeasureChange={setMeasure} onPeriodChange={setPeriod} onRegionChange={setSelectedRegion} period={period} regionOptions={regionOptions} selectedRegion={activeRegion} sensors={sensors} summary={summary} summaryError={summaryError} summaryLoading={summaryLoading} trend={trend} zones={zones} />}
      {visibleSection === 'Operações' && <OperationsView activeView={operationsSection} alerts={alerts} baseError={baseError} baseLoading={baseLoading} onSectionChange={setOperationsSection} onViewAlerts={viewAlertsFromOperations} onViewMap={viewMapFromOperations} onViewSensors={viewSensorsFromOperations} selectedRegion={activeRegion} sensors={sensors} summary={summary} summaryError={summaryError} summaryLoading={summaryLoading} zones={zones} />}
      {visibleSection === 'Administração' && <AdministrationView alerts={alerts} baseError={baseError} baseLoading={baseLoading} sensors={sensors} />}
    </DashboardLayout>
  );
}
