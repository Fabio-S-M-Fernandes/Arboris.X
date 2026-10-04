import './ui.css';

export function ErrorState({ title = 'Não foi possível carregar os dados.', message = 'Tente novamente em instantes.' }) {
  return <div className="arboris-state arboris-error-state" role="alert"><strong>{title}</strong><span>{message}</span></div>;
}
