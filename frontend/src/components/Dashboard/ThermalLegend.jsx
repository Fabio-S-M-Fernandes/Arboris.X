export function ThermalLegend() {
  return (
    <div className="workspace-thermal-legend" aria-label="Legenda de intensidade térmica">
      <span><i className="is-cool" />Mais ameno</span>
      <span><i className="is-intermediate" />Intermediário</span>
      <span><i className="is-hot" />Mais quente</span>
      <small>A intensidade também é indicada por texto e nível.</small>
    </div>
  );
}

