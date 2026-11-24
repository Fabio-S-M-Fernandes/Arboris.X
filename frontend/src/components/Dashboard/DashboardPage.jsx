import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { clearLocalAuthState } from '../../lib/auth';
import { listTrustedDevices, logoutSupabaseWithApi, revokeTrustedDevice } from '../../lib/api';
import { getAuthCallbackUrl, supabase } from '../../lib/supabase';
import { useDashboardPreferences } from '../../lib/dashboardPreferences';
import { buildDemoReadings } from '../../lib/demoReadings';
import { getMotionDuration } from '../../lib/motion';
import GoogleSignInButton from '../AutenticacaoArboris/GoogleSignInButton';
import DashboardLayout from './DashboardLayout';
import {
  AccountSection,
  HistorySection,
  TemperatureSection,
} from './DashboardSections';
import OverviewSection from './DashboardOverview';
import ContactSection from './ContactSection';
import EcoQuizSection from './EcoQuizSection';
import {
  FAQSection,
  HowItWorksSection,
  ProjectSection,
  SecuritySection,
  TeamSection,
  TechnologySection,
} from './DashboardInstitutionalSections';
import './Dashboard.css';
import './DashboardOverview.css';
import './DashboardHistory.css';

const SECTIONS = new Set([
  'overview', 'temperature', 'history', 'settings',
  'team', 'project', 'how', 'technology', 'security', 'faq', 'contact', 'quiz',
]);
const REAL_READINGS = []; // A integração física ainda não fornece um endpoint de medições.

export default function DashboardPage({ sessionUser }) {
  const { requestTransition, signalDestinationReady, motionPaused } = useAuthTransition();
  const { preferences, updatePreference, restoreDefaults, fontSizes } = useDashboardPreferences();
  const [searchParams] = useSearchParams();
  const shellRef = useRef(null);
  const sectionParam = searchParams.get('section');
  const section = SECTIONS.has(sectionParam) ? sectionParam : 'overview';
  const initialContentPhase = getMotionDuration('--motion-page-enter', 320) === 0 ? 'entered' : 'entering';
  const [contentSection, setContentSection] = useState(section);
  const [contentPhase, setContentPhase] = useState(initialContentPhase);
  const contentPhaseRef = useRef(initialContentPhase);
  const contentSectionRef = useRef(section);
  const targetSectionRef = useRef(section);
  const sectionExitTimer = useRef(null);
  const sectionEntryTimer = useRef(null);
  const [deviceState, setDeviceState] = useState({ status: 'loading', available: true, devices: [] });
  const [revokingDevice, setRevokingDevice] = useState(null);
  const [deviceRetry, setDeviceRetry] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoStartedAt, setDemoStartedAt] = useState(0);
  const [trustNotice] = useState(() => {
    const message = sessionStorage.getItem('arboris-trust-notice') || '';
    sessionStorage.removeItem('arboris-trust-notice');
    return message;
  });
  useScreenReady(shellRef);

  const finishContentEntry = useCallback(() => {
    window.clearTimeout(sectionEntryTimer.current);
    sectionEntryTimer.current = null;
    contentPhaseRef.current = 'entered';
    setContentPhase('entered');
  }, []);

  const beginContentEntry = useCallback(() => {
    window.clearTimeout(sectionEntryTimer.current);
    contentPhaseRef.current = 'entering';
    setContentPhase('entering');
    const duration = getMotionDuration('--motion-page-enter', 320);
    if (duration === 0) {
      finishContentEntry();
      return;
    }
    sectionEntryTimer.current = window.setTimeout(finishContentEntry, duration);
  }, [finishContentEntry]);

  const showLatestSection = useCallback(() => {
    window.clearTimeout(sectionExitTimer.current);
    sectionExitTimer.current = null;
    const nextSection = targetSectionRef.current;
    if (nextSection !== contentSectionRef.current) {
      contentSectionRef.current = nextSection;
      setContentSection(nextSection);
    }
    beginContentEntry();
  }, [beginContentEntry]);

  useEffect(() => {
    const duration = getMotionDuration('--motion-page-enter', 320);
    if (duration > 0) sectionEntryTimer.current = window.setTimeout(finishContentEntry, duration);
    return () => window.clearTimeout(sectionEntryTimer.current);
  }, [finishContentEntry]);

  useEffect(() => () => {
    window.clearTimeout(sectionExitTimer.current);
    window.clearTimeout(sectionEntryTimer.current);
  }, []);

  useEffect(() => {
    targetSectionRef.current = section;
    const phase = contentPhaseRef.current;
    if (section === contentSectionRef.current) {
      if (phase === 'exiting') {
        window.clearTimeout(sectionExitTimer.current);
        sectionExitTimer.current = null;
        beginContentEntry();
      }
      return;
    }
    if (phase === 'exiting') return;

    window.clearTimeout(sectionEntryTimer.current);
    sectionEntryTimer.current = null;
    contentPhaseRef.current = 'exiting';
    setContentPhase('exiting');
    const duration = getMotionDuration('--motion-page-exit', 240);
    if (duration === 0) queueMicrotask(showLatestSection);
    else sectionExitTimer.current = window.setTimeout(showLatestSection, duration);
  }, [beginContentEntry, section, showLatestSection]);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  useEffect(() => {
    if (!demoActive) return undefined;
    let timer;
    const syncTimer = () => {
      window.clearInterval(timer);
      if (document.visibilityState === 'visible') {
        timer = window.setInterval(() => setDemoStep((step) => step + 1), 8000);
      }
    };
    document.addEventListener('visibilitychange', syncTimer);
    syncTimer();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', syncTimer);
    };
  }, [demoActive]);

  const toggleDemo = () => {
    if (demoActive) {
      setDemoActive(false);
      setDemoStep(0);
      setDemoStartedAt(0);
    } else {
      setDemoStartedAt(Date.now() - 11 * 8000);
      setDemoStep(11);
      setDemoActive(true);
    }
  };

  const demoReadings = demoActive ? buildDemoReadings(demoStep, demoStartedAt) : [];
  const readings = demoActive ? demoReadings : REAL_READINGS;
  const dataSource = demoActive ? 'demo' : REAL_READINGS.length ? 'real' : 'none';

  useEffect(() => {
    if (contentSection !== 'settings') return undefined;
    let active = true;
    const controller = new AbortController();
    listTrustedDevices(controller.signal).then((result) => {
      if (active) {
        setDeviceState({
          status: 'ready',
          available: result.available === true,
          devices: Array.isArray(result.devices) ? result.devices : [],
        });
      }
    }).catch(() => {
      if (active) setDeviceState((current) => ({ ...current, status: 'error', error: 'Não foi possível carregar os dispositivos. Tente novamente.' }));
    });
    return () => { active = false; controller.abort(); };
  }, [deviceRetry, contentSection]);

  const handleDeviceRevoke = async (id) => {
    setRevokingDevice(id);
    try {
      await revokeTrustedDevice(id);
      setDeviceState((current) => ({
        ...current,
        devices: current.devices.filter((device) => device.id !== id),
        error: '',
      }));
    } catch {
      setDeviceState((current) => ({ ...current, error: 'Não foi possível revogar o dispositivo. Tente novamente.' }));
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSupabaseWithApi();
    } catch {
      // Supabase signOut still clears its local session if API revocation fails.
    } finally {
      try { await supabase.auth.signOut(); } catch { /* Clear local state below even if Auth is offline. */ }
      clearLocalAuthState({ notify: false });
      requestTransition('/login', { direction: 'reverse', mode: 'auth' });
    }
  };

  const handleGoogleLink = useCallback(async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: getAuthCallbackUrl('link') },
    });
    if (error) throw error;
    return { redirecting: true };
  }, []);

  let content;
  if (contentSection === 'temperature') {
    content = <TemperatureSection readings={readings} dataSource={dataSource} alertCelsius={preferences.alertCelsius} />;
  } else if (contentSection === 'history') {
    content = <HistorySection readings={readings} dataSource={dataSource} />;
  } else if (contentSection === 'team') {
    content = <TeamSection />;
  } else if (contentSection === 'project') {
    content = <ProjectSection />;
  } else if (contentSection === 'how') {
    content = <HowItWorksSection />;
  } else if (contentSection === 'technology') {
    content = <TechnologySection />;
  } else if (contentSection === 'security') {
    content = <SecuritySection />;
  } else if (contentSection === 'faq') {
    content = <FAQSection key={sessionUser?.id || 'local'} userId={sessionUser?.id} />;
  } else if (contentSection === 'contact') {
    content = <ContactSection sessionUser={sessionUser} />;
  } else if (contentSection === 'quiz') {
    content = <EcoQuizSection key={sessionUser?.id || 'local'} sessionUser={sessionUser} />;
  } else if (contentSection === 'settings') {
    content = (
      <AccountSection
        sessionUser={sessionUser}
        deviceState={deviceState}
        revokingDevice={revokingDevice}
        trustNotice={trustNotice}
        onRevokeDevice={handleDeviceRevoke}
        onRetryDevices={() => {
          setDeviceState((current) => ({ ...current, status: 'loading', error: '' }));
          setDeviceRetry((retry) => retry + 1);
        }}
        preferences={preferences}
        updatePreference={updatePreference}
        restoreDefaults={restoreDefaults}
        fontSizes={fontSizes}
        demoActive={demoActive}
        onToggleDemo={toggleDemo}
        onLogout={handleLogout}
      >
        <GoogleSignInButton onCredential={handleGoogleLink} />
      </AccountSection>
    );
  } else {
    content = <OverviewSection readings={readings} dataSource={dataSource} />;
  }

  return (
    <DashboardLayout
      ref={shellRef}
      section={section}
      sessionUser={sessionUser}
      motionPaused={motionPaused}
    >
      <div className="dashboard-content" data-transition={contentPhase} aria-busy={contentPhase === 'exiting'}>
        {content}
      </div>
    </DashboardLayout>
  );
}
