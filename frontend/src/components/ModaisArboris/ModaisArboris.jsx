import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText } from 'lucide-react';
import { DOCUMENTS } from './documentos';
import './ModaisArboris.css';

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
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={FileText} {...DOCUMENTS.terms} />;
}

export function PrivacidadeModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={ShieldCheck} {...DOCUMENTS.privacy} />;
}

export function CookiesModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={ShieldCheck} {...DOCUMENTS.cookies} />;
}

export function TrocasDevolucoesModal({ isOpen, onClose }) {
  return <ModalArboris isOpen={isOpen} onClose={onClose} Icon={FileText} {...DOCUMENTS.returns} />;
}
