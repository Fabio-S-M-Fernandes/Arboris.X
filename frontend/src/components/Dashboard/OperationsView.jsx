import { useMemo, useState } from 'react';
import { Building2, MapPinned, Wrench } from 'lucide-react';
import { Badge } from '../ui';
import { PageHeader } from '../layout/PageHeader';
import { EnvironmentSection } from './EnvironmentSection';
import { InterventionSection } from './InterventionSection';
import { LocationDetailsDrawer } from './LocationDetailsDrawer';
import { LocationList } from './LocationList';
import { OperationsSummary } from './OperationsSummary';
import { SensorDetailsDrawer } from './SensorDetailsDrawer';
import { buildLocations } from './operationsUtils';
import { formatUpdatedAt, TODAS_AS_REGIOES } from './heatMapUtils';

const OPERATIONS_VIEWS = [
  { value: 'Locais', label: 'Locais', icon: Building2 },
  { value: 'Ambientes', label: 'Ambientes', icon: MapPinned },
  { value: 'Intervenções', label: 'Intervenções', icon: Wrench },
];

export function OperationsView({ activeView, alerts, baseError, baseLoading, onSectionChange, onViewAlerts, onViewMap, onViewSensors, selectedRegion, sensors, summary, summaryError, summaryLoading, zones }) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState(TODAS_AS_REGIOES);
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('recentes');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const scopedSensors = useMemo(() => selectedRegion === TODAS_AS_REGIOES ? sensors : sensors.filter((sensor) => sensor.regiao === selectedRegion), [selectedRegion, sensors]);
  const locations = useMemo(() => buildLocations(scopedSensors, alerts), [alerts, scopedSensors]);
  const selectedView = OPERATIONS_VIEWS.some((view) => view.value === activeView) ? activeView : 'Locais';
  const dataError = baseError || summaryError;
  const dataLoading = baseLoading || summaryLoading;
  const resolvedSelectedLocation = locations.find((location) => location.name === selectedLocation?.name) || null;

  const clearFilters = () => {
    setSearch('');
    setRegion(TODAS_AS_REGIOES);
    setStatus('Todos');
    setSort('recentes');
  };

  const chooseSensor = (sensor) => {
    setSelectedLocation(null);
    setSelectedSensor(sensor);
  };

  const chooseAlerts = (location) => {
    setSelectedLocation(null);
    onViewAlerts(location);
  };

  const chooseMap = (location) => {
    setSelectedLocation(null);
    onViewMap(location);
  };

  const chooseSensors = (location) => {
    setSelectedLocation(null);
    onViewSensors(location);
  };

  return (
    <section className="workspace-view workspace-operations-view">
      <PageHeader aside={<div className="workspace-operations-meta"><strong>{selectedRegion}</strong><small>{dataLoading ? 'Atualizando dados...' : `${locations.length} ${locations.length === 1 ? 'local disponível' : 'locais disponíveis'}`}</small><small>{summary?.atualizadoEm ? `Atualizado em ${formatUpdatedAt(summary.atualizadoEm)}` : 'Última atualização não disponível'}</small></div>} description="Gerencie e acompanhe os locais e ambientes monitorados." eyebrow="Operação ambiental" title="Operações" />
      <nav className="workspace-operations-tabs workspace-reveal" aria-label="Seções de operações" role="tablist">
        {OPERATIONS_VIEWS.map(({ icon: Icon, label, value }) => <button type="button" role="tab" aria-selected={selectedView === value} className={selectedView === value ? 'is-active' : ''} key={value} onClick={() => onSectionChange(value)}><Icon size={15} aria-hidden="true" />{label}</button>)}
      </nav>

      {selectedView === 'Locais' && <>
        <OperationsSummary loading={baseLoading} locations={locations} sensors={scopedSensors} />
        <LocationList error={dataError} loading={baseLoading} locations={locations} onClear={clearFilters} onDetails={setSelectedLocation} onViewAlerts={chooseAlerts} onViewMap={chooseMap} onViewSensors={chooseSensors} region={region} search={search} setRegion={setRegion} setSearch={setSearch} setSort={setSort} setStatus={setStatus} sort={sort} status={status} zones={zones} />
        <LocationDetailsDrawer canViewMap={resolvedSelectedLocation ? zones.some((zone) => zone.regiao === resolvedSelectedLocation.region) : false} location={resolvedSelectedLocation} onClose={() => setSelectedLocation(null)} onSelectSensor={chooseSensor} onViewAlerts={chooseAlerts} onViewMap={chooseMap} onViewSensors={chooseSensors} />
        <SensorDetailsDrawer sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
      </>}
      {selectedView === 'Ambientes' && <EnvironmentSection error={baseError} loading={baseLoading} />}
      {selectedView === 'Intervenções' && <InterventionSection error={baseError} loading={baseLoading} />}
      {!dataError && selectedView === 'Locais' && scopedSensors.length === 0 && !baseLoading && <div className="workspace-operations-data-note"><Badge tone="muted">Fonte atual</Badge><span>Não há sensores associados à região selecionada para derivar locais.</span></div>}
    </section>
  );
}
