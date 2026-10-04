import './ui.css';

export function Button({ variant = 'default', className = '', type = 'button', children, ...props }) {
  return <button type={type} className={`arboris-button arboris-button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}
