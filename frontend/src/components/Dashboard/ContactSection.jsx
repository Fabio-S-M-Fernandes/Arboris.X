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
  const [invalidField, setInvalidField] = useState('');
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const sending = useRef(false);
  const mounted = useRef(true);
  const rootRef = useRef(null);
  useEffect(() => {
    mounted.current = true;
    const visibility = () => rootRef.current?.toggleAttribute('data-hidden', document.visibilityState === 'hidden');
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!retryUntil) return undefined;
    const updateRetry = () => setRetrySeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)));
    updateRetry();
    const timer = window.setInterval(updateRetry, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);
  const update = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    if (invalidField === name) setInvalidField('');
    if (status.type === 'error') setStatus({ type: 'idle', message: '' });
  };
  const mailto = `mailto:${ADDRESS}?subject=${encodeURIComponent(`[Arboris.X — Contato] ${fields.category || 'Mensagem'} — ${fields.subject || 'Contato'}`)}&body=${encodeURIComponent(`Nome: ${fields.name}\nE-mail para resposta: ${fields.email}\nCategoria: ${fields.category}\n\n${fields.message}`)}`;
  const submit = async (event) => {
    event.preventDefault();
    if (sending.current || retrySeconds > 0) return;
    const invalid = [
      [!fields.name.trim() || fields.name.trim().length < 2, 'name', 'Informe seu nome com pelo menos 2 caracteres.'],
      [!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(fields.email.trim()), 'email', 'Informe um e-mail válido para resposta.'],
      [!fields.subject.trim() || fields.subject.trim().length < 2, 'subject', 'Informe um assunto com pelo menos 2 caracteres.'],
      [!fields.category, 'category', 'Selecione a categoria da mensagem.'],
      [fields.message.trim().length < 10, 'message', 'Escreva uma mensagem com pelo menos 10 caracteres.'],
    ].find(([failed]) => failed);
    if (invalid) {
      setInvalidField(invalid[1]);
      setStatus({ type: 'error', message: invalid[2] });
      event.currentTarget.elements.namedItem(invalid[1])?.focus();
      return;
    }
    setInvalidField('');
    sending.current = true;
    setStatus({ type: 'loading', message: 'Enviando mensagem…' });
    try {
      await sendContactMessage(fields);
      if (mounted.current) {
        setStatus({ type: 'success', message: 'Mensagem enviada com sucesso.' });
        setFields((current) => ({ ...current, subject: '', category: '', message: '' }));
      }
    } catch (error) {
      if (mounted.current) {
        if (error.status === 429 && Number.isFinite(error.retryAfterSeconds)) {
          setRetryUntil(Date.now() + error.retryAfterSeconds * 1000);
        }
        setStatus({
        type: 'error',
        message: error.status === 429 ? 'Limite temporário de envios. Aguarde antes de tentar novamente.'
          : error.status === 401 || error.status === 403 ? 'Seu acesso precisa ser confirmado novamente.'
            : error.code === 'CONTACT_INVALID_EMAIL' ? 'Informe um e-mail válido.'
              : error.code === 'CONTACT_INCOMPLETE' ? 'Preencha os campos obrigatórios.'
                : error.code === 'REQUEST_TIMEOUT' ? 'O envio demorou demais. Confira sua conexão e tente novamente.'
                  : 'Não foi possível enviar. Confira sua conexão e tente novamente.',
        });
      }
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
          <div className="contact-fields"><label>Nome<input name="name" value={fields.name} onChange={update} aria-invalid={invalidField === 'name'} required minLength={2} maxLength={120} autoComplete="name" /></label><label>E-mail para resposta<input type="email" name="email" value={fields.email} onChange={update} aria-invalid={invalidField === 'email'} required maxLength={254} autoComplete="email" /></label></div>
          <p className="contact-form__email-note">As respostas pelo formulário usam o e-mail confirmado da sua conta. O endereço informado acima também aparece para a equipe.</p>
          <div className="contact-fields"><label>Assunto<input name="subject" value={fields.subject} onChange={update} aria-invalid={invalidField === 'subject'} required minLength={2} maxLength={160} /></label><label>Categoria<select name="category" value={fields.category} onChange={update} aria-invalid={invalidField === 'category'} required><option value="">Selecione um assunto</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
          <label>Mensagem<textarea name="message" value={fields.message} onChange={update} aria-invalid={invalidField === 'message'} required minLength={10} maxLength={4000} rows={7} /></label>
          <div className="contact-form__note"><span>Nunca inclua senhas ou códigos de verificação na mensagem.</span><span>{fields.message.length}/4000</span></div>
          <div className="contact-form__actions"><button type="submit" disabled={status.type === 'loading' || retrySeconds > 0}><Send size={17} aria-hidden="true" />{status.type === 'loading' ? 'Enviando…' : retrySeconds > 0 ? `Tentar em ${retrySeconds}s` : 'Enviar mensagem'}</button><span role={status.type === 'error' ? 'alert' : 'status'} aria-live={status.type === 'error' ? 'assertive' : 'polite'} data-state={status.type}>{status.message}</span></div>
          {status.type === 'error' && <a className="contact-form__fallback" href={mailto}>Abrir no aplicativo de e-mail <ArrowRight size={16} aria-hidden="true" /></a>}
        </form>
      </section>
      <aside className="contact-direct"><span className="contact-direct__icon"><Mail size={27} aria-hidden="true" /></span><span className="contact-eyebrow">CANAL DIRETO</span><h2>Prefere enviar diretamente?</h2><p>Você também pode escrever pelo seu aplicativo de e-mail.</p><a className="contact-direct__address" href={`mailto:${ADDRESS}`}>{ADDRESS}</a><div><button type="button" onClick={copyAddress}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? 'E-mail copiado.' : 'Copiar e-mail'}</button><a href={mailto}>Abrir aplicativo de e-mail <ArrowRight size={16} aria-hidden="true" /></a></div><small>Ao abrir seu aplicativo de e-mail, o envio ainda depende da sua confirmação nele.</small></aside>
    </div>
  </div>;
}
