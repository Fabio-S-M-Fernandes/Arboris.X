import { MapPinned } from 'lucide-react';
import { Card, EmptyState, ErrorState, SectionHeader, Skeleton } from '../ui';

export function EnvironmentSection({ loading, error }) {
  return (
    <Card className="workspace-operations-empty-section workspace-reveal">
      <SectionHeader eyebrow="Estrutura operacional" title="Ambientes" action={<MapPinned size={17} aria-hidden="true" />} />
      {error ? <ErrorState title="Não foi possível carregar os ambientes." message={error} /> : loading ? <Skeleton className="workspace-operations-empty-skeleton" /> : <EmptyState title="Ambientes detalhados ainda não estão disponíveis para esta fonte de dados." description="A API atual não possui o nível de subáreas ou ambientes internos." />}
    </Card>
  );
}
