import { lazy, Suspense, useState } from 'react';

const documents = {
  terms: lazy(() => import('./ModaisArboris/ModaisArboris').then(({ TermosModal }) => ({ default: TermosModal }))),
  privacy: lazy(() => import('./ModaisArboris/ModaisArboris').then(({ PrivacidadeModal }) => ({ default: PrivacidadeModal }))),
  cookies: lazy(() => import('./ModaisArboris/ModaisArboris').then(({ CookiesModal }) => ({ default: CookiesModal }))),
};

export default function SiteFooterLegal({ compact = false }) {
  const [activeDocument, setActiveDocument] = useState(null);
  const ActiveModal = activeDocument ? documents[activeDocument] : null;
  return <>
    <nav className="site-footer-legal" aria-label="Documentos e políticas">
      {!compact && <button type="button" aria-haspopup="dialog" onClick={() => setActiveDocument('terms')}>Termos de Uso</button>}
      <button type="button" aria-haspopup="dialog" onClick={() => setActiveDocument('privacy')}>Política de Privacidade</button>
      {!compact && <button type="button" aria-haspopup="dialog" onClick={() => setActiveDocument('cookies')}>Política de Cookies</button>}
    </nav>
    {ActiveModal && <Suspense fallback={null}><ActiveModal isOpen onClose={() => setActiveDocument(null)} /></Suspense>}
  </>;
}
