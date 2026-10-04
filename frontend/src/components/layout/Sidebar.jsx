import {
  Bell, Building2, FileText, Gauge, LayoutDashboard, Leaf, LogOut, Map, MapPinned,
  ShieldCheck, Wrench,
} from 'lucide-react';

const navigationGroups = [
  {
    label: 'Painel',
    items: [{ label: 'Visão geral', icon: LayoutDashboard, available: true }],
  },
  {
    label: 'Operações',
    items: [
      { label: 'Locais', icon: Building2, available: true },
      { label: 'Ambientes', icon: MapPinned, available: true },
      { label: 'Intervenções', icon: Wrench, available: true },
    ],
  },
  {
    label: 'Monitoramento',
    items: [
      { label: 'Sensores', icon: Gauge, available: true },
      { label: 'Mapa de calor', icon: Map, available: true },
      { label: 'Alertas', icon: Bell, available: true },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { label: 'Impacto', icon: Leaf, available: true },
      { label: 'Relatórios', icon: FileText, available: true },
    ],
  },
  {
    label: 'Sistema',
    items: [{ label: 'Administração', icon: ShieldCheck, available: true }],
  },
];

export function Sidebar({ activeSection, isOpen, onClose, onSectionChange, onLogout }) {
  return (
    <aside className={`workspace-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Menu principal">
      <a href="/dashboard" className="workspace-brand" onClick={(event) => { event.preventDefault(); onSectionChange('Visão geral'); }}>
        <span className="workspace-brand-icon"><Leaf size={20} /></span>
        <span><strong>ARBORIS<span>.X</span></strong><small>Inteligência ambiental</small></span>
      </a>

      <nav className="workspace-nav" aria-label="Seções do painel">
        {navigationGroups.map((group) => (
          <div className="workspace-nav-group" key={group.label}>
            <p className="workspace-sidebar-label">{group.label}</p>
            {group.items.map(({ label, icon: Icon, available = false }) => (
              <button
                key={label}
                className={`workspace-nav-item ${activeSection === label ? 'is-active' : ''} ${!available ? 'is-unavailable' : ''}`}
                disabled={!available}
                aria-disabled={!available}
                title={!available ? 'Disponível em uma próxima etapa' : undefined}
                onClick={() => {
                  if (available) {
                    onSectionChange(label);
                    onClose();
                  }
                }}
                aria-current={activeSection === label ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {!available && <small>Em breve</small>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="workspace-sidebar-bottom">
        <div className="workspace-status"><i /><span><strong>Monitoramento ativo</strong><small>API conectada</small></span></div>
        <div className="workspace-sidebar-user"><span className="workspace-avatar">AX</span><span><strong>Usuário atual</strong><small>Sessão ativa</small></span></div>
        <button className="workspace-signout" onClick={onLogout}><LogOut size={17} />Sair</button>
      </div>
    </aside>
  );
}
