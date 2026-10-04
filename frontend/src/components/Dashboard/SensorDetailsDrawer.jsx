import { Battery, Clock3, MapPin, X } from 'lucide-react';
import { EmptyState, StatusBadge } from '../ui';

const numeroLocal = (value, decimals = 0) => Number(value).toLocaleString('pt-BR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const formatTemperature = (value) => Number.isFinite(Number(value)) ? `${numeroLocal(value, 1)}°C` : 'Não disponível';

export function SensorDetailsDrawer({ sensor, onClose }) {
  if (!sensor) return null;

  const batteryValue = Number(sensor.bateria);
  const hasBattery = Number.isFinite(batteryValue);
  const normalizedBattery = hasBattery ? Math.max(0, Math.min(100, batteryValue)) : 0;

  return (
    <>
      <button type="button" tabIndex="-1" className="workspace-drawer-backdrop" onClick={onClose} aria-label="Fechar detalhes do sensor" />
      <aside className="workspace-sensor-drawer" role="dialog" aria-modal="true" aria-labelledby="sensor-drawer-title">
        <div className="workspace-drawer-header">
          <div><p>Detalhes do ponto</p><h2 id="sensor-drawer-title">{sensor.id}</h2></div>
          <button type="button" autoFocus className="workspace-icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={18} /></button>
        </div>
        <p className="workspace-detail-location"><MapPin size={15} aria-hidden="true" />{sensor.local}, {sensor.regiao}</p>
        <div className="workspace-drawer-status"><span>Status</span><StatusBadge status={sensor.estado || 'Indisponível'} /></div>
        <dl className="workspace-sensor-detail-grid">
          <div><dt>Temperatura</dt><dd>{formatTemperature(sensor.temperatura)}</dd></div>
          <div><dt>Umidade do ar</dt><dd>{sensor.umidade != null ? `${numeroLocal(sensor.umidade)}%` : 'Não disponível'}</dd></div>
          <div><dt><Clock3 size={13} aria-hidden="true" />Última atualização</dt><dd>{sensor.atualizacao || 'Não disponível'}</dd></div>
          {hasBattery && <div><dt><Battery size={13} aria-hidden="true" />Bateria</dt><dd>{numeroLocal(batteryValue)}%</dd></div>}
        </dl>
        {hasBattery && <div className="workspace-battery-track" aria-label={`Bateria ${numeroLocal(batteryValue)} por cento`}><span style={{ width: `${normalizedBattery}%` }} /></div>}
        <section className="workspace-sensor-history" aria-labelledby="sensor-history-title">
          <div className="workspace-drawer-section-heading"><p id="sensor-history-title">Histórico</p><small>Leituras individuais</small></div>
          <EmptyState title="Histórico detalhado indisponível." description="A API atual não fornece histórico individual para este sensor." />
        </section>
        <small className="workspace-drawer-source">Dados recebidos do backend atual.</small>
      </aside>
    </>
  );
}

