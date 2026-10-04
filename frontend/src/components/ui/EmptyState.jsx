import './ui.css';

export function EmptyState({ title = 'Nenhum dado disponível.', description }) {
  return <div className="arboris-state arboris-empty-state" role="status" aria-live="polite"><strong>{title}</strong>{description && <span>{description}</span>}</div>;
}
