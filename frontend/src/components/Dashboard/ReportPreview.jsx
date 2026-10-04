import { Activity, Bell, Droplets, Leaf, ThermometerSun, Wifi } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, MetricCard, SectionHeader, StatusBadge } from '../ui';
import { AlertSummary } from './AlertSummary';
import { EnvironmentalTrend } from './EnvironmentalTrend';
import { RegionalImpact } from './RegionalImpact';
import { SensorTable } from './SensorTable';
import { NetworkStatus } from './NetworkStatus';
import { enrichAlert } from './alertUtils';
import { getReportPeriodLabel } from './reportConfig';
import { TODAS_AS_REGIOES } from './heatMapUtils';

const numberPt = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const hasValue = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const metricValue = (value, suffix = '', decimals = 0) => (hasValue(value) ? `${numberPt(value, decimals)}${suffix}` : 'Dados indisponíveis');

const indicatorIcons = {
  temperature: ThermometerSun,
  humidity: Droplets,
  sensors: Wifi,
  alerts: Bell,
  reduction: Leaf,
};

const indicatorDetails = {
  temperature: { title: 'Temperatura atual', value: (summary) => metricValue(summary?.temperaturaAtual, '°C', 1), detail: 'Leitura ambiental atual' },
  humidity: { title: 'Umidade do ar', value: (summary) => metricValue(summary?.umidadeAr, '%'), detail: 'Umidade registrada pela API', tone: 'blue' },
  sensors: { title: 'Sensores operacionais', value: (summary) => hasValue(summary?.sensoresAtivos) ? numberPt(summary.sensoresAtivos) : 'Dados indisponíveis', detail: 'Quantidade fornecida pela API', tone: 'lime' },
  alerts: { title: 'Alertas monitorados', value: (summary, alerts) => alerts.length, detail: 'Ocorrências retornadas pela API', tone: 'blue' },
  reduction: { title: 'Redução térmica', value: (summary) => metricValue(summary?.reducaoCalorPct, '%', 1), detail: 'Indicador fornecido pela API' },
};

function ReportAlertRows({ alerts, loading }) {
  if (loading) return <div className="workspace-report-alert-loading" aria-label="Carregando alertas"><span /><span /><span /></div>;
  if (!alerts.length) return <EmptyState title="Nenhum alerta retornado." description="A API não informou ocorrências para o contexto selecionado." />;

  return (
    <div className="workspace-report-alert-list">
      {alerts.slice(0, 5).map((alert) => (
        <div className="workspace-report-alert-row" key={alert.id}>
          <StatusBadge status={alert.tipo} />
          <div><strong>{alert.titulo || 'Ocorrência ambiental'}</strong><small>{alert.descricao || 'Descrição não disponível'}</small></div>
          <time>{alert.horario || '—'}</time>
        </div>
      ))}
    </div>
  );
}

export function ReportPreview({
  alerts,
  baseError,
  baseLoading,
  measure,
  onMeasureChange,
  onPeriodChange,
  onRegionChange,
  period,
  reportType,
  selectedIndicators,
  selectedRegion,
  sensors,
  summary,
  summaryError,
  summaryLoading,
  trend,
  zones,
}) {
  const reportAlerts = alerts.map((alert) => enrichAlert(alert, sensors));
  const visibleSensors = selectedRegion === TODAS_AS_REGIOES ? sensors : sensors.filter((sensor) => sensor.regiao === selectedRegion);
  const visibleZones = selectedRegion === TODAS_AS_REGIOES ? zones : zones.filter((zone) => zone.regiao === selectedRegion);
  const isLoading = baseLoading || summaryLoading;
  const error = baseError || summaryError;
  const isExecutive = reportType === 'executivo';
  const isSelected = (indicator) => selectedIndicators.includes(indicator);
  const reportLabel = isExecutive ? 'Relatório executivo' : 'Relatório operacional';

  return (
    <section className="workspace-report-preview-area" aria-label="Pré-visualização do relatório">
      <div className="workspace-report-preview-heading">
        <div><p>Pré-visualização</p><h2>{reportLabel}</h2><span>Representação com os dados disponíveis na API atual.</span></div>
        <Badge tone="success">Somente dados reais</Badge>
      </div>

      <Card as="article" className="workspace-report-document workspace-reveal">
        <header className="workspace-report-document-header">
          <div><span className="workspace-report-kicker">ARBORIS<span>.X</span></span><strong>Relatório ambiental</strong></div>
          <div className="workspace-report-document-context"><span>{getReportPeriodLabel(period)}</span><span>{selectedRegion}</span></div>
        </header>

        {error && <ErrorState title="Não foi possível preparar os dados do relatório." message={error} />}
        {!error && selectedIndicators.length === 0 && <EmptyState title="Não há dados suficientes para montar este relatório." description="Selecione ao menos um indicador na configuração ao lado." />}

        {selectedIndicators.length > 0 && (
          <>
            <section className="workspace-report-document-section">
              <SectionHeader eyebrow="Resumo" title={isExecutive ? 'Panorama executivo' : 'Leituras operacionais'} />
              <div className="workspace-report-metrics">
                {['temperature', 'humidity', 'sensors', 'reduction', 'alerts'].filter(isSelected).map((indicator) => {
                  const detail = indicatorDetails[indicator];
                  const Icon = indicatorIcons[indicator];
                  return <MetricCard key={indicator} loading={indicator === 'alerts' ? baseLoading : summaryLoading} icon={Icon} title={detail.title} value={detail.value(summary, reportAlerts)} detail={detail.detail} tone={detail.tone} />;
                })}
              </div>
            </section>

            {isSelected('trend') && (
              <section className="workspace-report-document-section">
                <EnvironmentalTrend data={trend} loading={summaryLoading} range={period} setRange={onPeriodChange} kind={measure} setKind={onMeasureChange} region={selectedRegion} className="workspace-report-embedded-chart" />
              </section>
            )}

            {isExecutive && isSelected('regional') && (
              <section className="workspace-report-document-section">
                <RegionalImpact loading={baseLoading} onSelect={onRegionChange} selectedRegion={selectedRegion} zones={visibleZones} />
              </section>
            )}

            {!isExecutive && isSelected('sensors') && (
              <section className="workspace-report-document-section">
                <SectionHeader eyebrow="Infraestrutura" title="Estado da rede" />
                <NetworkStatus loading={isLoading} sensors={visibleSensors} summary={summary} />
                <div className="workspace-report-table-wrap">
                  <SectionHeader eyebrow="Leituras" title="Sensores monitorados" />
                  <SensorTable error={baseError} loading={baseLoading} onChoose={() => undefined} sensors={visibleSensors} />
                </div>
              </section>
            )}

            {isSelected('alerts') && (
              <section className="workspace-report-document-section">
                <SectionHeader eyebrow="Monitoramento" title="Alertas relevantes" />
                <AlertSummary alerts={reportAlerts} loading={baseLoading} />
                <ReportAlertRows alerts={reportAlerts} loading={baseLoading} />
              </section>
            )}

            {isSelected('regional') && !isExecutive && (
              <section className="workspace-report-document-section">
                <RegionalImpact loading={baseLoading} onSelect={onRegionChange} selectedRegion={selectedRegion} zones={visibleZones} />
              </section>
            )}

            {!isExecutive && !isSelected('sensors') && <section className="workspace-report-document-section"><Card as="div" className="workspace-report-operational-note"><Activity size={16} aria-hidden="true" /><span>Para detalhar a operação da rede, selecione o indicador <strong>Sensores</strong>.</span></Card></section>}
          </>
        )}

        <footer className="workspace-report-document-footer"><span>Fonte: API atual do Arboris.X</span><span>Período: {getReportPeriodLabel(period)}</span></footer>
      </Card>
    </section>
  );
}
