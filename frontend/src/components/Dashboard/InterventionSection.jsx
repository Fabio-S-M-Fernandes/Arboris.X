import { Wrench } from 'lucide-react';
import { Card, EmptyState, ErrorState, SectionHeader, Skeleton } from '../ui';

export function InterventionSection({ loading, error }) {
  return (
    <Card className="workspace-operations-empty-section workspace-reveal">
      <SectionHeader eyebrow="Ações ambientais" title="Intervenções" action={<Wrench size={17} aria-hidden="true" />} />
      {error ? <ErrorState title="Não foi possível carregar as intervenções." message={error} /> : loading ? <Skeleton className="workspace-operations-empty-skeleton" /> : <EmptyState title="Registro de intervenções ainda não disponível." description="A API atual não fornece ações realizadas, responsáveis ou datas para exibição." />}
    </Card>
  );
}
