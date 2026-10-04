import './ui.css';

export function Select({ label, className = '', children, ...props }) {
  return (
    <label className={`arboris-form-field ${className}`.trim()}>
      {label && <span>{label}</span>}
      <select {...props}>{children}</select>
    </label>
  );
}
