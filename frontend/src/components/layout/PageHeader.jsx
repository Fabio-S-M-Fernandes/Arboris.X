export function PageHeader({ eyebrow, title, description, aside, className = '' }) {
  return (
    <div className={`workspace-view-heading workspace-reveal ${className}`.trim()}>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
      {aside}
    </div>
  );
}
