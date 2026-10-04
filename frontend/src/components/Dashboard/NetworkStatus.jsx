import { CircleAlert, CircleCheck, CircleHelp, Wifi } from 'lucide-react';
import { Card, EmptyState, SectionHeader, Skeleton, StatusBadge } from '../ui';

export function NetworkStatus({ sensors, summary, loading }) {
  const stableSensors = sensors.filter((sensor) => sensor.estado === 'Estável').length;
  const attentionSensors = sensors.filter((sensor) => sensor.estado === 'Atenção').length;
  const hasSensorStatus = sensors.length > 0;

  return (
    <Card className="workspace-panel workspace-network-status workspace-reveal">
      <SectionHeader
        eyebrow="Infraestrutura"
        title="Status da rede de sensores"
        action={<StatusBadge status={hasSensorStatus ? 'Estável' : 'Indisponível'} />}
      />
      {loading ? (
        <div className="workspace-network-loading" aria-label="Carregando status da rede">
          <Skeleton className="workspace-network-skeleton-main" />
          <Skeleton className="workspace-network-skeleton-detail" />
        </div>
      ) : !summary && !hasSensorStatus ? (
        <EmptyState title="Status da rede indisponível." description="A API ainda não retornou dados de infraestrutura." />
      ) : (
        <>
          <div className="workspace-network-summary">
            <div className="workspace-network-primary">
              <span className="workspace-network-icon"><Wifi size={19} aria-hidden="true" /></span>
              <div>
                <strong>{summary?.sensoresAtivos ?? '—'}</strong>
                <span>Sensores operacionais</span>
              </div>
            </div>
            <p>Estado consolidado a partir das leituras disponíveis no backend.</p>
          </div>
          <div className="workspace-network-grid">
            <div><CircleCheck size={15} /><span>Estáveis</span><strong>{hasSensorStatus ? stableSensors : '—'}</strong></div>
            <div><CircleAlert size={15} /><span>Em atenção</span><strong>{hasSensorStatus ? attentionSensors : '—'}</strong></div>
            <div><CircleHelp size={15} /><span>Offline</span><strong>Não informado</strong></div>
          </div>
          <small className="workspace-network-note">O estado offline ainda não é disponibilizado pela API atual.</small>
        </>
      )}
    </Card>
  );
}

