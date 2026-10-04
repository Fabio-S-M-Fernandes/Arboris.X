import { Activity, Clock3, MapPin } from 'lucide-react';
import { Card, Skeleton } from '../ui';

function formatarUltimaSincronizacao(timestamp) {
  if (!timestamp) return 'Aguardando leitura';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Aguardando leitura';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function DashboardHero({ region, summary, loading }) {
  return (
    <Card className="workspace-welcome workspace-reveal">
      <div>
        <p>Resumo ambiental</p>
        <h2>Visão geral operacional</h2>
        <span>Leituras consolidadas das áreas monitoradas pela Arboris.X.</span>
      </div>
      <div className="workspace-hero-meta" aria-label="Contexto dos dados do dashboard">
        <span>
          <MapPin size={14} aria-hidden="true" />
          <small>Área selecionada</small>
          <strong>{region}</strong>
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          <small>Última sincronização</small>
          <strong>{loading ? <Skeleton className="workspace-hero-skeleton" /> : formatarUltimaSincronizacao(summary?.atualizadoEm)}</strong>
        </span>
        <small className="workspace-hero-live"><i /><Activity size={14} aria-hidden="true" />Dados em tempo real</small>
      </div>
    </Card>
  );
}

