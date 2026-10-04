import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { Card, Skeleton } from '../ui';

export function AlertSummary({ alerts, loading }) {
  const critical = alerts.filter((alert) => alert.tipo === 'Crítico').length;
  const attention = alerts.filter((alert) => alert.tipo === 'Atenção').length;
  const information = alerts.filter((alert) => alert.tipo === 'Informação').length;
  const unread = alerts.filter((alert) => alert.naoLido).length;
  const metrics = [
    ...(critical > 0 ? [{ label: 'Críticos', value: critical, icon: AlertTriangle, tone: 'critical' }] : []),
    { label: 'Atenção', value: attention, icon: AlertTriangle, tone: 'warning' },
    { label: 'Informação', value: information, icon: CheckCircle2, tone: 'neutral' },
    { label: 'Não lidos', value: unread, icon: Bell, tone: 'primary' },
  ];

  return (
    <section className={`workspace-alert-summary is-${metrics.length > 3 ? 'four' : 'three'}`} aria-label="Resumo de alertas">
      {metrics.map(({ icon: Icon, label, tone, value }) => (
        <Card as="div" className={`workspace-alert-stat is-${tone}`} key={label}>
          <span><Icon size={16} aria-hidden="true" /></span>
          <div><small>{label}</small><strong>{loading ? <Skeleton className="workspace-alert-summary-skeleton" /> : value}</strong></div>
        </Card>
      ))}
    </section>
  );
}

