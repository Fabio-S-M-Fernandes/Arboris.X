import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText } from 'lucide-react';
import './ModaisArboris.css';

const TERMS = [
  ['Cadastro e acesso', 'Para criar uma conta, você informa nome, e-mail e senha e confirma a leitura destes termos. A API usa esses dados para criar e autenticar sua conta. O acesso também pode ocorrer com uma conta Google verificada.'],
  ['Vinculação de identidade', 'Uma conta Arboris.X existente só é vinculada ao Google após a confirmação da senha da conta e de um código de seis dígitos enviado por e-mail. A simples coincidência de endereços de e-mail não vincula contas.'],
  ['Segurança de acesso', 'Após autenticar, o aplicativo pode reconhecer este navegador por um identificador aleatório em cookie protegido e enviar um aviso por e-mail quando ele for novo para a conta. Use apenas seus próprios dados e mantenha sua senha segura.'],
  ['Funcionamento e contato', 'O acesso depende da disponibilidade da aplicação e de sua API. Consulte a Política de Privacidade para saber como os dados são tratados. Nenhum canal de suporte está configurado nesta tela.'],
];

const PRIVACY = [
  ['Dados e autenticação', 'No cadastro, nome, e-mail e senha são enviados à API. O servidor armazena a senha como hash bcrypt e nunca a inclui nas respostas. O login exige senha e código de seis dígitos enviado por e-mail. O Login com Google envia um ID token ao backend, que valida a identidade e o e-mail verificado; o ID token não é armazenado, mas o identificador Google (sub), nome e e-mail da conta são mantidos. Vincular uma conta existente também exige senha e código.'],
['Reconhecimento de dispositivo', 'Após uma autenticação concluída, a aplicação usa o cookie arboris_device, com identificador aleatório e atributo HttpOnly, para reconhecer o navegador por até um ano. O servidor guarda apenas um resumo criptográfico do identificador, tipo do dispositivo, navegador, sistema operacional e datas do primeiro e último acesso; mantém até 25 dispositivos por conta. Um dispositivo novo pode gerar um aviso por e-mail.'],
['Localização e cookie', 'A aplicação não consulta um serviço de geolocalização nem armazena o endereço IP para reconhecer dispositivos. Por isso, avisos podem mostrar “Localização não identificada”. Em produção HTTPS, o cookie usa Secure e SameSite=None; em localhost, usa SameSite=Lax sem exigir certificado público.'],
  ['Sessão e armazenamento', 'O token de sessão fica no localStorage e é enviado à API no cabeçalho Authorization; JavaScript da página pode acessá-lo. As contas ficam em um arquivo JSON do servidor no caminho DATA_FILE. Em produção, configure HTTPS e restrinja o acesso e os backups desse arquivo.'],
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
