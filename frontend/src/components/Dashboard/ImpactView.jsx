import { useMemo } from 'react';
import { EmptyState, ErrorState, Select, Skeleton } from '../ui';
import { EnvironmentalTrend } from './EnvironmentalTrend';
import { ImpactAvailability } from './ImpactAvailability';
import { ImpactInsight } from './ImpactInsight';
import { ImpactSummary } from './ImpactSummary';
import { RegionalImpact } from './RegionalImpact';
import { formatUpdatedAt, TODAS_AS_REGIOES } from './heatMapUtils';
import { PageHeader } from '../layout/PageHeader';

export function ImpactView({ summary, trend, zones, loading, zonesLoading, error, selectedRegion, setRegion, period, setPeriod, measure, setMeasure }) {
  const regions = useMemo(() => [TODAS_AS_REGIOES, ...zones.map((zone) => zone.regiao)], [zones]);
  const validRegion = regions.includes(selectedRegion) ? selectedRegion : TODAS_AS_REGIOES;
  const totalPoints = zones.reduce((total, zone) => total + (Number(zone.sensores) || 0), 0);

  if (error) return <ErrorState title="Não foi possível carregar os dados de impacto." message={error} />;

  return (
    <section className="workspace-view workspace-impact-view">
      <PageHeader aside={<div className="workspace-impact-meta"><strong>{validRegion}</strong><small>{period === '24h' ? '24 horas' : period === '7d' ? '7 dias' : '30 dias'} · {summary?.atualizadoEm ? `Atualizado em ${formatUpdatedAt(summary.atualizadoEm)}` : 'Atualização não disponível'}</small></div>} description="Indicadores ambientais das áreas monitoradas." eyebrow="Inteligência ambiental" title="Impacto ambiental" />
      <section className="workspace-panel workspace-impact-controls workspace-reveal" aria-label="Contexto do impacto ambiental">
        <Select label="Região" value={validRegion} onChange={(event) => setRegion(event.target.value)}>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</Select>
        <Select label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="24h">24 horas</option><option value="7d">7 dias</option><option value="30d">30 dias</option></Select>
        <Select label="Indicador" value={measure} onChange={(event) => setMeasure(event.target.value)}><option value="temperatura">Temperatura</option><option value="umidade">Umidade</option></Select>
        <span className="workspace-impact-context">{zonesLoading ? 'Carregando dados regionais...' : totalPoints ? `${totalPoints} pontos regionais disponíveis` : 'Dados regionais indisponíveis'}</span>
      </section>
      <div className="workspace-impact-section-heading workspace-reveal"><div><p>Panorama ambiental</p><h3>Indicadores principais</h3></div><span>Dados consolidados pela API atual.</span></div>
      <ImpactSummary loading={loading} measure={measure} summary={summary} trend={trend} />
      <div className="workspace-impact-main-grid">
        <EnvironmentalTrend className="workspace-impact-trend" data={trend} kind={measure} loading={loading} range={period} region={validRegion} setKind={setMeasure} setRange={setPeriod} />
        <ImpactInsight loading={loading} measure={measure} trend={trend} />
      </div>
      <RegionalImpact loading={zonesLoading} onSelect={setRegion} selectedRegion={validRegion} zones={zones} />
      <section className="workspace-panel workspace-impact-history workspace-reveal"><div className="workspace-impact-section-heading"><div><p>Histórico</p><h3>Histórico ambiental</h3></div><span>24 horas · 7 dias · 30 dias</span></div>{loading ? <Skeleton className="workspace-impact-history-skeleton" /> : trend?.valores?.length ? <p className="workspace-impact-history-note">O histórico disponível está representado na tendência ambiental acima.</p> : <EmptyState title="Histórico indisponível." description="A API não retornou leituras históricas para este período." />}</section>
      <ImpactAvailability />
    </section>
  );
}

