import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui';
import { getDefaultIndicators } from './reportConfig';
import { ReportBuilder } from './ReportBuilder';
import { ReportPreview } from './ReportPreview';
import { RecentReports } from './RecentReports';
import { PageHeader } from '../layout/PageHeader';

const TODAS_AS_REGIOES = 'Todas as regiões';

export function ReportsView({
  alerts,
  baseError,
  baseLoading,
  measure,
  onMeasureChange,
  onRegionChange,
  onPeriodChange,
  period,
  regionOptions,
  selectedRegion,
  sensors,
  summary,
  summaryError,
  summaryLoading,
  trend,
  zones,
}) {
  const [reportType, setReportType] = useState('executivo');
  const [selectedIndicators, setSelectedIndicators] = useState(() => getDefaultIndicators('executivo'));
  const [generationState, setGenerationState] = useState('idle');
  const generationTimer = useRef(null);

  useEffect(() => () => {
    if (generationTimer.current) window.clearTimeout(generationTimer.current);
  }, []);

  const handleTypeChange = (type) => {
    setReportType(type);
    setSelectedIndicators(getDefaultIndicators(type));
    setGenerationState('idle');
  };

  const handleGenerate = () => {
    if (selectedIndicators.length === 0) {
      setGenerationState('error');
      return;
    }

    setGenerationState('loading');
    if (generationTimer.current) window.clearTimeout(generationTimer.current);
    generationTimer.current = window.setTimeout(() => setGenerationState('success'), 650);
  };

  const handleNew = () => {
    setReportType('executivo');
    setSelectedIndicators(getDefaultIndicators('executivo'));
    setGenerationState('idle');
    onPeriodChange('24h');
    onMeasureChange('temperatura');
  };

  return (
    <section className="workspace-view workspace-reports-view">
      <PageHeader aside={<Button variant="primary" onClick={handleNew}><span aria-hidden="true">＋</span>Novo relatório</Button>} description="Consolide os dados ambientais monitorados em relatórios operacionais e executivos." eyebrow="Inteligência ambiental" title="Relatórios" />

      <div className="workspace-report-layout">
        <ReportBuilder
          generationState={generationState}
          indicators={selectedIndicators}
          onGenerate={handleGenerate}
          onIndicatorChange={(indicators) => { setSelectedIndicators(indicators); setGenerationState('idle'); }}
          onNew={handleNew}
          onPeriodChange={onPeriodChange}
          onRegionChange={onRegionChange}
          onTypeChange={handleTypeChange}
          period={period}
          regions={regionOptions.length > 0 ? regionOptions : [TODAS_AS_REGIOES]}
          region={selectedRegion}
          reportType={reportType}
        />
        <ReportPreview
          alerts={alerts}
          baseError={baseError}
          baseLoading={baseLoading}
          measure={measure}
          onMeasureChange={onMeasureChange}
          onPeriodChange={onPeriodChange}
          onRegionChange={onRegionChange}
          period={period}
          reportType={reportType}
          selectedIndicators={selectedIndicators}
          selectedRegion={selectedRegion}
          sensors={sensors}
          summary={summary}
          summaryError={summaryError}
          summaryLoading={summaryLoading}
          trend={trend}
          zones={zones}
        />
      </div>

      <RecentReports />
    </section>
  );
}
