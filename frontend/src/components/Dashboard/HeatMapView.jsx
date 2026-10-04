import { useMemo } from 'react';
import { SectionHeader, EmptyState, ErrorState, Skeleton } from '../ui';
import { HeatMapControls } from './HeatMapControls';
import { RegionComparison } from './RegionComparison';
import { RegionSummary } from './RegionSummary';
import { ThermalLegend } from './ThermalLegend';
import { PageHeader } from '../layout/PageHeader';
import { TODAS_AS_REGIOES, formatTemperature, formatUpdatedAt, getThermalLabel, getThermalLevel } from './heatMapUtils';

function HeatMapLoading() {
  return (
    <div className="workspace-heat-loading-grid" aria-label="Carregando mapa de calor">
      <section className="workspace-panel"><Skeleton className="workspace-heat-skeleton-title" /><Skeleton className="workspace-heat-skeleton-canvas" /></section>
      <aside className="workspace-panel"><Skeleton className="workspace-heat-skeleton-title" /><Skeleton className="workspace-heat-skeleton-summary" /></aside>
    </div>
  );
}

function HeatMapVisualization({ zones, selectedRegion, onSelect }) {
  return (
    <section className="workspace-panel workspace-heat-visualization workspace-reveal" aria-label="Distribuição térmica por região">
      <SectionHeader eyebrow="Distribuição térmica por região" title="Visualização espacial estrutural" action={<span className="workspace-heat-structural-badge">Sem coordenadas geográficas</span>} />
      <p className="workspace-heat-explanation">Representação regional baseada na intensidade térmica fornecida pela API. Não representa posições geográficas reais.</p>
      <div className="workspace-thermal-canvas">
        {zones.map((zone) => (
          <button type="button" key={zone.regiao} className={`workspace-thermal-zone is-${getThermalLevel(zone.nivel)} ${selectedRegion === zone.regiao ? 'is-selected' : ''}`} style={{ '--heat-strength': Math.max(0, Math.min(100, Number(zone.nivel) || 0)) / 100 }} onClick={() => onSelect(zone.regiao)} aria-pressed={selectedRegion === zone.regiao}>
            <span className="workspace-thermal-zone-heading"><span><i />{zone.regiao}</span><strong>{getThermalLabel(zone.nivel)}</strong></span>
            <strong className="workspace-thermal-zone-temperature">{formatTemperature(zone.temperatura)}</strong>
            <span className="workspace-thermal-zone-meta">{zone.sensores ?? 'Não disponível'} pontos monitorados</span>
            <span className="workspace-thermal-zone-meter"><i style={{ width: `${Math.max(0, Math.min(100, Number(zone.nivel) || 0))}%` }} /></span>
          </button>
        ))}
      </div>
      <ThermalLegend />
    </section>
  );
}

export function HeatMapView({ zones, loading, error, selectedRegion, selectedZone, setSelectedZone, setRegion, updatedAt }) {
  const regions = useMemo(() => [TODAS_AS_REGIOES, ...zones.map((zone) => zone.regiao)], [zones]);
  const validRegion = regions.includes(selectedRegion) ? selectedRegion : TODAS_AS_REGIOES;
  const activeZone = validRegion === TODAS_AS_REGIOES ? selectedZone : zones.find((zone) => zone.regiao === validRegion) || null;
  const totalPoints = zones.reduce((sum, zone) => sum + (Number(zone.sensores) || 0), 0);

  const selectRegion = (region) => {
    setRegion(region);
    setSelectedZone(region === TODAS_AS_REGIOES ? null : zones.find((zone) => zone.regiao === region) || null);
  };

  if (error) return <ErrorState title="Não foi possível carregar os dados térmicos." message={error} />;

  return (
    <section className="workspace-view workspace-heatmap-view">
      <PageHeader aside={<div className="workspace-heat-page-meta"><strong>{totalPoints} pontos monitorados</strong><small>Atualizado em {formatUpdatedAt(updatedAt)}</small></div>} description="Visualize a distribuição térmica das áreas monitoradas." eyebrow="Inteligência espacial" title="Mapa de calor urbano" />
      <HeatMapControls regions={regions} region={validRegion} setRegion={selectRegion} />
      {loading ? <HeatMapLoading /> : zones.length === 0 ? <EmptyState title="Nenhuma região disponível." description="A API não retornou dados para o mapa de calor." /> : <>
        <div className="workspace-heat-main-grid">
          <HeatMapVisualization onSelect={selectRegion} selectedRegion={activeZone?.regiao} zones={zones} />
          <RegionSummary updatedAt={updatedAt} zone={activeZone} zones={zones} />
        </div>
        <RegionComparison onSelect={selectRegion} selectedRegion={activeZone?.regiao} zones={zones} />
        <section className="workspace-panel workspace-regional-history workspace-reveal">
          <SectionHeader eyebrow="Análise temporal" title="Tendência da região" action={<span className="workspace-history-periods">24h · 7 dias · 30 dias</span>} />
          <EmptyState title="Histórico regional indisponível para esta fonte de dados." description="A API atual fornece o estado regional, mas não uma série histórica individual por região." />
        </section>
      </>}
    </section>
  );
}

