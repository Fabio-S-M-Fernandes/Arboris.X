import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Battery, CheckCircle2, Droplets, Leaf, ThermometerSun, Wifi } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { getDashboardRoute, getDashboardRouteByNavLabel } from '../../routes/dashboardRoutes';
import { DashboardHero } from './DashboardHero';
import { AlertsView } from './AlertsView';
import { EnvironmentalTrend } from './EnvironmentalTrend';
import { HeatMapView } from './HeatMapView';
import { ImpactView } from './ImpactView';
import { AdministrationView } from './AdministrationView';
import { OperationsIndexView } from './OperationsIndexView';
import { OperationsView } from './OperationsView';
import { ReportsView } from './ReportsView';
import { NetworkStatus } from './NetworkStatus';
import { SensorDetailsDrawer } from './SensorDetailsDrawer';
import { SensorRow, SensorsView } from './SensorsView';
import { TODAS_AS_REGIOES } from './sensorConstants';
import { DashboardLayout } from '../layout/DashboardLayout';
import { signOutAndClear } from '../../lib/auth';
import { Badge, EmptyState, MetricCard, SectionHeader } from '../ui';
import './Dashboard.css';

const numeroLocal = (valor, casas = 0) => Number(valor).toLocaleString('pt-BR', {
  minimumFractionDigits: casas,
  maximumFractionDigits: casas,
});

const formatarTemperatura = (valor) => `${numeroLocal(valor, 1)}°C`;

export default function DashboardPage({ initialSection = 'Visão geral' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(TODAS_AS_REGIOES);
  const [period, setPeriod] = useState('24h');
  const [measure, setMeasure] = useState('temperatura');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sensorSearch, setSensorSearch] = useState('');
  const [sensorRegion, setSensorRegion] = useState(TODAS_AS_REGIOES);
  const [sensorStatus, setSensorStatus] = useState('Todos');
  const [sensorSort, setSensorSort] = useState('recentes');

  const fallbackRoute = initialSection === 'Operações'
    ? getDashboardRoute('/dashboard/operacoes')
    : getDashboardRouteByNavLabel(initialSection) || getDashboardRoute('/dashboard');
  const currentRoute = getDashboardRoute(location.pathname) || fallbackRoute;
  const isOverview = currentRoute.id === 'overview';
  const isOperations = currentRoute.group === 'Operações';

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

  const regionOptions = useMemo(() => [
    TODAS_AS_REGIOES,
    ...new Set(sensors.map((sensor) => sensor.regiao)),
  ], [sensors]);
  const activeRegion = regionOptions.includes(selectedRegion) ? selectedRegion : TODAS_AS_REGIOES;
  const regionSensors = useMemo(() => sensors.filter((sensor) => activeRegion === TODAS_AS_REGIOES || sensor.regiao === activeRegion), [activeRegion, sensors]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
        setSelectedSensor(null);
        setSelectedZone(null);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const navigateTo = (path) => {
    if (location.pathname !== path) navigate(path);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setSelectedSensor(null);
  };

  const changeSection = (section) => {
    const targetRoute = section === 'Operações'
      ? getDashboardRoute('/dashboard/operacoes')
      : getDashboardRouteByNavLabel(section);
    if (!targetRoute) return;
    if (section === 'Sensores') setSensorRegion(activeRegion);
    navigateTo(targetRoute.path);
  };

  const changeGlobalRegion = (region) => {
    setSelectedRegion(region);
    if (currentRoute.id === 'sensors') setSensorRegion(region);
    if (currentRoute.id === 'heatmap') setSelectedZone(region === TODAS_AS_REGIOES ? null : zones.find((zone) => zone.regiao === region) || null);
  };

  const viewSensorFromAlert = (sensorId) => {
    setSensorSearch(sensorId);
    navigateTo('/dashboard/sensores');
  };

  const viewRegionFromAlert = (region) => {
    setSelectedRegion(region);
    setSelectedZone(zones.find((zone) => zone.regiao === region) || null);
    navigateTo('/dashboard/mapa-calor');
  };

  const viewAlertsFromOperations = () => navigateTo('/dashboard/alertas');
  const viewMapFromOperations = (locationData) => {
    setSelectedRegion(locationData.region);
    setSelectedZone(zones.find((zone) => zone.regiao === locationData.region) || null);
    navigateTo('/dashboard/mapa-calor');
  };
  const viewSensorsFromOperations = (locationData) => {
    setSensorSearch(locationData.name);
    setSensorRegion(locationData.region);
    navigateTo('/dashboard/sensores');
  };

  return (
    <DashboardLayout
      activeSection={currentRoute.section}
      alerts={alerts}
      breadcrumbItems={currentRoute.breadcrumb}
      error={isOverview ? error : ''}
      mobileMenuOpen={mobileMenuOpen}
      navigationSection={currentRoute.navLabel || ''}
      notificationsOpen={notificationsOpen}
      onCloseMobileMenu={() => setMobileMenuOpen(false)}
      onCloseNotifications={() => setNotificationsOpen(false)}
      onMarkAllRead={markAllAlertsAsRead}
      onLogout={async () => { await signOutAndClear(); navigate('/login', { replace: true }); }}
      onOpenMobileMenu={() => setMobileMenuOpen(true)}
      onSectionChange={changeSection}
      onToggleNotifications={() => setNotificationsOpen((current) => !current)}
      pageTitle={currentRoute.title}
      regionOptions={regionOptions}
      selectedRegion={activeRegion}
      setSelectedRegion={changeGlobalRegion}
    >
      {isOverview && <>
        <DashboardHero loading={summaryLoading} region={activeRegion} summary={summary} />
        <section className="workspace-metrics" aria-label="Indicadores ambientais">
          <MetricCard loading={summaryLoading} icon={ThermometerSun} title="Temperatura atual" value={summary ? formatarTemperatura(summary.temperaturaAtual) : '—'} detail="Leitura ambiental atual" />
          <MetricCard loading={summaryLoading} icon={Droplets} title="Umidade do ar" value={summary ? `${summary.umidadeAr}%` : '—'} detail="Umidade registrada pela API" tone="blue" />
          <MetricCard loading={summaryLoading} icon={Wifi} title="Sensores operacionais" value={summary ? summary.sensoresAtivos : '—'} detail="Sensores em operação" tone="lime" />
          <MetricCard loading={summaryLoading} icon={Leaf} title="Redução térmica" value={summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : '—'} detail="Impacto estimado na área urbana" />
        </section>
        <div className="workspace-overview-grid">
          <EnvironmentalTrend data={trend} loading={summaryLoading} range={period} setRange={setPeriod} kind={measure} setKind={setMeasure} region={activeRegion} />
          <section className="workspace-panel workspace-attention workspace-reveal">
            <SectionHeader eyebrow="Acompanhamento" title="Pontos de atenção" action={<div className="workspace-panel-action"><span className="workspace-count">{alerts.filter((alert) => alert.tipo === 'Atenção').length}</span><button type="button" className="workspace-text-action" onClick={() => changeSection('Alertas')}>Ver todos <ArrowRight size={15} aria-hidden="true" /></button></div>} />
            <div>{alerts.length > 0 ? alerts.map((alert) => <div className="workspace-attention-row" key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <Battery size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}</span><div><strong>{alert.titulo}</strong><small>{alert.descricao}</small><Badge tone={alert.tipo === 'Atenção' ? 'warning' : 'neutral'} className="workspace-attention-type">{alert.tipo}</Badge></div><time>{alert.horario}</time></div>) : <EmptyState title="Nenhum ponto de atenção." description="A API não retornou alertas para esta área." />}</div>
            <p className="workspace-disclaimer">Avisos sincronizados com o backend.</p>
          </section>
        </div>
        <section className="workspace-panel workspace-recent-sensors workspace-reveal">
          <SectionHeader eyebrow="Leituras recentes" title="Sensores por região" action={<button type="button" className="workspace-text-action" onClick={() => changeSection('Sensores')}>Ver todos <ArrowRight size={15} aria-hidden="true" /></button>} />
          <div>{regionSensors.length > 0 ? regionSensors.slice(0, 4).map((sensor) => <SensorRow key={sensor.id} sensor={sensor} onChoose={setSelectedSensor} condensed />) : <EmptyState title="Nenhuma leitura disponível." description="A API não retornou sensores para a área selecionada." />}</div>
          {selectedSensor && <SensorDetailsDrawer sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}
        </section>
        <NetworkStatus loading={baseLoading || summaryLoading} onViewMap={() => navigateTo('/dashboard/mapa-calor')} sensors={regionSensors} summary={summary} />
        <section className="workspace-panel workspace-impact-teaser workspace-reveal"><SectionHeader eyebrow="Impacto ambiental" title="Visão executiva" action={<button type="button" className="workspace-text-action" onClick={() => changeSection('Impacto')}>Ver impacto <ArrowRight size={15} aria-hidden="true" /></button>} /><div className="workspace-impact-teaser-grid"><div><span>Temperatura</span><strong>{summary ? formatarTemperatura(summary.temperaturaAtual) : 'Dados indisponíveis'}</strong></div><div><span>Redução térmica</span><strong>{summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : 'Dados indisponíveis'}</strong></div><p>Indicadores ambientais disponíveis na fonte atual.</p></div></section>
      </>}

      {currentRoute.id === 'operations-index' && <OperationsIndexView onNavigate={changeSection} />}
      {isOperations && currentRoute.operationView && <OperationsView activeView={currentRoute.operationView} alerts={alerts} baseError={baseError} baseLoading={baseLoading} onSectionChange={changeSection} onViewAlerts={viewAlertsFromOperations} onViewMap={viewMapFromOperations} onViewSensors={viewSensorsFromOperations} selectedRegion={activeRegion} sensors={sensors} summary={summary} summaryError={summaryError} summaryLoading={summaryLoading} zones={zones} />}
      {currentRoute.id === 'sensors' && <SensorsView error={baseError} loading={baseLoading} region={sensorRegion} search={sensorSearch} sensors={sensors} setRegion={setSensorRegion} setSearch={setSensorSearch} setSort={setSensorSort} setStatus={setSensorStatus} sort={sensorSort} status={sensorStatus} selected={selectedSensor} setSelected={setSelectedSensor} />}
      {currentRoute.id === 'heatmap' && <HeatMapView error={baseError} loading={baseLoading} selectedRegion={activeRegion} selectedZone={selectedZone} setRegion={setSelectedRegion} setSelectedZone={setSelectedZone} updatedAt={summary?.atualizadoEm} zones={zones} />}
      {currentRoute.id === 'alerts' && <AlertsView alerts={alerts} error={baseError} loading={baseLoading} onRecognize={markAlertAsRead} onViewRegion={viewRegionFromAlert} onViewSensor={viewSensorFromAlert} sensors={sensors} />}
      {currentRoute.id === 'impact' && <ImpactView error={summaryError} loading={summaryLoading} measure={measure} period={period} selectedRegion={activeRegion} setMeasure={setMeasure} setPeriod={setPeriod} setRegion={setSelectedRegion} summary={summary} trend={trend} zones={zones} zonesLoading={baseLoading} />}
      {currentRoute.id === 'reports' && <ReportsView alerts={alerts} baseError={baseError} baseLoading={baseLoading} measure={measure} onMeasureChange={setMeasure} onPeriodChange={setPeriod} onRegionChange={setSelectedRegion} period={period} regionOptions={regionOptions} selectedRegion={activeRegion} sensors={sensors} summary={summary} summaryError={summaryError} summaryLoading={summaryLoading} trend={trend} zones={zones} />}
      {currentRoute.id === 'administration' && <AdministrationView alerts={alerts} baseError={baseError} baseLoading={baseLoading} sensors={sensors} />}
    </DashboardLayout>
  );
}
