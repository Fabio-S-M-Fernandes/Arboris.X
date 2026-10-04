import { Badge } from './Badge';

export function StatusBadge({ status }) {
  const tone = status === 'Atenção' || status === 'Intermediário' ? 'warning' : status === 'Crítico' || status === 'Mais quente' ? 'critical' : status === 'Indisponível' ? 'neutral' : 'success';
  const stateClass = status === 'Atenção' || status === 'Intermediário' ? 'is-warning' : status === 'Crítico' || status === 'Mais quente' ? 'is-critical' : status === 'Indisponível' ? 'is-neutral' : '';
  return <Badge tone={tone} className={`workspace-status ${stateClass}`.trim()}><i />{status}</Badge>;
}
