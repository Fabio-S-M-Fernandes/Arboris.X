import { useMemo } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { EmptyState, StatusBadge } from '../ui';
import { SensorDetailsDrawer } from './SensorDetailsDrawer';
import { SensorFilters } from './SensorFilters';
import { SensorNetworkSummary } from './SensorNetworkSummary';
import { SensorTable } from './SensorTable';
import { TODAS_AS_REGIOES } from './sensorConstants';

const numeroLocal = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const formatarTemperatura = (value) => Number.isFinite(Number(value)) ? `${numeroLocal(value, 1)}°C` : 'Não disponível';

export function SensorRow({ sensor, onChoose, condensed = false }) {
  return (
    <button type="button" className={`workspace-sensor-row ${condensed ? 'is-condensed' : ''}`} onClick={() => onChoose(sensor)}>
      <span className="workspace-sensor-place"><strong>{sensor.id}</strong><small><MapPin size={12} aria-hidden="true" />{sensor.local}</small></span>
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

export function SensorsView({ sensors, loading, error, search, setSearch, region, setRegion, status, setStatus, sort, setSort, selected, setSelected }) {
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
      {!loading && !error && sensors.length === 0 && <EmptyState title="Nenhum sensor disponível." description="A API não retornou pontos ambientais para esta área." />}
      <SensorDetailsDrawer sensor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

