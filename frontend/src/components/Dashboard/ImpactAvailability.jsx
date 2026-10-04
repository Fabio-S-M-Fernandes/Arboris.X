import { Card, SectionHeader } from '../ui';

export function ImpactAvailability() {
  return (
    <section className="workspace-impact-availability workspace-reveal">
      <Card className="workspace-impact-availability-card"><SectionHeader eyebrow="Indicadores complementares" title="Dados ainda não disponíveis" /><div className="workspace-impact-availability-grid"><div><strong>Área monitorada</strong><span>Dados indisponíveis</span></div><div><strong>Impacto de carbono</strong><span>Indicador ainda não disponível</span></div></div></Card>
      <Card className="workspace-impact-targets"><SectionHeader eyebrow="Planejamento" title="Metas ambientais" /><p>Metas corporativas ainda não configuradas.</p></Card>
    </section>
  );
}

