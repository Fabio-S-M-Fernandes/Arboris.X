import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText } from 'lucide-react';
import './ModaisArboris.css';

const TERMS = [
  ['Conta e autenticação', 'A conta é autenticada pelo Supabase Auth. Você pode entrar com e-mail e senha ou usar o provedor Google. Quando necessário, o Arboris.X exige um código adicional enviado ao e-mail da conta para concluir o acesso.'],
  ['Uso seguro', 'Use apenas uma conta que pertença a você, mantenha suas credenciais em segurança e não compartilhe códigos de acesso. O código adicional é temporário e deve ser informado somente nesta aplicação.'],
  ['Serviços integrados', 'A autenticação e os dados da conta dependem dos serviços Supabase. O envio do código adicional depende do serviço de e-mail configurado pelo Arboris.X. A disponibilidade desses serviços pode afetar o acesso.'],
  ['Uso da plataforma', 'Não tente contornar controles de autenticação ou acessar dados de outras pessoas. O aceite destes termos é solicitado no cadastro e antes de continuar com Google.'],
];

const PRIVACY = [
  ['Conta e autenticação', 'O Supabase Auth recebe os dados necessários para autenticar a conta, como e-mail, senha ou identidade Google e nome informado no cadastro. A senha é tratada pelo provedor de autenticação; o fluxo atual do Arboris.X não a grava no arquivo JSON legado.'],
  ['Código de segurança', 'Quando uma confirmação adicional é necessária, o Arboris.X gera um código de seis dígitos, válido por cinco minutos, e o envia ao e-mail da conta pelo serviço de e-mail configurado. O banco armazena um resumo HMAC do código, além de dados de sessão, tentativas, limites de envio e eventos de segurança necessários ao controle de acesso.'],
  ['Dados e provedores', 'Os dados de autenticação são processados pelo Supabase. O banco de dados do projeto guarda perfis e registros necessários à autorização adicional. Para o código adicional, o serviço de e-mail configurado recebe o endereço e o conteúdo necessário para entregar a mensagem. Confirmação de cadastro e recuperação de senha são enviadas pelos serviços configurados no Supabase Auth. Registros históricos de versões anteriores ainda podem existir em armazenamento legado e não serão migrados sem validação de identidade.'],
  ['Sessões e armazenamento no navegador', 'A sessão Supabase é mantida no armazenamento local do navegador para permitir renovação de sessão; scripts executados na origem da aplicação podem acessá-la. O navegador também pode manter dados temporários do fluxo de autenticação. O recurso opcional de navegador confiável só pode ser usado quando estiver habilitado. Encerre a sessão ao terminar em computadores compartilhados.'],
  ['Retenção e direitos', 'Esta versão ainda não define prazos próprios de retenção. Os prazos dependem das configurações dos provedores e da consolidação do armazenamento legado. Para informações gerais ou solicitações sobre dados, escreva para arborisx@gmail.com. Os procedimentos de retenção e exercício de direitos precisam ser completados e aprovados pelo responsável antes da publicação.'],
];

const COOKIES = [
  ['Uso atual', 'A sessão de autenticação do Supabase é mantida no armazenamento local do navegador. O recurso opcional de dispositivo confiável, quando habilitado, usa um cookie de segurança para reconhecer este navegador após a verificação da conta.'],
  ['Preferências e dados temporários', 'A aplicação também pode guardar preferências de aparência e informações temporárias necessárias ao fluxo de acesso no armazenamento do navegador. Esses dados não representam medições do aparelho.'],
  ['Controle no navegador', 'Você pode encerrar a sessão e limpar os dados do site nas configurações do navegador. Isso pode exigir um novo login e remover preferências locais. Esta página descreve apenas o funcionamento atual da aplicação.'],
];

const RETURNS = [
  ['Escopo atual', 'Esta aplicação apresenta recursos de monitoramento ambiental e acesso à conta. Não há carrinho, pagamento, venda ou entrega de produtos pela interface Arboris.X.'],
  ['Solicitações', 'Como a aplicação não realiza vendas, não há um procedimento de troca ou devolução dentro dela. Para dúvidas relacionadas ao Arboris.X, escreva para arborisx@gmail.com e descreva sua solicitação sem compartilhar senhas ou códigos de acesso.'],
];

function ModalArboris({ isOpen, onClose, Icon, title, subtitle, sections }) {
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-modal')) || 300;
    closeTimerRef.current = window.setTimeout(() => {
      closingRef.current = false;
      setClosing(false);
      onClose();
    }, duration);
  };

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.scrollbarGutter;

    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    dialog.showModal();

    return () => {
      dialog.close();
      root.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`arboris-modal-overlay${closing ? ' is-closing' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      aria-busy={closing}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll('button, [tabindex="0"]');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && event.target === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && event.target === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="arboris-modal-content">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-frame" aria-hidden="true"><Icon className="modal-icon" /></span>
            <div>
              <p className="modal-eyebrow">ARBORIS.X</p>
              <h2 id={titleId}>{title}</h2>
              <p className="modal-description" id={descriptionId}>{subtitle}</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" aria-label="Fechar documento" onClick={requestClose}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body" tabIndex={0} role="region" aria-label={'Conteúdo de ' + title}>
          {sections.map(([heading, text], index) => (
            <section className="modal-section" key={heading}>
              <h3><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{heading}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
        <footer className="modal-footer">
          <span>ARBORIS<span>.X</span></span>
          <button type="button" className="modal-done-btn" onClick={requestClose}>Fechar documento</button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}

export function TermosModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={FileText} title="Termos de Uso" subtitle="Orientações para o uso da plataforma." sections={TERMS} />;
}

export function PrivacidadeModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={ShieldCheck} title="Política de Privacidade" subtitle="Informações sobre dados e privacidade." sections={PRIVACY} />;
}

export function CookiesModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={ShieldCheck} title="Política de Cookies" subtitle="Como o navegador é usado nesta versão do Arboris.X." sections={COOKIES} />;
}

export function TrocasDevolucoesModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={FileText} title="Trocas e devoluções" subtitle="Informações sobre o funcionamento atual da plataforma." sections={RETURNS} />;
}
