import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Badge, Card, ErrorState, SectionHeader, Skeleton, StatusBadge } from '../ui';

export function SecurityOverview({ currentUser, loading, error }) {
  return (
    <section className="workspace-admin-module workspace-reveal" aria-labelledby="security-title">
      <Card className="workspace-admin-security-card">
        <SectionHeader eyebrow="Proteção da plataforma" title="Segurança" action={<Badge tone="success">Sessão atual</Badge>} />
        {error && <ErrorState title="Não foi possível confirmar a sessão atual." message={error} />}
        <div className="workspace-admin-security-grid">
          <article><span><ShieldCheck size={17} aria-hidden="true" /></span><div><strong>Autenticação</strong><small>Login e cadastro existentes</small></div>{loading ? <Skeleton className="workspace-admin-status-skeleton" /> : <StatusBadge status={currentUser ? 'Ativa' : 'Indisponível'} />}</article>
          <article><span><LockKeyhole size={17} aria-hidden="true" /></span><div><strong>Sessão</strong><small>{currentUser ? `Sessão de ${currentUser.nome || currentUser.email}` : 'Sessão não confirmada'}</small></div>{loading ? <Skeleton className="workspace-admin-status-skeleton" /> : <StatusBadge status={currentUser ? 'Gerenciada' : 'Indisponível'} />}</article>
          <article><span><KeyRound size={17} aria-hidden="true" /></span><div><strong>Controle de acesso</strong><small>Preparação para RBAC</small></div><StatusBadge status="Sem classificação" /></article>
          <article><span><CheckCircle2 size={17} aria-hidden="true" /></span><div><strong>API de identidade</strong><small>{currentUser ? currentUser.email : 'Endpoint /auth/me'}</small></div><StatusBadge status={currentUser ? 'Ativa' : 'Indisponível'} /></article>
        </div>
        <p className="workspace-admin-security-note">A interface não aplica permissões por função nesta fase. O acesso continua seguindo a autenticação existente.</p>
      </Card>
    </section>
  );
}
