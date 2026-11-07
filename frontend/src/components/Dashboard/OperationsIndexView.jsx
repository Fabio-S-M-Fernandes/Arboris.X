import { ArrowRight, Building2, MapPinned, Wrench } from 'lucide-react';
import { Card } from '../ui';
import { PageHeader } from '../layout/PageHeader';

const OPERATION_LINKS = [
  {
    label: 'Locais',
    description: 'Acompanhe os pontos ambientais monitorados e seus sensores associados.',
    icon: Building2,
  },
  {
    label: 'Ambientes',
    description: 'Consulte a estrutura de ambientes quando essa fonte estiver disponível.',
    icon: MapPinned,
  },
  {
    label: 'Intervenções',
    description: 'Acesse o registro de ações ambientais quando houver dados conectados.',
    icon: Wrench,
  },
];

export function OperationsIndexView({ onNavigate }) {
  return (
    <section className="workspace-view workspace-operations-index-view">
      <PageHeader description="Escolha uma frente de operação para acompanhar os dados ambientais." eyebrow="Operação ambiental" title="Operações" />
      <div className="workspace-operations-index-grid" aria-label="Áreas de operações">
        {OPERATION_LINKS.map(({ description, icon: Icon, label }) => (
          <Card as="button" type="button" className="workspace-operations-index-card" key={label} onClick={() => onNavigate(label)}>
            <span className="workspace-operations-index-icon"><Icon size={20} aria-hidden="true" /></span>
            <span className="workspace-operations-index-copy"><strong>{label}</strong><small>{description}</small></span>
            <ArrowRight size={17} aria-hidden="true" />
          </Card>
        ))}
      </div>
    </section>
  );
}
