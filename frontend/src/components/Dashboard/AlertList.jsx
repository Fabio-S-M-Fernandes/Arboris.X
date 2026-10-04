import { ChevronRight, MapPin } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, StatusBadge } from '../ui';
import { getAlertStatus, formatAlertValue } from './alertUtils';

function AlertListLoading() {
  return (
    <div className="workspace-alert-skeleton-list" aria-label="Carregando alertas">
      {Array.from({ length: 5 }, (_, index) => <div className="workspace-alert-skeleton-row" key={index}><Skeleton /><div><Skeleton /><Skeleton /></div><Skeleton /></div>)}
    </div>
  );
}

export function AlertList({ alerts, allCount, loading, error, onChoose }) {
  if (error) return <ErrorState title="Não foi possível carregar os alertas." message={error} />;
  if (loading) return <AlertListLoading />;
  if (alerts.length === 0) return <EmptyState title={allCount === 0 ? 'Não há alertas ativos.' : 'Nenhum alerta encontrado.'} description={allCount === 0 ? 'A API não retornou ocorrências ambientais.' : 'Ajuste ou limpe os filtros para consultar outras ocorrências.'} />;

  return (
    <div className="workspace-alert-table-wrap" aria-live="polite">
      <div className="workspace-alert-list-header" aria-hidden="true"><span>Status e tipo</span><span>Contexto</span><span>Descrição</span><span>Horário</span><span /></div>
      <div className="workspace-alert-list">
        {alerts.map((alert) => (
          <button type="button" className={`workspace-alert-row is-${alert.tipo === 'Crítico' ? 'critical' : alert.tipo === 'Atenção' ? 'warning' : 'normal'}`} key={alert.id} onClick={() => onChoose(alert)}>
            <span className="workspace-alert-row-status"><StatusBadge status={alert.tipo} /><Badge tone={alert.naoLido ? 'warning' : 'muted'}>{getAlertStatus(alert)}</Badge></span>
            <span className="workspace-alert-row-context"><strong>{alert.local || 'Não disponível'}</strong><small><MapPin size={12} aria-hidden="true" />{alert.sensorId || 'Sensor não identificado'}{alert.regiao ? ` · ${alert.regiao}` : ''}</small></span>
            <span className="workspace-alert-row-description"><strong>{alert.titulo || 'Ocorrência ambiental'}</strong><small>{alert.descricao || 'Descrição não disponível'}</small>{Number.isFinite(Number(alert.temperatura)) && <em>{formatAlertValue(alert.temperatura, '°C')}</em>}</span>
            <time>{alert.horario || 'Não disponível'}</time>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

