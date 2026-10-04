import { RotateCcw, Search } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export function SensorFilters({
  regions,
  search,
  setSearch,
  region,
  setRegion,
  status,
  setStatus,
  sort,
  setSort,
  onClear,
}) {
  const hasFilters = Boolean(search || region !== 'Todas as regiões' || status !== 'Todos' || sort !== 'recentes');

  return (
    <section className="workspace-panel workspace-sensor-filters workspace-reveal" aria-label="Filtros de sensores">
      <div className="workspace-filter-search-wrap">
        <Search size={16} aria-hidden="true" />
        <Input
          aria-label="Buscar sensores"
          className="workspace-filter-search"
          label="Buscar"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por local, região ou código"
          value={search}
        />
      </div>
      <Select label="Região" value={region} onChange={(event) => setRegion(event.target.value)}>
        {regions.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="Todos">Todos</option>
        <option value="Estável">Estável</option>
        <option value="Atenção">Atenção</option>
        <option value="Crítico">Crítico</option>
      </Select>
      <Select label="Ordenação" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="recentes">Mais recentes</option>
        <option value="temperatura-desc">Temperatura maior</option>
        <option value="temperatura-asc">Temperatura menor</option>
        <option value="umidade-desc">Umidade maior</option>
        <option value="umidade-asc">Umidade menor</option>
      </Select>
      <Button className="workspace-clear-filters" disabled={!hasFilters} onClick={onClear}>
        <RotateCcw size={14} aria-hidden="true" />
        Limpar filtros
      </Button>
    </section>
  );
}

