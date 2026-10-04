import { RotateCcw, Search } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export function AlertFilters({ regions, types, search, setSearch, region, setRegion, status, setStatus, type, setType, sort, setSort, onClear }) {
  const hasFilters = Boolean(search || region !== 'Todas as regiões' || status !== 'Todos' || type !== 'Todos' || sort !== 'recentes');

  return (
    <section className="workspace-panel workspace-alert-filters workspace-reveal" aria-label="Filtros de alertas">
      <div className="workspace-filter-search-wrap">
        <Search size={16} aria-hidden="true" />
        <Input aria-label="Pesquisar alertas" className="workspace-filter-search" label="Pesquisar" onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar alerta..." value={search} />
      </div>
      <Select label="Região" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
      <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="Todos">Todos</option><option value="Não lido">Não lido</option><option value="Lido">Lido</option></Select>
      <Select label="Tipo" value={type} onChange={(event) => setType(event.target.value)}><option value="Todos">Todos</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
      <Select label="Ordenação" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option></Select>
      <Button className="workspace-clear-filters" disabled={!hasFilters} onClick={onClear}><RotateCcw size={14} aria-hidden="true" />Limpar filtros</Button>
    </section>
  );
}

