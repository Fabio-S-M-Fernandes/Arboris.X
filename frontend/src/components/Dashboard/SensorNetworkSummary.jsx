import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Skeleton } from '../ui';

export function SensorNetworkSummary({ sensors, loading }) {
  const total = sensors.length;
  const operational = sensors.filter((sensor) => sensor.estado === 'Estável').length;
  const attention = sensors.filter((sensor) => sensor.estado === 'Atenção').length;
  const metrics = [
    { label: 'Total de sensores', value: total, icon: Activity, tone: 'primary' },
    { label: 'Operacionais', value: operational, icon: CheckCircle2, tone: 'success' },
    { label: 'Em atenção', value: attention, icon: AlertTriangle, tone: 'warning' },
  ];

  return (
    <section className="workspace-sensor-summary" aria-label="Resumo da rede de sensores">
      {metrics.map(({ icon: Icon, label, tone, value }) => (
        <Card as="div" className={`workspace-sensor-stat is-${tone}`} key={label}>
          <span className="workspace-sensor-stat-icon"><Icon size={16} aria-hidden="true" /></span>
          <div>
            <small>{label}</small>
            <strong>{loading ? <Skeleton className="workspace-summary-skeleton" /> : value}</strong>
          </div>
        </Card>
      ))}
    </section>
  );
}

