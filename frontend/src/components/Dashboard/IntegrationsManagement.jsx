import { Cable, Cloud, Download, Radio, Webhook } from 'lucide-react';
import { Badge, Card, EmptyState, SectionHeader } from '../ui';

const INTEGRATIONS = [
  { label: 'API', description: 'Conectores para serviços corporativos e dados ambientais.', icon: Cloud },
  { label: 'Sensores', description: 'Orquestração de dispositivos e gateways ambientais.', icon: Radio },
  { label: 'Sistemas corporativos', description: 'Integração com plataformas internas da organização.', icon: Cable },
  { label: 'Exportação', description: 'Saídas estruturadas para relatórios e análises.', icon: Download },
  { label: 'Webhooks', description: 'Notificações de eventos para serviços externos.', icon: Webhook },
];

export function IntegrationsManagement() {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="integrations-title">
      <Card className="workspace-admin-integrations-card">
        <SectionHeader eyebrow="Ecossistema" title="Integrações" action={<Badge tone="muted">Disponível futuramente</Badge>} />
        <EmptyState title="Nenhuma integração administrativa configurada." description="As categorias abaixo representam pontos de extensão previstos, sem afirmar conexões existentes." />
        <div className="workspace-admin-integration-grid">{INTEGRATIONS.map(({ description, icon: Icon, label }) => <article key={label}><span className="workspace-admin-integration-icon"><Icon size={18} aria-hidden="true" /></span><div><strong>{label}</strong><p>{description}</p></div><Badge tone="muted">Disponível futuramente</Badge></article>)}</div>
      </Card>
    </section>
  );
}
