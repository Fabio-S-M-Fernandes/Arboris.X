import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from './Card';

export function MetricCard({ icon: Icon, title, value, detail, trend, tone = 'green', loading = false }) {
  const TrendIcon = trend?.startsWith('↓') ? ArrowDownRight : ArrowUpRight;
  return (
    <Card className={`workspace-metric arboris-metric-card workspace-metric-${tone} workspace-reveal`}>
      <div className="workspace-metric-top">
        <span className="workspace-metric-icon"><Icon size={19} aria-hidden="true" /></span>
        <span className="arboris-badge arboris-badge-muted">API</span>
      </div>
      <p>{title}</p>
      <div className="workspace-metric-value">
        <strong aria-live="polite">{loading ? <span className="arboris-skeleton arboris-skeleton-value" aria-label="Carregando" /> : value}</strong>
        {!loading && trend && <span><TrendIcon size={14} />{trend.slice(1).trim()}</span>}
      </div>
      <small>{loading ? 'Carregando dados...' : detail}</small>
    </Card>
  );
}
