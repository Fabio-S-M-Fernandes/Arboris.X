import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTrustedDevices: vi.fn(),
  revokeTrustedDevice: vi.fn(),
  logoutSupabaseWithApi: vi.fn(),
  clearLocalAuthState: vi.fn(),
  requestTransition: vi.fn(),
  signalDestinationReady: vi.fn(),
  signOut: vi.fn(),
  linkIdentity: vi.fn(),
  sendContactMessage: vi.fn(),
}));

vi.mock('../AutenticacaoArboris/AuthTransitionController', () => ({
  useAuthTransition: () => ({
    requestTransition: mocks.requestTransition,
    signalDestinationReady: mocks.signalDestinationReady,
    motionPaused: false,
  }),
}));
vi.mock('../BootGate', () => ({ useScreenReady: () => {} }));
vi.mock('../../lib/api', () => ({
  listTrustedDevices: mocks.listTrustedDevices,
  revokeTrustedDevice: mocks.revokeTrustedDevice,
  logoutSupabaseWithApi: mocks.logoutSupabaseWithApi,
  sendContactMessage: mocks.sendContactMessage,
}));
vi.mock('../../lib/auth', () => ({ clearLocalAuthState: mocks.clearLocalAuthState }));
vi.mock('../../lib/supabase', () => ({
  getAuthCallbackUrl: () => 'https://example.test/auth/callback',
  supabase: { auth: { signOut: mocks.signOut, linkIdentity: mocks.linkIdentity } },
}));
vi.mock('../AutenticacaoArboris/GoogleSignInButton', () => ({
  default: () => <button type="button">Vincular Google</button>,
}));

import DashboardPage from './DashboardPage';
import { HistorySection } from './DashboardSections';
import { DashboardPreferencesProvider } from '../../lib/dashboardPreferences';

const sessionUser = {
  id: 'user-1',
  email: 'pessoa@example.com',
  userMetadata: { full_name: 'Pessoa Arboris' },
  googleLinked: false,
};

function RouterHistoryProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="current-route">{`${location.pathname}${location.search}`}</output>
    <button type="button" data-testid="history-back" onClick={() => navigate(-1)}>Voltar no histórico</button>
    <button type="button" data-testid="history-forward" onClick={() => navigate(1)}>Avançar no histórico</button>
  </>;
}

describe('Dashboard', () => {
  let container;
  let root;
  let restoreDialog;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('arboris-visual-preferences-v1');
    document.documentElement.style.setProperty('--motion-page-enter', '0ms');
    document.documentElement.style.setProperty('--motion-page-exit', '0ms');
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.listTrustedDevices.mockResolvedValue({ available: false, devices: [] });
    mocks.logoutSupabaseWithApi.mockResolvedValue({});
    mocks.signOut.mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    restoreDialog = () => {};
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    restoreDialog();
    container.remove();
    document.documentElement.style.removeProperty('--motion-page-enter');
    document.documentElement.style.removeProperty('--motion-page-exit');
    vi.unstubAllGlobals();
  });

  const renderDashboard = async (initialEntry = '/dashboard') => {
    await act(async () => {
      root.render(
        <DashboardPreferencesProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage sessionUser={sessionUser} />} />
              <Route path="/login" element={<p>Login</p>} />
            </Routes>
            <RouterHistoryProbe />
          </MemoryRouter>
        </DashboardPreferencesProvider>,
      );
    });
  };

  it.each([
    ['/dashboard', '#overview-title', 'Entender o ambiente começa por observar.'],
    ['/dashboard?section=temperature', '.dashboard-page-intro h2', 'Temperatura'],
    ['/dashboard?section=history', '.dashboard-page-intro h2', 'Histórico de medições'],
    ['/dashboard?section=team', '.team-hero h1', 'Conhecimento feito em equipe.'],
    ['/dashboard?section=settings', '.dashboard-page-intro h2', 'Configurações'],
  ])('opens the section encoded in the URL on direct load: %s', async (entry, selector, expected) => {
    await renderDashboard(entry);
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent(entry);
    expect(container.querySelector(selector)?.textContent).toContain(expected);
    expect(container.querySelector('.dashboard-shell [aria-current="page"]')).not.toBeNull();
  });

  it('keeps URL, selected section, and browser history synchronized', async () => {
    await renderDashboard('/dashboard');
    const visit = async (section) => act(async () => {
      container.querySelector(`a[href="/dashboard?section=${section}"]`).click();
    });

    await visit('temperature');
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=temperature');
    expect(container.querySelector('.dashboard-nav__link[aria-current="page"]')).toHaveAttribute('href', '/dashboard?section=temperature');
    await visit('history');
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=history');

    await act(async () => { container.querySelector('[data-testid="history-back"]').click(); });
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=temperature');
    expect(container.querySelector('.dashboard-page-intro h2').textContent).toBe('Temperatura');
    await act(async () => { container.querySelector('[data-testid="history-forward"]').click(); });
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=history');
    expect(container.querySelector('.dashboard-page-intro h2').textContent).toBe('Histórico de medições');
  });

  it('cancels stale section transitions and renders only the most recent destination', async () => {
    vi.useFakeTimers();
    document.documentElement.style.setProperty('--motion-page-enter', '320ms');
    document.documentElement.style.setProperty('--motion-page-exit', '240ms');
    await renderDashboard('/dashboard');
    await act(async () => { await vi.advanceTimersByTimeAsync(320); });
    const visit = async (section) => act(async () => {
      container.querySelector(`a[href="/dashboard?section=${section}"]`).click();
    });

    await visit('temperature');
    expect(container.querySelector('#overview-title')).not.toBeNull();
    await visit('history');
    await visit('team');
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=team');
    await act(async () => { await vi.advanceTimersByTimeAsync(240); });
    expect(container.querySelector('.team-hero h1')?.textContent).toBe('Conhecimento feito em equipe.');
    expect(container.querySelector('.dashboard-content')).toHaveAttribute('data-transition', 'entering');
    await act(async () => { await vi.advanceTimersByTimeAsync(320); });
    expect(container.querySelector('.dashboard-content')).toHaveAttribute('data-transition', 'entered');
    expect(container.querySelector('.dashboard-nav__link[aria-current="page"]')).toHaveAttribute('href', '/dashboard?section=team');
    vi.useRealTimers();
  });

  it('shows an honest empty temperature state without requesting nonexistent measurements', async () => {
    await renderDashboard();
    expect(container.textContent).toContain('Monitoramento digital');
    expect(container.textContent).toContain('Integração em preparação');
    expect(container.textContent).toContain('O envio dessas leituras para a plataforma ainda está em desenvolvimento.');
    expect(container.textContent).not.toContain('Nenhuma medição disponível');
    expect(container.querySelectorAll('.dashboard-overview__monitor')).toHaveLength(1);
    expect(mocks.listTrustedDevices).not.toHaveBeenCalled();
  });

  it('shows only confirmed project facts and navigates from the overview to existing sections', async () => {
    await renderDashboard();
    expect(container.querySelector('#overview-title').textContent).toContain('Entender o ambiente começa por observar.');
    expect(container.textContent).toContain('FUNEC Riacho');
    expect(container.textContent).toContain('XIII Mostra de Tecnologia da FUNEC Riacho — 2026');
    expect(container.textContent).toContain('EM DESENVOLVIMENTO');
    expect(container.textContent).toContain('Ilustração conceitual');
    expect(container.querySelector('.dashboard-overview__study-figure figcaption').textContent).toContain('Não representa uma medição');

    await act(async () => { container.querySelector('a[href="/dashboard?section=project"].dashboard-overview__button').click(); });
    expect(container.querySelector('#project-hero-title').textContent).toBe('Observar o ambiente é o primeiro passo para transformá-lo.');
    expect(container.querySelectorAll('.project-story__ods-list li')).toHaveLength(6);
    expect(container.textContent).toContain('Ilustrações conceituais para explicar o tema');
    expect(container.textContent).toContain('O envio automático de dados para o site ainda não está confirmado.');
    expect(container.querySelector('a[href="/dashboard?section=how"]')).not.toBeNull();
    expect(container.querySelector('a[href="/dashboard?section=team"]')).not.toBeNull();
    await act(async () => { container.querySelector('a[href="/dashboard"]').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=how"].dashboard-overview__button').click(); });
    expect(container.querySelector('#how-hero-title').textContent).toBe('Da natureza à informação.');
    expect(container.querySelectorAll('.how-story__stage-nav button')).toHaveLength(3);
    await act(async () => { container.querySelector('a[href="/dashboard"]').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=team"].dashboard-overview__button').click(); });
    expect(container.querySelector('.team-hero h1').textContent).toBe('Conhecimento feito em equipe.');
  });

  it('navigates through temperature, history and account sections without leaving the protected route', async () => {
    await renderDashboard();

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=temperature"]').click();
    });
    expect(container.querySelector('.dashboard-page-intro h2').textContent).toBe('Temperatura');
    expect(container.textContent).toContain('Nenhuma medição disponível');
    expect(container.querySelectorAll('.dashboard-temperature__info-card')).toHaveLength(3);
    expect(container.textContent).toContain('Ainda não há leituras');
    expect(container.querySelector('.dashboard-temperature__source')).toBeNull();
    expect(container.querySelector('.dashboard-footer__credit')).toHaveTextContent('FUNEC Riacho · XIII Mostra de Tecnologia · 2026');

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=history"]').click();
    });
    expect(container.querySelector('.dashboard-page-intro h2').textContent).toBe('Histórico de medições');
    expect(container.textContent).toContain('Seu histórico começa com a primeira medição.');
    expect(container.querySelectorAll('.dashboard-history-page .dashboard-export-actions button:disabled')).toHaveLength(2);
    expect(container.querySelector('#history-export-note').textContent).toContain('medições reais');
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();
    expect(container.querySelector('.dashboard-atmosphere')).toHaveAttribute('data-section', 'history');
    expect(container.querySelector('.dashboard-footer')).not.toBeNull();

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=settings"]').click();
    });
    expect(container.querySelector('.dashboard-page-intro h2').textContent).toBe('Configurações');
    expect(container.textContent).toContain('pessoa@example.com');
    expect(mocks.listTrustedDevices).toHaveBeenCalledTimes(1);
  });

  it('keeps simulated readings out of the real history and its exports', async () => {
    const sample = { measuredAt: '2026-06-14T12:00:00.000Z', valueCelsius: 27.4, source: 'demo' };
    await act(async () => { root.render(<HistorySection readings={[sample]} dataSource="demo" />); });
    expect(container.querySelector('.dashboard-history-table')).toBeNull();
    expect(container.querySelector('.dashboard-history-chart')).toBeNull();
    expect(container.querySelectorAll('.dashboard-export-actions button:disabled')).toHaveLength(2);
    expect(container.textContent).toContain('dados simulados e não cria registros');
  });

  it('shows only valid real readings with their time, source and available exports', async () => {
    const readings = [
      { measuredAt: '2026-06-14T12:00:00.000Z', valueCelsius: 27.4, source: 'real', origin: 'Aparelho' },
      { measuredAt: '2026-06-14T13:00:00.000Z', valueCelsius: 28.1, source: 'real', origin: 'Aparelho' },
      { measuredAt: '2026-06-14T14:00:00.000Z', valueCelsius: 99, source: 'demo' },
    ];
    await act(async () => { root.render(<HistorySection readings={readings} dataSource="real" />); });
    expect(container.querySelectorAll('.dashboard-history-table tbody tr')).toHaveLength(2);
    expect(container.querySelector('.dashboard-history-chart__line')).not.toBeNull();
    expect(container.querySelector('.dashboard-history-table').textContent).toContain('Aparelho');
    expect(container.querySelectorAll('.dashboard-export-actions button:not(:disabled)')).toHaveLength(2);
    expect(container.textContent).not.toContain('99');
  });

  it('keeps exports blocked while a future real-history request is pending or fails', async () => {
    await act(async () => { root.render(<HistorySection dataSource="real" status="loading" />); });
    expect(container.textContent).toContain('Consultando medições reais');
    expect(container.querySelectorAll('.dashboard-export-actions button:disabled')).toHaveLength(2);
    await act(async () => { root.render(<HistorySection dataSource="real" status="error" />); });
    expect(container.querySelector('[role="alert"]').textContent).toContain('Não foi possível consultar');
    expect(container.querySelectorAll('.dashboard-export-actions button:disabled')).toHaveLength(2);
  });

  it('moves focus into the collapsible navigation and closes it with Escape', async () => {
    await renderDashboard();
    const toggle = container.querySelector('.dashboard-mobile-menu');

    await act(async () => { toggle.click(); });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(container.querySelector('#dashboard-navigation a'));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(toggle);

    await act(async () => { toggle.click(); });
    await act(async () => { container.querySelector('.dashboard-scrim').click(); });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('removes the header while keeping navigation, theme and account access', async () => {
    await renderDashboard();
    expect(container.querySelector('.dashboard-header')).toBeNull();
    expect(container.querySelector('.dashboard-mobile-menu')).toHaveAttribute('aria-label', 'Abrir navegação');
    expect(container.querySelector('.dashboard-sidebar .dashboard-brand')).toBeNull();
    expect(container.querySelector('.dashboard-sidebar__account')).toHaveAttribute('href', '/dashboard?section=settings');

    const themeButton = container.querySelector('.dashboard-sidebar__theme');
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    await act(async () => { themeButton.click(); });
    expect(document.documentElement.dataset.theme).toBe(nextTheme);
    expect(themeButton).toHaveAttribute('aria-pressed', String(nextTheme === 'light'));

  });

  it('searches local help without accents, combines categories and preserves local feedback', async () => {
    await renderDashboard('/dashboard?section=faq');
    expect(container.querySelectorAll('.help-question')).toHaveLength(38);
    expect([...container.querySelectorAll('.help-question__answer > p')].every((answer) => answer.textContent.trim().length > 25)).toBe(true);
    const input = container.querySelector('#help-search');
    const search = async (value) => act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await search('CODIGO');
    const ids = [...container.querySelectorAll('.help-question h3 button')].map((button) => button.id);
    expect(ids).toContain('help-question-code');
    await search('código');
    expect([...container.querySelectorAll('.help-question h3 button')].map((button) => button.id)).toEqual(ids);
    expect(container.querySelector('mark')).not.toBeNull();
    await search('sensor');
    expect(container.querySelector('#help-question-integration')).not.toBeNull();
    await act(async () => { [...container.querySelectorAll('.help-categories button')].find((button) => button.textContent.includes('Aparelho e monitoramento')).click(); });
    expect(container.querySelectorAll('.help-results__group')).toHaveLength(1);
    expect(container.querySelectorAll('.help-question')).toHaveLength(5);
    await search('zzzznenhumaresposta');
    expect(container.querySelector('.help-empty').textContent).toContain('Não encontramos uma resposta');
    await act(async () => { container.querySelector('.help-empty button').click(); });
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(container.querySelectorAll('.help-question')).toHaveLength(38);
    await search('senha');
    expect(container.querySelector('#help-question-password')).not.toBeNull();
    await act(async () => { container.querySelector('#help-question-password').click(); });
    const question = container.querySelector('#help-question-password').closest('article');
    expect(question.querySelector('button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
    expect(question.querySelector('.help-question__expansion')).toHaveAttribute('aria-hidden', 'false');
    await act(async () => { question.querySelector('.help-question__feedback button').click(); });
    expect(question.querySelector('[role="status"]').textContent).toContain('Obrigado pela avaliação');
    await search('');
    await act(async () => { container.querySelector('#help-question-about').click(); });
    expect(container.querySelectorAll('.help-question[data-open="true"]')).toHaveLength(2);
    await act(async () => { container.querySelector('#help-question-password').click(); });
    expect(container.querySelector('#help-answer-password')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('#help-answer-password')).toHaveAttribute('inert');
    expect([...container.querySelectorAll('.help-shortcuts a')].map((link) => link.getAttribute('href'))).toEqual(['/dashboard?section=project', '/dashboard?section=how', '/dashboard?section=settings', '/dashboard?section=security']);
    expect(container.querySelector('.help-support a').getAttribute('href')).toBe('/dashboard?section=contact');
    expect(mocks.listTrustedDevices).not.toHaveBeenCalled();
  });

  it('keeps project navigation and account settings in the sidebar', async () => {
    await renderDashboard('/dashboard?section=security');
    const navigation = container.querySelector('#dashboard-navigation');
    expect(container.querySelector('.dashboard-header')).toBeNull();
    const groups = [...navigation.querySelectorAll('.dashboard-sidebar__caption')].map((item) => item.textContent);
    const links = [...navigation.querySelectorAll('a')];

    expect(groups).toEqual(['MONITORAMENTO', 'O PROJETO', 'EDUCAÇÃO AMBIENTAL', 'AJUDA E SUPORTE']);
    expect(links.map((link) => link.querySelector('span').textContent)).toEqual([
      'Visão geral', 'Temperatura', 'Histórico', 'Quem somos', 'Sobre o projeto',
      'Como funciona', 'Tecnologias', 'Segurança', 'Quiz ambiental', 'Dúvidas frequentes', 'Fale conosco',
    ]);
    expect(navigation.querySelector('a[href="/dashboard?section=settings"]')).toBeNull();
    expect(new Set(links.map((link) => link.getAttribute('href'))).size).toBe(links.length);
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(navigation.querySelector('[aria-current="page"]')).toHaveAttribute('href', '/dashboard?section=security');
    expect(container.querySelector('.dashboard-sidebar__account')).toHaveAttribute('href', '/dashboard?section=settings');
    expect(container.querySelector('.dashboard-sidebar__account')).toHaveAttribute('aria-label', 'Configurações da conta de Pessoa Arboris');
    expect(container.querySelector('.dashboard-sidebar__account').textContent).not.toContain('pessoa@example.com');
  });

  it('sends contact only once, confirms accepted delivery and offers an honest fallback on failure', async () => {
    await renderDashboard('/dashboard?section=contact');
    const form = container.querySelector('.contact-panel form');
    expect(form).not.toBeNull();
    expect(container.querySelector('.contact-direct__address').textContent).toBe('arborisx@gmail.com');
    const edit = async (name, value) => {
      const field = form.elements.namedItem(name);
      await act(async () => {
        const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
          : field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
        field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      });
    };
    const submit = async () => { await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); };
    await submit();
    expect(form.querySelector('[role="status"]').textContent).toContain('Preencha os campos obrigatórios');
    expect(mocks.sendContactMessage).not.toHaveBeenCalled();
    await edit('subject', 'Uma sugestão');
    await edit('category', 'Sugestões');
    await edit('message', 'Gostaria de compartilhar uma sugestão para o projeto.');
    let finishSend;
    mocks.sendContactMessage.mockReturnValueOnce(new Promise((resolve) => { finishSend = resolve; }));
    await submit(); await submit();
    expect(mocks.sendContactMessage).toHaveBeenCalledOnce();
    expect(form.querySelector('button[type="submit"]')).toBeDisabled();
    await act(async () => { finishSend({ message: 'Mensagem enviada com sucesso.' }); });
    expect(form.querySelector('[role="status"]').textContent).toBe('Mensagem enviada com sucesso.');
    await edit('subject', 'Problema de acesso');
    await edit('category', 'Problemas técnicos');
    await edit('message', 'Encontrei um problema ao tentar acessar a página.');
    mocks.sendContactMessage.mockRejectedValueOnce({ status: 503 });
    await submit();
    expect(form.querySelector('[role="status"]').textContent).toBe('Não foi possível enviar. Tente novamente.');
    expect(form.querySelector('.contact-form__fallback').getAttribute('href')).toContain('mailto:arborisx@gmail.com');
  });

  it('explains confirmed protections and keeps security actions functional', async () => {
    await renderDashboard('/dashboard?section=security');
    expect(container.querySelector('#security-title').textContent).toBe('Confiança se constrói com transparência.');
    expect(container.querySelectorAll('.security-story__layer')).toHaveLength(5);
    expect(container.textContent).toContain('Recurso opcional. Consulte Configurações');
    expect(container.querySelector('.security-story__layer-detail h3').textContent).toBe('Identidade');

    await act(async () => { container.querySelectorAll('.security-story__layer')[3].click(); });
    expect(container.querySelector('.security-story__layer-detail h3').textContent).toBe('Proteção das informações');
    expect(container.querySelectorAll('.security-story__layer[aria-pressed="true"]')).toHaveLength(1);
    expect(container.querySelector('.security-story__control-grid a').getAttribute('href')).toBe('/dashboard?section=settings');
    expect(container.querySelector('.security-story__contact a').getAttribute('href')).toBe('/dashboard?section=contact');

    const scrollIntoView = vi.fn();
    vi.stubGlobal('scrollIntoView', scrollIntoView);
    const target = container.querySelector('#security-layers');
    target.scrollIntoView = scrollIntoView;
    await act(async () => { container.querySelector('.security-story__button--primary').click(); });
    expect(scrollIntoView).toHaveBeenCalledOnce();

    const showModal = HTMLDialogElement.prototype.showModal;
    const closeModal = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function show() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
    restoreDialog = () => {
      if (showModal) HTMLDialogElement.prototype.showModal = showModal;
      else delete HTMLDialogElement.prototype.showModal;
      if (closeModal) HTMLDialogElement.prototype.close = closeModal;
      else delete HTMLDialogElement.prototype.close;
    };
    await act(async () => { container.querySelector('.security-story__button--ghost').click(); });
    await vi.waitFor(() => expect(document.querySelector('dialog[open] .modal-header h2')?.textContent).toBe('Política de Privacidade'));
  });

  it('offers retry with a user-safe message when account devices cannot load', async () => {
    mocks.listTrustedDevices.mockRejectedValue(new Error('internal database detail'));
    await renderDashboard('/dashboard?section=settings');
    await act(async () => { await Promise.resolve(); });

    expect(container.textContent).toContain('Não foi possível carregar os dispositivos.');
    expect(container.textContent).not.toContain('internal database detail');
    expect(container.textContent).toContain('Tentar novamente');
  });

  it('shows the provided institutional information across project sections', async () => {
    await renderDashboard();
    const visit = async (section) => act(async () => {
      container.querySelector(`a[href="/dashboard?section=${section}"]`).click();
    });

    await visit('team');
    for (const name of [
      'Amanda Costa Silva', 'Fábio Fernandes', 'Thaís Vitória', 'Victor Guimarães',
      'Victor Salomão', 'Bruna Ester', 'Izzy Souza', 'Walter Santos', 'Adriana Aguiar',
    ]) {
      expect(container.textContent).toContain(name);
    }
    expect(container.textContent).toContain('FUNEC Riacho');
    expect(container.querySelectorAll('.team-gallery .team-person')).toHaveLength(7);
    expect(container.querySelector('.team-person--leader h3').textContent).toBe('Amanda Costa Silva');
    expect(container.querySelector('.team-person--leader .team-person__role').textContent).toBe('Líder do projeto');
    expect([...container.querySelectorAll('.team-gallery__members h3')].map((heading) => heading.textContent)).toEqual([
      'Victor Guimarães', 'Thaís Vitória', 'Fábio Fernandes', 'Victor Salomão', 'Bruna Ester', 'Izzy Souza',
    ]);
    expect(container.querySelectorAll('.team-mentors .team-person')).toHaveLength(2);
    expect(container.textContent).toContain('Grupo 09');
    expect(container.textContent).toContain('CosSoTech');
    expect(container.textContent).toContain('Construindo sonhos Tech');
    expect([...container.querySelectorAll('.team-gallery .team-person__activity')].map((activity) => activity.textContent)).toEqual([
      'Atividade: Registro', 'Atividade: Pesquisa', 'Atividade: Construção', 'Atividade: Construção',
      'Atividade: Construção', 'Atividade: Pesquisa', 'Atividade: Registro',
    ]);
    expect([...container.querySelectorAll('.team-gallery .team-person__class')].map((schoolClass) => schoolClass.textContent)).toEqual([
      'Turma 3º A', 'Turma 1º B', 'Turma 3º B', 'Turma 2º B', 'Turma 2º A', 'Turma 1º A', 'Turma 1º A',
    ]);
    expect(container.textContent).toContain('Professor orientador');
    expect(container.textContent).toContain('Professora coorientadora');

    await visit('project');
    expect(container.textContent).toContain('ilhas de calor urbanas');
    expect(container.textContent).toContain('projeto educacional');

    await visit('how');
    expect(container.textContent).toContain('mostra o resultado na tela do próprio aparelho');
    expect(container.textContent).toContain('A comunicação automática entre aparelho e site ainda está em desenvolvimento.');
    await act(async () => { container.querySelectorAll('.how-story__stage-nav button')[1].click(); });
    expect(container.querySelector('.how-story__device-screen').textContent).toBe('-- °C');
    expect(container.textContent).toContain('O protótipo físico mede a temperatura ambiente');
    await act(async () => { container.querySelectorAll('.how-story__stage-nav button')[2].click(); });
    expect(container.textContent).toContain('INTEGRAÇÃO EM DESENVOLVIMENTO');
    expect(container.querySelector('.how-story__stage-nav button[aria-pressed="true"]').textContent).toContain('A plataforma');

    await visit('technology');
    for (const technology of ['React', 'Vite', 'Node.js', 'Express', 'PostgreSQL', 'Supabase Auth', 'Google OAuth']) {
      expect(container.textContent).toContain(technology);
    }

    await visit('security');
    expect(container.textContent).toContain('Recuperação de senha');
    expect(container.textContent).toContain('Confiança se constrói com transparência.');

    await visit('faq');
    expect(container.textContent).toContain('O protótipo já envia dados para o site?');
    expect(container.textContent).toContain('Como redefinir minha senha?');
  });

  it('explains the real architecture and switches the selected layer', async () => {
    await renderDashboard('/dashboard?section=technology');
    expect(container.querySelector('#technology-hero-title')?.textContent).toContain('A tecnologia por trás');
    expect(container.querySelector('.technology-story__hero-link')?.getAttribute('href')).toBe('#technology-frontend');
    expect(container.querySelectorAll('.technology-story__tech')).toHaveLength(5);
    expect(container.textContent).toContain('Gmail API');
    expect(container.textContent).toContain('O envio automático da medição para a plataforma é uma etapa futura.');
    const nodes = [...container.querySelectorAll('.technology-story__arch-node')];
    expect(nodes).toHaveLength(5);
    expect(container.querySelector('.technology-story__arch-detail h3')?.textContent).toBe('Interface web');
    await act(async () => { nodes[4].click(); });
    expect(nodes[4].getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.technology-story__arch-detail h3')?.textContent).toBe('Supabase Auth');
    expect(container.querySelector('.technology-story__arch-detail p')?.textContent).toContain('A API valida o token');
  });

  it('clears local auth state and starts the existing logout transition', async () => {
    await renderDashboard('/dashboard?section=settings');
    expect(container.querySelector('.dashboard-nav__logout')).toBeNull();
    expect([...container.querySelectorAll('.dashboard-profile__menu button')]).toHaveLength(0);
    await act(async () => {
      container.querySelector('.dashboard-account-logout').click();
      await Promise.resolve();
    });

    expect(mocks.logoutSupabaseWithApi).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.clearLocalAuthState).toHaveBeenCalledWith({ notify: false });
    expect(mocks.requestTransition).toHaveBeenCalledWith('/login', { direction: 'reverse', mode: 'auth' });
  });

  it('expands the sidebar on hover without shifting the page and preserves its resized width', async () => {
    await renderDashboard();
    expect(container.querySelector('.dashboard-unit-control')).toBeNull();
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();
    const sidebar = container.querySelector('.dashboard-sidebar');
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-collapsed', 'true');
    expect(container.querySelector('[role="separator"]')).toBeNull();
    await act(async () => { sidebar.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-collapsed', 'false');
    const resizeHandle = container.querySelector('[role="separator"][aria-label="Redimensionar barra lateral"]');
    expect(resizeHandle).toHaveAttribute('aria-valuemin', '220');
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '252');

    await act(async () => {
      resizeHandle.focus();
      resizeHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '264');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).sidebarWidth).toBe(264);

    const pointerEvent = (type, clientX) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: 7 }, clientX: { value: clientX }, button: { value: 0 },
      });
      return event;
    };
    await act(async () => { resizeHandle.dispatchEvent(pointerEvent('pointerdown', 260)); });
    await act(async () => { resizeHandle.dispatchEvent(pointerEvent('pointermove', 900)); });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '380');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).sidebarWidth).toBe(264);
    await act(async () => { resizeHandle.dispatchEvent(pointerEvent('pointerup', 900)); });
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).sidebarWidth).toBe(380);
    expect(document.body.style.userSelect).toBe('');

    await act(async () => { sidebar.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    const secondHandle = container.querySelector('[role="separator"][aria-label="Redimensionar barra lateral"]');
    await act(async () => { secondHandle.dispatchEvent(pointerEvent('pointerdown', 900)); });
    await act(async () => { secondHandle.dispatchEvent(pointerEvent('pointermove', -500)); });
    expect(secondHandle).toHaveAttribute('aria-valuenow', '220');
    await act(async () => { secondHandle.dispatchEvent(pointerEvent('pointerup', -500)); });
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).sidebarWidth).toBe(220);

    await act(async () => { sidebar.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: container.querySelector('.dashboard-main') })); });
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-collapsed', 'true');
    expect(container.querySelector('[role="separator"]')).toBeNull();
    expect(container.querySelector('a[href="/dashboard?section=temperature"]')).toHaveAttribute('aria-label', 'Temperatura');
    expect(container.querySelector('a[href="/dashboard?section=temperature"]')).toHaveAttribute('data-tooltip', 'Temperatura');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1'))).not.toHaveProperty('unit');
    await act(async () => { sidebar.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(container.querySelector('.dashboard-shell').style.getPropertyValue('--dashboard-sidebar-width')).toBe('220px');
    expect(container.querySelector('[role="separator"]')).toHaveAttribute('aria-valuenow', '220');

    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await renderDashboard();
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-collapsed', 'true');
    await act(async () => { container.querySelector('.dashboard-sidebar').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(container.querySelector('.dashboard-shell').style.getPropertyValue('--dashboard-sidebar-width')).toBe('220px');
    expect(container.querySelector('[role="separator"]')).toHaveAttribute('aria-valuenow', '220');
  });

  it('keeps demo values visibly simulated and removes them when the demo ends', async () => {
    await renderDashboard('/dashboard?section=settings');
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Iniciar demonstração').click(); });
    expect(container.textContent).toContain('MODO DEMONSTRAÇÃO — DADOS SIMULADOS');
    await act(async () => { container.querySelector('a[href="/dashboard"]').click(); });
    expect(container.querySelector('.dashboard-overview__monitor').textContent).toContain('DADOS SIMULADOS');
    expect(container.querySelector('.dashboard-overview__monitor .dashboard-temperature-reading')).not.toBeNull();
    expect(container.querySelector('.dashboard-overview__monitor .dashboard-temperature-reading').textContent).toContain('°C');
    expect(container.querySelector('.dashboard-overview__monitor').textContent).toContain('Nenhum valor veio do aparelho.');
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.querySelector('.dashboard-temperature-reading')).not.toBeNull();
    expect(container.querySelector('.dashboard-demo-chart')).not.toBeNull();
    await act(async () => { container.querySelector('a[href="/dashboard?section=history"]').click(); });
    expect(container.querySelectorAll('.dashboard-export-actions button[disabled]')).toHaveLength(2);
    expect(container.querySelector('.dashboard-history-table')).toBeNull();
    await act(async () => { container.querySelector('a[href="/dashboard?section=settings"]').click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Encerrar demonstração').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();
    expect(container.querySelector('.dashboard-demo-chart')).toBeNull();
  });

  it('keeps theme and contrast preferences without presentation or unit controls', async () => {
    await renderDashboard('/dashboard?section=settings');
    const theme = container.querySelector('#dashboard-theme');
    await act(async () => {
      theme.value = 'light';
      theme.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await act(async () => { container.querySelector('.dashboard-setting-check input').click(); });
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    for (let index = 0; index < 4; index += 1) {
      await act(async () => { container.querySelector('[aria-label="Aumentar texto"]').click(); });
    }
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).fontSize).toBe(150);
    expect(container.querySelector('.dashboard-header')).toBeNull();
    expect(container.querySelector('.dashboard-unit-control')).toBeNull();
    expect(container.querySelector('.dashboard-shell')).not.toHaveAttribute('data-presentation');
  });

  it('labels a threshold crossing as demonstrative and keeps the threshold in Celsius', async () => {
    await renderDashboard('/dashboard?section=settings');
    const threshold = container.querySelector('#dashboard-alert-threshold');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(threshold, '25');
      threshold.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { container.querySelector('.dashboard-setting-form button').click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Iniciar demonstração').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.textContent).toContain('Alerta demonstrativo — temperatura simulada acima do limite.');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).alertCelsius).toBe(25);
  });
});
