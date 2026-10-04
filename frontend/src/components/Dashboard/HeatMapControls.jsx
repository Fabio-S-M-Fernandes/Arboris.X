import { Badge, Select } from '../ui';
import { TODAS_AS_REGIOES } from './heatMapUtils';

export function HeatMapControls({ regions, region, setRegion }) {
  return (
    <section className="workspace-panel workspace-heat-controls workspace-reveal" aria-label="Controles do mapa de calor">
      <Select label="Região" value={region} onChange={(event) => setRegion(event.target.value)}>
        {regions.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select label="Período" value="24h" disabled onChange={() => {}}>
        <option value="24h">24 horas</option>
      </Select>
      <Select label="Camada" value="temperatura" disabled onChange={() => {}}>
        <option value="temperatura">Temperatura</option>
      </Select>
      <Badge tone="muted" className="workspace-heat-source">Dados regionais da API</Badge>
      {region === TODAS_AS_REGIOES && <span className="workspace-heat-control-note">Selecione uma região para abrir o resumo.</span>}
    </section>
  );
}

