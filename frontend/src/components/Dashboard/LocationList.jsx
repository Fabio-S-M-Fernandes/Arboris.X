import { RotateCcw, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Button, EmptyState, ErrorState, Input, Select, Skeleton } from '../ui';
import { LocationCard } from './LocationCard';
import { parseRelativeMinutes } from './operationsUtils';

function LocationListLoading() {
  return <div className="workspace-location-grid" aria-label="Carregando locais">{Array.from({ length: 4 }, (_, index) => <div className="workspace-location-skeleton" key={index}><Skeleton /><Skeleton /><Skeleton /></div>)}</div>;
}

export function LocationList({ locations, loading, error, search, setSearch, region, setRegion, status, setStatus, sort, setSort, onClear, onDetails, onViewAlerts, onViewMap, onViewSensors, zones }) {
  const regions = useMemo(() => ['Todas as regiões', ...new Set(locations.map((location) => location.region))], [locations]);
  const statuses = useMemo(() => ['Todos', ...new Set(locations.map((location) => location.status))], [locations]);
  const visibleLocations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = locations.filter((location) => (
      (!query || `${location.name} ${location.region}`.toLocaleLowerCase('pt-BR').includes(query))
      && (region === 'Todas as regiões' || location.region === region)
      && (status === 'Todos' || location.status === status)
    ));
    return [...filtered].sort((first, second) => {
      if (sort === 'temperatura-desc') return Number(second.temperature || -Infinity) - Number(first.temperature || -Infinity);
      if (sort === 'temperatura-asc') return Number(first.temperature || Infinity) - Number(second.temperature || Infinity);
      if (sort === 'sensores-desc') return second.sensors.length - first.sensors.length;
      return parseRelativeMinutes(first.updatedAt) - parseRelativeMinutes(second.updatedAt);
    });
  }, [locations, region, search, sort, status]);
  const hasFilters = Boolean(search || region !== 'Todas as regiões' || status !== 'Todos' || sort !== 'recentes');

  return (
    <section className="workspace-operations-locations" aria-labelledby="locations-title">
      <div className="workspace-operations-section-heading"><div><p>Estrutura operacional</p><h3 id="locations-title">Locais monitorados</h3></div><span>{loading ? 'Atualizando dados...' : `${visibleLocations.length} de ${locations.length} locais`}</span></div>
      <section className="workspace-panel workspace-location-filters workspace-reveal" aria-label="Filtros de locais">
        <div className="workspace-filter-search-wrap"><Search size={16} aria-hidden="true" /><Input aria-label="Buscar local" className="workspace-filter-search" label="Buscar" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar local..." value={search} /></div>
        <Select label="Região" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option value={item} key={item}>{item}</option>)}</Select>
        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option value={item} key={item}>{item}</option>)}</Select>
        <Select label="Ordenação" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recentes">Mais recentes</option><option value="sensores-desc">Mais sensores</option><option value="temperatura-desc">Temperatura maior</option><option value="temperatura-asc">Temperatura menor</option></Select>
        <Button className="workspace-clear-filters" disabled={!hasFilters} onClick={onClear}><RotateCcw size={14} aria-hidden="true" />Limpar filtros</Button>
      </section>
      {error ? <ErrorState title="Não foi possível carregar os locais." message={error} /> : loading ? <LocationListLoading /> : locations.length === 0 ? <EmptyState title="Nenhum local disponível." description="A API atual não fornece locais monitorados para esta região." /> : visibleLocations.length === 0 ? <EmptyState title="Nenhum local encontrado." description="Ajuste os filtros ou a busca para consultar outros locais." /> : <div className="workspace-location-grid">{visibleLocations.map((location) => <LocationCard key={location.name} canViewMap={zones.some((zone) => zone.regiao === location.region)} location={location} onDetails={onDetails} onViewAlerts={onViewAlerts} onViewMap={onViewMap} onViewSensors={onViewSensors} />)}</div>}
    </section>
  );
}
