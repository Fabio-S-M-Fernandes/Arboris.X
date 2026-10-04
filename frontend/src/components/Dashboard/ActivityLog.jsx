import { ListChecks } from 'lucide-react';
import { Badge, Card, EmptyState, SectionHeader } from '../ui';

export function ActivityLog() {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="activity-title">
      <Card className="workspace-admin-activity-card">
        <SectionHeader eyebrow="Governança" title="Registro de atividade" action={<Badge tone="muted">Não configurado</Badge>} />
        <div className="workspace-admin-coming-soon"><ListChecks size={18} aria-hidden="true" /><EmptyState title="Registro de atividade será disponibilizado quando o serviço de auditoria estiver configurado." description="Nenhum log foi criado ou inventado nesta etapa." /></div>
      </Card>
    </section>
  );
}
