import { Building2, Cable, KeyRound, ListChecks, Network, ShieldCheck, Users } from 'lucide-react';

const ADMIN_MODULES = [
  { value: 'Organização', label: 'Organização', icon: Building2 },
  { value: 'Unidades', label: 'Unidades', icon: Network },
  { value: 'Usuários', label: 'Usuários', icon: Users },
  { value: 'Funções e permissões', label: 'Funções e permissões', icon: KeyRound },
  { value: 'Integrações', label: 'Integrações', icon: Cable },
  { value: 'Segurança', label: 'Segurança', icon: ShieldCheck },
  { value: 'Registro de atividade', label: 'Registro de atividade', icon: ListChecks },
];

export function AdministrationNav({ activeModule, onChange }) {
  return (
    <nav className="workspace-admin-nav workspace-reveal" aria-label="Navegação administrativa" role="tablist">
      {ADMIN_MODULES.map(({ icon: Icon, label, value }) => (
        <button type="button" role="tab" aria-selected={activeModule === value} className={activeModule === value ? 'is-active' : ''} key={value} onClick={() => onChange(value)}>
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
