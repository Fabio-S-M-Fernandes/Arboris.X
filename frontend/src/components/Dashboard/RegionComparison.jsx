import { ChevronRight } from 'lucide-react';
import { SectionHeader, StatusBadge } from '../ui';
import { formatTemperature, getThermalLabel, getThermalLevel } from './heatMapUtils';

export function RegionComparison({ zones, selectedRegion, onSelect }) {
  return (
    <section className="workspace-panel workspace-region-comparison workspace-reveal">
      <SectionHeader eyebrow="Leitura comparativa" title="Comparação por região" />
      <div className="workspace-region-comparison-grid">
        {zones.map((zone) => (
          <button type="button" key={zone.regiao} className={`workspace-region-comparison-item is-${getThermalLevel(zone.nivel)} ${selectedRegion === zone.regiao ? 'is-selected' : ''}`} onClick={() => onSelect(zone.regiao)} aria-pressed={selectedRegion === zone.regiao}>
            <span className="workspace-region-comparison-top"><strong>{zone.regiao}</strong><ChevronRight size={15} aria-hidden="true" /></span>
            <span className="workspace-region-comparison-value">{formatTemperature(zone.temperatura)}</span>
            <span className="workspace-region-comparison-meta">{zone.sensores ?? 'Não disponível'} pontos monitorados</span>
            <span className="workspace-region-comparison-status"><StatusBadge status={getThermalLabel(zone.nivel)} /></span>
            <span className="workspace-region-comparison-meter"><i style={{ width: `${Math.max(0, Math.min(100, Number(zone.nivel) || 0))}%` }} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

