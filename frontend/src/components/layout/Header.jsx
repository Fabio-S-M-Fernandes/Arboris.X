import { AlertTriangle, Bell, Check, CheckCircle2, MapPin, X } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';

export function Header({
  activeSection,
  alerts,
  onCloseNotifications,
  onMarkAllRead,
  onOpenMobileMenu,
  onToggleNotifications,
  pageTitle,
  notificationsOpen,
  regionOptions,
  selectedRegion,
  setSelectedRegion,
}) {
  const unreadCount = alerts.filter((alert) => alert.naoLido).length;

  return (
    <header className="workspace-header">
      <Breadcrumb section={activeSection} title={pageTitle} onOpenMobileMenu={onOpenMobileMenu} />
      <div className="workspace-header-actions">
        <label className="workspace-field workspace-region"><MapPin size={15} /><span className="sr-only">Região</span><select aria-label="Filtrar por região" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>{regionOptions.map((region) => <option key={region}>{region}</option>)}</select></label>
        <span className="workspace-demo-badge"><i />Dados em tempo real</span>
        <div className="workspace-notification-wrap">
          <button className="workspace-icon-button" aria-label={`Avisos${unreadCount ? `, ${unreadCount} não lidos` : ''}`} aria-expanded={notificationsOpen} onClick={onToggleNotifications}><Bell size={18} />{unreadCount > 0 && <span className="workspace-notification-count">{unreadCount}</span>}</button>
          {notificationsOpen && <section className="workspace-notification-panel" aria-label="Avisos do painel">
            <div className="workspace-notification-title"><div><p>Acompanhamento</p><h2>Avisos</h2></div><button className="workspace-icon-button" onClick={onCloseNotifications} aria-label="Fechar avisos"><X size={17} /></button></div>
            {unreadCount > 0 && <button className="workspace-mark-read" onClick={onMarkAllRead}><Check size={14} />Marcar todos como lidos</button>}
            <div className="workspace-alert-list">{alerts.map((alert) => <article className={`workspace-alert ${alert.naoLido ? '' : 'is-read'}`} key={alert.id}><span className={alert.tipo === 'Atenção' ? 'is-warning' : ''}>{alert.tipo === 'Atenção' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}</span><div><strong>{alert.titulo}</strong><p>{alert.descricao}</p><small>{alert.horario}</small></div></article>)}</div>
          </section>}
        </div>
        <span className="workspace-avatar" aria-label="Perfil da comunidade">AX</span>
      </div>
    </header>
  );
}
