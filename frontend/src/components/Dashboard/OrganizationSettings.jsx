import { Building2, Clock3, Globe2, Image, Save } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../ui';
import { useState } from 'react';

export function OrganizationSettings() {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  const startEditing = () => {
    setEditing(true);
    setMessage('A edição visual está preparada, mas ainda não está conectada ao serviço administrativo.');
  };

  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="organization-title">
      <Card className="workspace-admin-organization">
        <SectionHeader eyebrow="Estrutura principal" title="Organização" action={<Badge tone="muted">Não conectada</Badge>} />
        <EmptyState title="Dados da organização ainda não estão disponíveis." description="O backend atual não fornece nome, identificador, unidades ou configurações corporativas." />
        <div className="workspace-admin-form-preview" aria-label="Configurações organizacionais preparadas">
          <div className="workspace-admin-form-preview-heading"><div><p>Configurações futuras</p><h3>Perfil da organização</h3></div><Button onClick={startEditing}>{editing ? 'Modo de edição' : 'Editar configurações'}</Button></div>
          <div className="workspace-admin-form-grid">
            <label><Building2 size={14} aria-hidden="true" /><span>Nome da organização</span><input disabled placeholder="Aguardando serviço administrativo" /></label>
            <label><Image size={14} aria-hidden="true" /><span>Logo</span><input disabled placeholder="Aguardando serviço administrativo" /></label>
            <label><Clock3 size={14} aria-hidden="true" /><span>Fuso horário</span><input disabled placeholder="Aguardando serviço administrativo" /></label>
            <label><Globe2 size={14} aria-hidden="true" /><span>Idioma</span><input disabled placeholder="Aguardando serviço administrativo" /></label>
          </div>
          <div className="workspace-admin-form-footer"><span>Configurações ambientais corporativas também dependerão de um endpoint administrativo.</span>{editing && <span role="status">{message}</span>}<Button disabled><Save size={14} aria-hidden="true" />Salvar alterações</Button></div>
        </div>
      </Card>
    </section>
  );
}
