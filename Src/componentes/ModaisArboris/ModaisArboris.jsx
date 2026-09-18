import { X, ShieldCheck, FileText } from 'lucide-react';
import './ModaisArboris.css';

export function TermosModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="arboris-modal-overlay" onClick={onClose}>
      <div className="arboris-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="scanline"></div>
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText className="modal-icon" />
            <h2>Termos de Uso — Arboris.X</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body custom-scrollbar">
          <p><strong>1. Aceitação dos Termos</strong><br />Ao acessar e utilizar a plataforma Arboris.X, você concorda com os termos e diretrizes de operação do sistema holográfico e simulação ambiental.</p>
          <br />
          <p><strong>2. Uso da Identidade</strong><br />O usuário é responsável por manter a segurança de suas credenciais de acesso e dados simulados inseridos no ambiente de testes.</p>
          <br />
          <p><strong>3. Escopo do Sistema</strong><br />O Arboris.X opera atualmente focado em simulações de interface holográfica e telemetria visual, com componentes de API externos desativados para este ambiente de demonstração.</p>
          <br />
          <p><strong>4. Modificações</strong><br />Estes termos podem ser atualizados a qualquer momento para refletir melhorias na arquitetura e segurança da rede.</p>
        </div>
      </div>
    </div>
  );
}

export function PrivacidadeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="arboris-modal-overlay" onClick={onClose}>
      <div className="arboris-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="scanline"></div>
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck className="modal-icon" />
            <h2>Política de Privacidade — Arboris.X</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body custom-scrollbar">
          <p><strong>1. Coleta de Dados</strong><br />Como este ambiente é voltado para simulação frontend e testes de interface, nenhum dado sensível real é transmitido para servidores externos sem consentimento explícito.</p>
          <br />
          <p><strong>2. Armazenamento Local</strong><br />Configurações de sessão e preferências visuais podem ser armazenadas temporariamente no cache local do seu navegador para otimizar a experiência holográfica.</p>
          <br />
          <p><strong>3. Segurança da Informação</strong><br />Adotamos padrões rígidos de criptografia visual e boas práticas alinhadas a auditorias de rede para proteger o fluxo de navegação na plataforma.</p>
          <br />
          <p><strong>4. Contato</strong><br />Dúvidas sobre os protocolos de privacidade podem ser direcionadas ao administrador do sistema através do painel de controle principal.</p>
        </div>
      </div>
    </div>
  );
}