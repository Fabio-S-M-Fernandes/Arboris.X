import { Clock3, MapPin, ThermometerSun } from 'lucide-react';
import { EmptyState, StatusBadge } from '../ui';
import { formatTemperature, formatUpdatedAt, getRegionRank, getThermalLabel } from './heatMapUtils';

export function RegionSummary({ zone, zones, updatedAt }) {
  if (!zone) {
    return (
      <aside className="workspace-panel workspace-region-summary workspace-reveal" aria-label="Resumo da área">
        <p>Resumo da área</p>
        <MapPin size={20} aria-hidden="true" />
        <h2>Selecione uma região</h2>
        <EmptyState title="Escolha uma área para consultar o resumo ambiental." />
      </aside>
    );
  }

  return (
    <aside className="workspace-panel workspace-region-summary workspace-reveal" aria-label={`Resumo da região ${zone.regiao}`}>
      <div className="workspace-region-summary-heading"><div><p>Resumo da área</p><h2>{zone.regiao}</h2></div><MapPin size={19} aria-hidden="true" /></div>
      <div className="workspace-region-temperature"><ThermometerSun size={18} aria-hidden="true" /><strong>{formatTemperature(zone.temperatura)}</strong><span>Temperatura média</span></div>
      <div className="workspace-region-status"><span>Status térmico</span><StatusBadge status={getThermalLabel(zone.nivel)} /></div>
      <dl className="workspace-region-details">
        <div><dt>Mínima</dt><dd>Não disponível</dd></div>
        <div><dt>Máxima</dt><dd>Não disponível</dd></div>
        <div><dt>Pontos monitorados</dt><dd>{zone.sensores ?? 'Não disponível'}</dd></div>
        <div><dt>Posição relativa</dt><dd>{getRegionRank(zones, zone)}</dd></div>
        <div><dt><Clock3 size={13} aria-hidden="true" />Última atualização</dt><dd>{formatUpdatedAt(updatedAt)}</dd></div>
      </dl>
      <div className="workspace-region-trend"><span>Tendência</span><strong>{zone.tendencia || 'Não disponível'}</strong></div>
    </aside>
  );
}

