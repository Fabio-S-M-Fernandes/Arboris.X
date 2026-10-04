import { Check, FileText, LoaderCircle, Plus } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Select } from '../ui';
import {
  REPORT_INDICATORS,
  REPORT_PERIODS,
  REPORT_TYPES,
} from './reportConfig';

const generationCopy = {
  idle: null,
  loading: 'Preparando relatório...',
  success: 'Relatório preparado. Exportação de arquivo será disponibilizada na próxima etapa.',
  error: 'Não foi possível preparar o relatório. Selecione ao menos um indicador.',
};

export function ReportBuilder({
  generationState,
  indicators,
  onGenerate,
  onIndicatorChange,
  onNew,
  onPeriodChange,
  onRegionChange,
  onTypeChange,
  period,
  regions,
  reportType,
  region,
}) {
  const toggleIndicator = (indicator) => {
    const nextIndicators = indicators.includes(indicator)
      ? indicators.filter((item) => item !== indicator)
      : [...indicators, indicator];
    onIndicatorChange(nextIndicators);
  };

  return (
    <Card as="section" className="workspace-report-builder workspace-reveal">
      <SectionHeader
        eyebrow="Configuração"
        title="Gerar relatório"
        action={<Badge tone="muted">Dados da API</Badge>}
      />

      <fieldset className="workspace-report-fieldset">
        <legend>Tipo de relatório</legend>
        <div className="workspace-report-type-grid">
          {REPORT_TYPES.map((type) => (
            <label className={`workspace-report-type-option ${reportType === type.value ? 'is-selected' : ''}`} key={type.value}>
              <input
                type="radio"
                name="report-type"
                value={type.value}
                checked={reportType === type.value}
                onChange={() => onTypeChange(type.value)}
              />
              <span className="workspace-report-type-check" aria-hidden="true"><Check size={13} /></span>
              <span><strong>{type.label}</strong><small>{type.description}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="workspace-report-filters">
        <Select label="Período" value={period} onChange={(event) => onPeriodChange(event.target.value)}>
          {REPORT_PERIODS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
        </Select>
        <Select label="Região" value={region} onChange={(event) => onRegionChange(event.target.value)}>
          {regions.map((item) => <option value={item} key={item}>{item}</option>)}
        </Select>
      </div>

      <fieldset className="workspace-report-fieldset workspace-report-indicators">
        <legend>Indicadores</legend>
        <div className="workspace-report-indicator-grid">
          {REPORT_INDICATORS.map((indicator) => {
            const selected = indicators.includes(indicator.value);
            return (
              <label className={`workspace-report-indicator ${selected ? 'is-selected' : ''}`} key={indicator.value}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleIndicator(indicator.value)}
                />
                <span className="workspace-report-indicator-check" aria-hidden="true"><Check size={12} /></span>
                <span><strong>{indicator.label}</strong><small>{indicator.description}</small></span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="workspace-report-builder-actions">
        <Button variant="primary" onClick={onGenerate} disabled={generationState === 'loading'}>
          {generationState === 'loading' ? <LoaderCircle size={16} className="workspace-spin" aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
          {generationState === 'loading' ? 'Preparando...' : 'Gerar relatório'}
        </Button>
        <Button onClick={onNew}><Plus size={15} aria-hidden="true" />Novo relatório</Button>
      </div>

      {generationCopy[generationState] && (
        <p className={`workspace-report-generation-message is-${generationState}`} role={generationState === 'error' ? 'alert' : 'status'}>
          {generationCopy[generationState]}
        </p>
      )}
    </Card>
  );
}
