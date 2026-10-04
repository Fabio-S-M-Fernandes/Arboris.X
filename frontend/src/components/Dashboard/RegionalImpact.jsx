import { ChevronRight } from 'lucide-react';
import { EmptyState, SectionHeader, StatusBadge } from '../ui';
import { formatTemperature, getThermalLabel, getThermalLevel } from './heatMapUtils';

export function RegionalImpact({ zones, loading, selectedRegion, onSelect }) {
  return (
    <section className="workspace-panel workspace-regional-impact workspace-reveal">
      <SectionHeader eyebrow="Leitura territorial" title="Desempenho por região" />
      {loading ? <div className="workspace-impact-region-loading"><span /><span /><span /></div> : zones.length === 0 ? <EmptyState title="Nenhuma região disponível." description="A API não retornou dados regionais." /> : <div className="workspace-regional-impact-list">
        {zones.map((zone) => (
          <button type="button" className={`workspace-regional-impact-row is-${getThermalLevel(zone.nivel)} ${selectedRegion === zone.regiao ? 'is-selected' : ''}`} key={zone.regiao} onClick={() => onSelect(zone.regiao)} aria-pressed={selectedRegion === zone.regiao}>
            <span className="workspace-regional-impact-name"><strong>{zone.regiao}</strong><small>{zone.sensores ?? 'Não disponível'} pontos monitorados</small></span>
            <strong className="workspace-regional-impact-temperature">{formatTemperature(zone.temperatura)}</strong>
            <StatusBadge status={getThermalLabel(zone.nivel)} />
            <span className="workspace-regional-impact-trend">{zone.tendencia || 'Não disponível'}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>}
    </section>
  );
}

