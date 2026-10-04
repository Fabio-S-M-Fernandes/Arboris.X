import { ArrowRight, Bell, Droplets, Map, MapPin, ThermometerSun, Wifi } from 'lucide-react';
import { Badge, Button, Card, StatusBadge } from '../ui';
import { formatLocationHumidity, formatLocationTemperature } from './operationsUtils';

export function LocationCard({ location, onDetails, onViewAlerts, onViewMap, onViewSensors, canViewMap }) {
  return (
    <Card as="article" className="workspace-location-card workspace-reveal">
      <div className="workspace-location-card-header">
        <div className="workspace-location-name"><span className="workspace-location-icon"><MapPin size={16} aria-hidden="true" /></span><div><h3>{location.name}</h3><span>{location.region}</span></div></div>
        <StatusBadge status={location.status} />
      </div>

      <div className="workspace-location-metrics">
        <div><ThermometerSun size={14} aria-hidden="true" /><span>Temperatura</span><strong>{formatLocationTemperature(location.temperature)}</strong></div>
        <div><Droplets size={14} aria-hidden="true" /><span>Umidade</span><strong>{formatLocationHumidity(location.humidity)}</strong></div>
        <div><Wifi size={14} aria-hidden="true" /><span>Sensores</span><strong>{location.sensors.length}</strong></div>
      </div>

      <div className="workspace-location-card-meta"><span>Última atualização</span><time>{location.updatedAt}</time></div>
      <div className="workspace-location-card-actions">
        <Button variant="primary" onClick={() => onDetails(location)}><span>Ver detalhes</span><ArrowRight size={14} aria-hidden="true" /></Button>
        {location.sensors.length > 0 && <button type="button" className="workspace-text-action" onClick={() => onViewSensors(location)}><Wifi size={13} aria-hidden="true" />Ver sensores</button>}
        {location.alerts.length > 0 && <button type="button" className="workspace-text-action is-warning" onClick={() => onViewAlerts(location)}><Bell size={13} aria-hidden="true" />{location.alerts.length} {location.alerts.length === 1 ? 'alerta' : 'alertas'}</button>}
        {canViewMap && <button type="button" className="workspace-text-action" onClick={() => onViewMap(location)}><Map size={13} aria-hidden="true" />Ver no mapa</button>}
      </div>
      <Badge tone="muted" className="workspace-location-source">Fonte: sensores ambientais atuais</Badge>
    </Card>
  );
}
