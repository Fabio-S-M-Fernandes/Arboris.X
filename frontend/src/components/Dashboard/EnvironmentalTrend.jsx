import { useState } from 'react';
import { Droplets, ThermometerSun } from 'lucide-react';
import { EmptyState, SectionHeader, Skeleton } from '../ui';

const PERIODOS_AMBIENTAIS = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const numeroLocal = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

export function EnvironmentalTrend({ data, loading, range, setRange, kind, setKind, region, className = '' }) {
  const [focusedPoint, setFocusedPoint] = useState(null);
  const values = data?.valores || [];

  const chartContent = (() => {
    if (loading) return <Skeleton className="workspace-trend-skeleton" />;
    if (values.length < 2) return <EmptyState title="Nenhuma tendência disponível." />;

    const low = Math.min(...values);
    const high = Math.max(...values);
    const padding = Math.max((high - low) * 0.18, kind === 'temperatura' ? 1 : 3);
    const points = values.map((value, index) => ({
      x: 42 + index * (676 / (values.length - 1)),
      y: 22 + ((high + padding - value) / (high - low + padding * 2)) * 148,
      value,
      label: data.horarios[index],
    }));
    const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
    const lastPoint = points[points.length - 1];
    const area = `${line} L ${lastPoint.x} 188 L ${points[0].x} 188 Z`;
    const selected = points[focusedPoint ?? points.length - 1];
    const unit = kind === 'temperatura' ? '°C' : '%';
    const trackPointer = (event) => {
      const { left, width } = event.currentTarget.getBoundingClientRect();
      const chartX = ((event.clientX - left) / width) * 760;
      const nearest = points.reduce((best, point, index) => Math.abs(point.x - chartX) < Math.abs(points[best].x - chartX) ? index : best, 0);
      setFocusedPoint(nearest);
    };

    return (
      <>
        <div className="workspace-chart-toolbar">
          <div className="workspace-switch" role="group" aria-label="Indicador do gráfico">
            <button type="button" onClick={() => { setKind('temperatura'); setFocusedPoint(null); }} aria-pressed={kind === 'temperatura'} className={kind === 'temperatura' ? 'is-selected' : ''}><ThermometerSun size={15} aria-hidden="true" />Temperatura</button>
            <button type="button" onClick={() => { setKind('umidade'); setFocusedPoint(null); }} aria-pressed={kind === 'umidade'} className={kind === 'umidade' ? 'is-selected' : ''}><Droplets size={15} aria-hidden="true" />Umidade</button>
          </div>
          <p><span />{numeroLocal(selected.value, 1)}{unit}<small>{selected.label}</small></p>
        </div>
        <svg className="workspace-chart-svg" viewBox="0 0 760 218" role="img" tabIndex="0" aria-label={`Tendência de ${kind} em ${data.rotulo}`} onPointerMove={trackPointer} onPointerLeave={() => setFocusedPoint(null)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          const current = focusedPoint ?? points.length - 1;
          setFocusedPoint(Math.max(0, Math.min(points.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
        }}>
          <defs>
            <linearGradient id="workspace-chart-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".2" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient>
            <linearGradient id="workspace-chart-line"><stop stopColor="#6ee7b7" /><stop offset="100%" stopColor="#a3e635" /></linearGradient>
          </defs>
          {[36, 72, 108, 144, 180].map((y) => <line key={y} x1="42" x2="718" y1={y} y2={y} className="workspace-chart-gridline" />)}
          <path d={area} fill="url(#workspace-chart-area)" />
          <path d={line} fill="none" stroke="url(#workspace-chart-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => <g key={point.label} className="workspace-chart-point" onPointerEnter={() => setFocusedPoint(index)}><circle cx={point.x} cy={point.y} r={index === (focusedPoint ?? points.length - 1) ? 6 : 3.5} /><text x={point.x} y="208" textAnchor="middle">{point.label}</text></g>)}
        </svg>
        <div className="workspace-chart-caption"><span>Dados do backend</span><span>{region}</span></div>
      </>
    );
  })();

  return (
    <section className={`workspace-panel workspace-chart workspace-reveal ${className}`.trim()}>
      <SectionHeader eyebrow="Tendência ambiental" title={kind === 'temperatura' ? 'Temperatura ambiental' : 'Umidade do ar'} action={(
        <label className="workspace-field"><span>Período</span><select value={range} onChange={(event) => { setRange(event.target.value); setFocusedPoint(null); }} aria-label="Período do gráfico">
          {PERIODOS_AMBIENTAIS.map((period) => <option value={period.value} key={period.value}>{period.label}</option>)}
        </select></label>
      )} />
      {chartContent}
    </section>
  );
}

