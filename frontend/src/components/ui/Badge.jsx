import './ui.css';

export function Badge({ tone = 'neutral', className = '', children }) {
  return <span className={`arboris-badge arboris-badge-${tone} ${className}`.trim()}>{children}</span>;
}
