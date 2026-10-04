import { Activity } from 'lucide-react';
import { Card, EmptyState, SectionHeader } from '../ui';

const numeroLocal = (value) => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function ImpactInsight({ trend, measure, loading }) {
  const values = trend?.valores || [];
  const hasComparison = values.length >= 2;
  const variation = hasComparison ? values[values.length - 1] - values[0] : 0;
  const metricLabel = measure === 'temperatura' ? 'temperatura' : 'umidade';
  const unit = measure === 'temperatura' ? '°C' : '%';

  return (
    <Card className="workspace-impact-insight workspace-reveal">
      <SectionHeader eyebrow="Contexto executivo" title="Leitura do período" />
      {loading ? <div className="workspace-insight-loading"><span /><span /><span /></div> : hasComparison ? <div className="workspace-insight-content"><span className="workspace-insight-icon"><Activity size={19} aria-hidden="true" /></span><p>A {metricLabel} apresentou {variation < 0 ? 'queda' : variation > 0 ? 'alta' : 'estabilidade'} de <strong>{numeroLocal(Math.abs(variation))}{unit}</strong> entre o primeiro e o último ponto do período selecionado.</p></div> : <EmptyState title="Sem dados suficientes para gerar uma leitura automática." description="A API precisa fornecer mais de uma leitura para comparar o período." />}
    </Card>
  );
}

