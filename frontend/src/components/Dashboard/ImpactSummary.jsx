import { Droplets, Leaf, ThermometerSun, Wifi } from 'lucide-react';
import { MetricCard } from '../ui';

const numeroLocal = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const formatTemperature = (value) => Number.isFinite(Number(value)) ? `${numeroLocal(value, 1)}°C` : 'Dados indisponíveis';

function getVariation(data, unit) {
  const values = data?.valores || [];
  if (values.length < 2) return null;
  const variation = values[values.length - 1] - values[0];
  if (variation === 0) return 'Sem variação no período';
  const arrow = variation < 0 ? '↓' : '↑';
  return `${arrow} ${numeroLocal(Math.abs(variation), 1)}${unit} no período`;
}

export function ImpactSummary({ summary, trend, measure, loading }) {
  const temperatureVariation = measure === 'temperatura' ? getVariation(trend, '°C') : null;
  const humidityVariation = measure === 'umidade' ? getVariation(trend, '%') : null;

  return (
    <section className="workspace-impact-summary" aria-label="Panorama ambiental">
      <MetricCard loading={loading} icon={ThermometerSun} title="Temperatura monitorada" value={summary ? formatTemperature(summary.temperaturaAtual) : 'Dados indisponíveis'} detail={temperatureVariation || 'Sem comparação disponível'} />
      <MetricCard loading={loading} icon={Droplets} title="Umidade média" value={summary ? `${numeroLocal(summary.umidadeAr)}%` : 'Dados indisponíveis'} detail={humidityVariation || 'Sem comparação disponível'} tone="blue" />
      <MetricCard loading={loading} icon={Wifi} title="Sensores operacionais" value={summary?.sensoresAtivos ?? 'Dados indisponíveis'} detail="Quantidade fornecida pela API" tone="lime" />
      <MetricCard loading={loading} icon={Leaf} title="Redução térmica" value={summary ? `${numeroLocal(summary.reducaoCalorPct, 1)}%` : 'Dados indisponíveis'} detail="Indicador fornecido pela API" />
    </section>
  );
}

