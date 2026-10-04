import { Archive } from 'lucide-react';
import { Card, EmptyState, SectionHeader } from '../ui';

export function RecentReports() {
  return (
    <Card as="section" className="workspace-report-recent workspace-reveal">
      <SectionHeader eyebrow="Histórico" title="Relatórios recentes" action={<Archive size={17} aria-hidden="true" />} />
      <EmptyState
        title="Nenhum relatório recente."
        description="Os relatórios gerados aparecerão aqui quando o histórico estiver disponível."
      />
    </Card>
  );
}
