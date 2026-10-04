import { Battery, Clock3, Droplets, ThermometerSun, X } from 'lucide-react';
import { Badge, Button, EmptyState, StatusBadge } from '../ui';
import { formatAlertValue, getAlertStatus } from './alertUtils';

export function AlertDetailsDrawer({ alert, onClose, onRecognize, onViewSensor, onViewRegion, recognizing }) {
  if (!alert) return null;
  const hasAdditionalContext = [alert.temperatura, alert.umidade, alert.bateria].some((value) => Number.isFinite(Number(value)));

  return (
    <>
      <button type="button" tabIndex="-1" className="workspace-drawer-backdrop" onClick={onClose} aria-label="Fechar detalhes do alerta" />
      <aside className="workspace-alert-drawer" role="dialog" aria-modal="true" aria-labelledby="alert-drawer-title">
        <div className="workspace-drawer-header"><div><p>Detalhes da ocorrência</p><h2 id="alert-drawer-title">{alert.titulo || 'Alerta ambiental'}</h2></div><button type="button" autoFocus className="workspace-icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={18} /></button></div>
        <div className="workspace-alert-drawer-type"><StatusBadge status={alert.tipo || 'Não disponível'} /><Badge tone={alert.naoLido ? 'warning' : 'success'}>{getAlertStatus(alert)}</Badge></div>
        <dl className="workspace-alert-detail-grid">
          <div><dt>Tipo</dt><dd>{alert.tipo || 'Não disponível'}</dd></div>
          <div><dt>Status</dt><dd>{getAlertStatus(alert)}</dd></div>
          <div><dt>Local</dt><dd>{alert.local || 'Não disponível'}</dd></div>
          <div><dt>Sensor</dt><dd>{alert.sensorId || 'Não disponível'}</dd></div>
          <div><dt>Região</dt><dd>{alert.regiao || 'Não disponível'}</dd></div>
          <div><dt><Clock3 size={13} aria-hidden="true" />Data/hora</dt><dd>{alert.horario || 'Não disponível'}</dd></div>
        </dl>
        <section className="workspace-alert-description"><p>Descrição</p><span>{alert.descricao || 'Não disponível'}</span></section>
        <section className="workspace-alert-context"><div className="workspace-drawer-section-heading"><p>Contexto</p><small>Dados disponíveis</small></div>
          <div className="workspace-alert-context-grid">
            <div><ThermometerSun size={14} aria-hidden="true" /><span>Temperatura</span><strong>{formatAlertValue(alert.temperatura, '°C')}</strong></div>
            <div><Droplets size={14} aria-hidden="true" /><span>Umidade</span><strong>{formatAlertValue(alert.umidade, '%')}</strong></div>
            <div><Battery size={14} aria-hidden="true" /><span>Bateria</span><strong>{formatAlertValue(alert.bateria, '%')}</strong></div>
          </div>
          {!hasAdditionalContext && <EmptyState title="Contexto adicional não disponível." description="A fonte atual não fornece mais informações para esta ocorrência." />}
        </section>
        <div className="workspace-alert-actions">
          {alert.sensorId && <Button onClick={() => onViewSensor(alert.sensorId)}>Ver sensor</Button>}
          {alert.regiao && <Button onClick={() => onViewRegion(alert.regiao)}>Ver no mapa</Button>}
          {alert.naoLido ? <Button variant="primary" disabled={recognizing} onClick={() => onRecognize(alert)}>{recognizing ? 'Reconhecendo...' : 'Reconhecer alerta'}</Button> : <Badge tone="success">Alerta reconhecido</Badge>}
        </div>
        <small className="workspace-drawer-source">Dados recebidos da API atual.</small>
      </aside>
    </>
  );
}

