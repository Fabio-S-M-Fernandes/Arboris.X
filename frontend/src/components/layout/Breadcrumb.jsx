import { Menu } from 'lucide-react';

export function Breadcrumb({ section, title, onOpenMobileMenu }) {
  return (
    <div className="workspace-header-title">
      <button className="workspace-icon-button workspace-mobile-button" onClick={onOpenMobileMenu} aria-label="Abrir menu">
        <Menu size={19} />
      </button>
      <div>
        <p>ARBORIS.X <span>/</span> {section}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
