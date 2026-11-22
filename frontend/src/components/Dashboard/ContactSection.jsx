import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clipboard, Mail, Send } from 'lucide-react';
import { sendContactMessage } from '../../lib/api';
import './ContactSection.css';

const ADDRESS = 'arborisx@gmail.com';
const CATEGORIES = ['Dúvidas sobre o projeto', 'Sugestões', 'Problemas técnicos', 'Conta e acesso', 'Segurança e privacidade', 'Outros assuntos'];

export default function ContactSection({ sessionUser }) {
  const [fields, setFields] = useState({
    name: sessionUser?.userMetadata?.full_name || sessionUser?.userMetadata?.name || '',
    email: sessionUser?.email || '', subject: '', category: '', message: '',
  });
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [copied, setCopied] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  const rootRef = useRef(null);
  useEffect(() => {
    mounted.current = true;
    const visibility = () => rootRef.current?.toggleAttribute('data-hidden', document.visibilityState === 'hidden');
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const update = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
  };
  const mailto = `mailto:${ADDRESS}?subject=${encodeURIComponent(`[Arboris.X — Contato] ${fields.category || 'Mensagem'} — ${fields.subject || 'Contato'}`)}&body=${encodeURIComponent(`Nome: ${fields.name}\nE-mail para resposta: ${fields.email}\nCategoria: ${fields.category}\n\n${fields.message}`)}`;
  const submit = async (event) => {
    event.preventDefault();
    if (sending.current) return;
    if (!fields.name.trim() || !fields.email.trim() || !fields.subject.trim() || !fields.category || !fields.message.trim()) {
      setStatus({ type: 'error', message: 'Preencha os campos obrigatórios.' }); return;
    }
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(fields.email.trim())) {
      setStatus({ type: 'error', message: 'Informe um e-mail válido.' }); return;
    }
    if (fields.name.trim().length < 2 || fields.name.length > 120 || fields.subject.trim().length < 2
      || fields.subject.length > 160 || fields.message.trim().length < 10 || fields.message.length > 4000) {
      setStatus({ type: 'error', message: 'Revise os campos informados.' }); return;
    }
    sending.current = true;
    setStatus({ type: 'loading', message: 'Enviando mensagem…' });
    try {
      await sendContactMessage(fields);
      if (mounted.current) {
        setStatus({ type: 'success', message: 'Mensagem enviada com sucesso.' });
        setFields((current) => ({ ...current, subject: '', category: '', message: '' }));
      }
    } catch (error) {
      if (mounted.current) setStatus({
        type: 'error',
        message: error.status === 429 ? 'Aguarde um momento antes de enviar outra mensagem.'
          : error.status === 401 || error.status === 403 ? 'Seu acesso precisa ser confirmado novamente.'
            : error.code === 'CONTACT_INVALID_EMAIL' ? 'Informe um e-mail válido.'
              : error.code === 'CONTACT_INCOMPLETE' ? 'Preencha os campos obrigatórios.'
                : 'Não foi possível enviar. Tente novamente.',
      });
    } finally { sending.current = false; }
  };
  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(ADDRESS); setCopied(true); }
    catch { setCopied(false); setStatus({ type: 'error', message: 'Não foi possível copiar. Selecione o endereço exibido abaixo.' }); }
  };
  const tilt = (event) => {
    if (event.pointerType !== 'mouse' || document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--contact-tilt-x', `${((event.clientY - bounds.top) / bounds.height - .5) * -8}deg`);
    event.currentTarget.style.setProperty('--contact-tilt-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 8}deg`);
  };
  return <div className="contact-center" ref={rootRef}>
    <section className="contact-hero" aria-labelledby="contact-title">
      <div className="contact-hero__copy"><span className="contact-eyebrow">ARBORIS.X / CONTATO</span><h1 id="contact-title">Vamos <em>conversar.</em></h1><p>Tem alguma dúvida, sugestão ou deseja conhecer melhor o Arboris.X? Entre em contato com nossa equipe.</p></div>
      <div className="contact-art" aria-hidden="true" onPointerMove={tilt} onPointerLeave={(event) => { event.currentTarget.style.removeProperty('--contact-tilt-x'); event.currentTarget.style.removeProperty('--contact-tilt-y'); }}><span className="contact-art__orbit" /><span className="contact-art__branch contact-art__branch--one" /><span className="contact-art__branch contact-art__branch--two" /><span className="contact-art__spark" /><div className="contact-art__envelope"><span /><i /></div></div>
    </section>
    <div className="contact-grid">
      <section className="contact-panel" aria-labelledby="contact-form-title"><span className="contact-eyebrow">SUA MENSAGEM</span><h2 id="contact-form-title">Escreva para a equipe.</h2><p>Preencha os campos abaixo. O envio será confirmado assim que o serviço aceitar a mensagem.</p>
        <form onSubmit={submit} noValidate>
          <div className="contact-fields"><label>Nome<input name="name" value={fields.name} onChange={update} required minLength={2} maxLength={120} autoComplete="name" /></label><label>E-mail para resposta<input type="email" name="email" value={fields.email} onChange={update} required maxLength={254} autoComplete="email" /></label></div>
          <p className="contact-form__email-note">As respostas pelo formulário usam o e-mail confirmado da sua conta. O endereço informado acima também aparece para a equipe.</p>
          <div className="contact-fields"><label>Assunto<input name="subject" value={fields.subject} onChange={update} required minLength={2} maxLength={160} /></label><label>Categoria<select name="category" value={fields.category} onChange={update} required><option value="">Selecione um assunto</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
          <label>Mensagem<textarea name="message" value={fields.message} onChange={update} required minLength={10} maxLength={4000} rows={7} /></label>
          <div className="contact-form__note"><span>Nunca inclua senhas ou códigos de verificação na mensagem.</span><span>{fields.message.length}/4000</span></div>
          <div className="contact-form__actions"><button type="submit" disabled={status.type === 'loading'}><Send size={17} aria-hidden="true" />{status.type === 'loading' ? 'Enviando…' : 'Enviar mensagem'}</button><span role="status" aria-live="polite" data-state={status.type}>{status.message}</span></div>
          {status.type === 'error' && <a className="contact-form__fallback" href={mailto}>Abrir no aplicativo de e-mail <ArrowRight size={16} aria-hidden="true" /></a>}
        </form>
      </section>
      <aside className="contact-direct"><span className="contact-direct__icon"><Mail size={27} aria-hidden="true" /></span><span className="contact-eyebrow">CANAL DIRETO</span><h2>Prefere enviar diretamente?</h2><p>Você também pode escrever pelo seu aplicativo de e-mail.</p><a className="contact-direct__address" href={`mailto:${ADDRESS}`}>{ADDRESS}</a><div><button type="button" onClick={copyAddress}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? 'E-mail copiado.' : 'Copiar e-mail'}</button><a href={mailto}>Abrir aplicativo de e-mail <ArrowRight size={16} aria-hidden="true" /></a></div><small>Ao abrir seu aplicativo de e-mail, o envio ainda depende da sua confirmação nele.</small></aside>
    </div>
  </div>;
}
