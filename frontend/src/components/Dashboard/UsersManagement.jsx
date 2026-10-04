import { UserRound } from 'lucide-react';
import { Badge, Card, EmptyState, SectionHeader } from '../ui';

export function UsersManagement() {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="users-title">
      <Card className="workspace-admin-table-card">
        <SectionHeader eyebrow="Acesso à plataforma" title="Usuários" action={<Badge tone="muted">Serviço indisponível</Badge>} />
        <div className="workspace-admin-coming-soon"><UserRound size={18} aria-hidden="true" /><EmptyState title="Gerenciamento de usuários será habilitado quando o serviço administrativo estiver disponível." description="A tabela está preparada para nome, e-mail, função, status, último acesso e ações, sem criar usuários fictícios." /></div>
        <div className="workspace-admin-table-preview" aria-label="Colunas preparadas para usuários"><span>Nome</span><span>E-mail</span><span>Função</span><span>Status</span><span>Último acesso</span><span>Ação</span></div>
      </Card>
    </section>
  );
}
