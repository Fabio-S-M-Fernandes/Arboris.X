import './ui.css';

export function Skeleton({ className = '', ...props }) {
  return <span className={`arboris-skeleton ${className}`.trim()} aria-hidden="true" {...props} />;
}
