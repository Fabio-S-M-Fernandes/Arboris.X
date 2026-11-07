import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Breadcrumb({ items = [], section, title, onOpenMobileMenu }) {
  const breadcrumbItems = items.length > 0 ? items : [{ label: section, path: '/dashboard' }];

  return (
    <div className="workspace-header-title">
      <button className="workspace-icon-button workspace-mobile-button" onClick={onOpenMobileMenu} aria-label="Abrir menu">
        <Menu size={19} />
      </button>
      <div>
        <nav className="workspace-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard">ARBORIS.X</Link>
          {breadcrumbItems.map((item, index) => (
            <span className="workspace-breadcrumb-item" key={`${item.path}-${item.label}`}>
              <span aria-hidden="true">/</span>
              {index === breadcrumbItems.length - 1 ? <strong>{item.label}</strong> : <Link to={item.path}>{item.label}</Link>}
            </span>
          ))}
        </nav>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
