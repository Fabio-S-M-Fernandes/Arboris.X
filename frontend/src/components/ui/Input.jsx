import './ui.css';

export function Input({ label, className = '', ...props }) {
  return (
    <label className={`arboris-form-field ${className}`.trim()}>
      {label && <span>{label}</span>}
      <input {...props} />
    </label>
  );
}
