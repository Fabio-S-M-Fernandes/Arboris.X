import './ui.css';

export function EmptyState({ title = 'Nenhum dado disponível.', description }) {
  return <div className="arboris-state arboris-empty-state"><strong>{title}</strong>{description && <span>{description}</span>}</div>;
}
