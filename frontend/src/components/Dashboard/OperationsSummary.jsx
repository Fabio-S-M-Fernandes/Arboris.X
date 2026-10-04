import { AlertTriangle, Building2, CheckCircle2, Wifi } from 'lucide-react';
import { MetricCard } from '../ui';

export function OperationsSummary({ locations, sensors, loading }) {
  const attentionLocations = locations.filter((location) => location.status === 'Atenção' || location.status === 'Crítico').length;
  const stableLocations = locations.filter((location) => location.status === 'Estável').length;

  return (
    <section className="workspace-metrics workspace-operations-summary" aria-label="Resumo operacional">
      <MetricCard loading={loading} icon={Building2} title="Locais monitorados" value={locations.length} detail="Agrupados por local real dos sensores" />
      <MetricCard loading={loading} icon={Wifi} title="Sensores" value={sensors.length} detail="Sensores associados aos locais" tone="lime" />
      <MetricCard loading={loading} icon={AlertTriangle} title="Locais em atenção" value={attentionLocations} detail="Derivado do estado dos sensores" tone="blue" />
      <MetricCard loading={loading} icon={CheckCircle2} title="Locais estáveis" value={stableLocations} detail="Todos os sensores estáveis" />
    </section>
  );
}
