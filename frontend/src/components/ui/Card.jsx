import './ui.css';

export function Card({ as: Element = 'section', className = '', children, ...props }) {
  return <Element className={`arboris-card ${className}`.trim()} {...props}>{children}</Element>;
}
