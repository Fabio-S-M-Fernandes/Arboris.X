import { Bell, Clock3, Droplets, Map, MapPin, ThermometerSun, Wifi, X } from 'lucide-react';
import { Button, EmptyState, StatusBadge } from '../ui';
import { formatLocationHumidity, formatLocationTemperature } from './operationsUtils';

export function LocationDetailsDrawer({ location, onClose, onSelectSensor, onViewAlerts, onViewMap, onViewSensors, canViewMap }) {
  if (!location) return null;

  return (
    <>
      <button type="button" tabIndex="-1" className="workspace-drawer-backdrop" onClick={onClose} aria-label="Fechar detalhes do local" />
      <aside className="workspace-location-drawer" role="dialog" aria-modal="true" aria-labelledby="location-drawer-title">
        <div className="workspace-drawer-header">
          <div><p>Detalhes do local</p><h2 id="location-drawer-title">{location.name}</h2></div>
          <button type="button" autoFocus className="workspace-icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={18} /></button>
        </div>
        <p className="workspace-detail-location"><MapPin size={15} aria-hidden="true" />{location.region}</p>
        <div className="workspace-drawer-status"><span>Status operacional</span><StatusBadge status={location.status} /></div>
        <dl className="workspace-location-detail-grid">
          <div><dt><ThermometerSun size={13} aria-hidden="true" />Temperatura</dt><dd>{formatLocationTemperature(location.temperature)}</dd></div>
          <div><dt><Droplets size={13} aria-hidden="true" />Umidade</dt><dd>{formatLocationHumidity(location.humidity)}</dd></div>
          <div><dt><Wifi size={13} aria-hidden="true" />Sensores</dt><dd>{location.sensors.length}</dd></div>
          <div><dt><Clock3 size={13} aria-hidden="true" />Atualização</dt><dd>{location.updatedAt}</dd></div>
        </dl>
        <div className="workspace-location-drawer-actions">
          {location.sensors.length > 0 && <Button onClick={() => onViewSensors(location)}><Wifi size={14} aria-hidden="true" />Ver sensores</Button>}
          {location.alerts.length > 0 && <Button onClick={() => onViewAlerts(location)}><Bell size={14} aria-hidden="true" />Ver alertas ({location.alerts.length})</Button>}
          {canViewMap && <Button onClick={() => onViewMap(location)}><Map size={14} aria-hidden="true" />Ver no mapa</Button>}
        </div>

        <section className="workspace-location-sensors" aria-labelledby="location-sensors-title">
          <div className="workspace-drawer-section-heading"><p id="location-sensors-title">Sensores do local</p><small>{location.sensors.length} associados</small></div>
          {location.sensors.length === 0 ? <EmptyState title="Nenhum sensor associado." description="A fonte atual não relacionou sensores a este local." /> : <div className="workspace-location-sensor-list">
            {location.sensors.map((sensor) => <button type="button" className="workspace-location-sensor" key={sensor.id} onClick={() => onSelectSensor(sensor)}><span><strong>{sensor.id}</strong><small>{sensor.local}</small></span><span><strong>{formatLocationTemperature(sensor.temperatura)}</strong><StatusBadge status={sensor.estado || 'Indisponível'} /></span></button>)}
          </div>}
        </section>
        <small className="workspace-drawer-source">Dados agrupados a partir dos sensores do backend atual.</small>
      </aside>
    </>
  );
}
