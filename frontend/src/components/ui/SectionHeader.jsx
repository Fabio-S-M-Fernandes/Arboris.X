import './ui.css';

export function SectionHeader({ eyebrow, title, action, className = '' }) {
  return <div className={`workspace-panel-title arboris-section-header ${className}`.trim()}><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>;
}
