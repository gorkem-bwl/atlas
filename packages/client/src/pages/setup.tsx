import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { ROUTES } from '../config/routes';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { CheckCircle2, ArrowRight, ArrowLeft, Globe, Building2, User, Settings } from 'lucide-react';
import type { Account } from '@atlasmail/shared';

// Wallpaper #4 — Mountain range
const BG_IMAGE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format&fit=crop';

const glassInputStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  borderColor: 'rgba(255, 255, 255, 0.2)',
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const CURRENCIES = [
  { value: '$', label: '$ USD' },
  { value: '€', label: '€ EUR' },
  { value: '£', label: '£ GBP' },
  { value: '¥', label: '¥ JPY' },
  { value: '₺', label: '₺ TRY' },
  { value: '₹', label: '₹ INR' },
  { value: 'R$', label: 'R$ BRL' },
  { value: 'CHF', label: 'CHF' },
];

// ─── Step indicator ──────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? 'rgba(255,255,255,0.8)' : i < current ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Step icon badge ─────────────────────────────────────────────────

function StepIcon({ icon: Icon, color }: { icon: typeof Globe; color: string }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 14,
      background: `${color}22`,
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <Icon size={24} color={color} />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function SetupPreviewPage() {
  return <SetupPage preview />;
}

export function SetupPage({ preview = false }: { preview?: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const addAccount = useAuthStore((s) => s.addAccount);

  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1: Language
  const [language, setLanguage] = useState(i18n.language?.split('-')[0] || 'en');

  // Step 2: Organization
  const [companyName, setCompanyName] = useState('');

  // Step 3: Admin
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 4: Preferences
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [currency, setCurrency] = useState('$');

  // Redirect if already set up (skip in preview mode)
  useEffect(() => {
    if (preview) { setChecking(false); return; }
    api.get('/auth/setup-status')
      .then(({ data }) => {
        if (!data.data.needsSetup) {
          navigate(ROUTES.LOGIN, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate, preview]);

  // Switch language in real time
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  if (checking) return null;

  const canProceed = () => {
    switch (step) {
      case 0: return true; // language always selected
      case 1: return companyName.trim().length > 0;
      case 2: return adminName.trim().length > 0 && adminEmail.includes('@') && adminPassword.length >= 8;
      case 3: return true; // preferences always have defaults
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
      setError('');
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError('');
    }
  };

  async function handleSubmit() {
    setError('');
    setLoading(true);

    if (preview) {
      // Preview mode — just show success, don't create anything
      setTimeout(() => { setSuccess(true); setLoading(false); }, 1000);
      return;
    }

    try {
      const { data } = await api.post('/auth/setup', { adminName, adminEmail, adminPassword, companyName });
      const { accessToken, refreshToken, account } = data.data;
      addAccount(account as Account, accessToken, refreshToken);

      // Save preferences
      try {
        await api.put('/settings', {
          language,
          timezone,
          dateFormat,
          currencySymbol: currency,
          calendarStartDay: 'monday',
        });
      } catch { /* non-critical */ }

      setSuccess(true);
      setTimeout(() => navigate(ROUTES.HOME, { replace: true }), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
      setLoading(false);
    }
  }

  const stepTitles = [
    { title: t('setup.welcomeTitle', 'Welcome to Atlas'), subtitle: t('setup.welcomeSubtitle', 'Choose your language to get started'), icon: Globe, color: '#3b82f6' },
    { title: t('setup.orgTitle', 'Your organization'), subtitle: t('setup.orgSubtitle', 'What is your company called?'), icon: Building2, color: '#10b981' },
    { title: t('setup.adminTitle', 'Admin account'), subtitle: t('setup.adminSubtitle', 'Create your first admin account'), icon: User, color: '#8b5cf6' },
    { title: t('setup.prefsTitle', 'Preferences'), subtitle: t('setup.prefsSubtitle', 'Configure your defaults'), icon: Settings, color: '#f59e0b' },
  ];

  const currentStep = stepTitles[step];

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', overflow: 'hidden' }}>
      {/* Background — wallpaper #4 with Ken Burns */}
      <div style={{
        position: 'absolute', inset: '-20px',
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'brightness(0.5)',
        animation: 'loginKenBurns 30s ease-in-out infinite alternate',
      }} />

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)' }} />

      {/* Glass card */}
      <div
        className="glass-card"
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          padding: '36px 32px 28px',
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h2 style={{ color: '#fff', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'], margin: '0 0 8px' }}>
              {t('setup.successTitle', 'Atlas is ready')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
              {t('setup.successSubtitle', 'Redirecting to your dashboard...')}
            </p>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <StepIndicator current={step} total={4} />

            {/* Step icon + title */}
            <StepIcon icon={currentStep.icon} color={currentStep.color} />
            <h1 style={{ color: '#fff', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'], textAlign: 'center', margin: '0 0 6px' }}>
              {currentStep.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--font-size-sm)', textAlign: 'center', margin: '0 0 24px' }}>
              {currentStep.subtitle}
            </p>

            {/* Error */}
            {error && (
              <div style={{ padding: '8px 12px', marginBottom: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: 'var(--font-size-sm)' }}>
                {error}
              </div>
            )}

            {/* Step content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLanguage(lang.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        background: language === lang.value ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        border: language === lang.value ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: language === lang.value ? '6px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.3)',
                        boxSizing: 'border-box',
                        transition: 'border 0.15s',
                      }} />
                      <span style={{ color: '#fff', fontSize: 'var(--font-size-md)' }}>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <Input
                  label={t('setup.orgName', 'Organization name')}
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('setup.orgPlaceholder', 'Acme Corp')}
                  required
                  size="lg"
                  style={glassInputStyle}
                  autoFocus
                />
              )}

              {step === 2 && (
                <>
                  <Input label={t('setup.adminName', 'Full name')} type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder={t('setup.namePlaceholder', 'John Doe')} required size="lg" style={glassInputStyle} autoFocus />
                  <Input label={t('setup.adminEmail', 'Email')} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder={t('setup.emailPlaceholder', 'admin@company.com')} required size="lg" style={glassInputStyle} />
                  <Input label={t('setup.adminPassword', 'Password')} type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder={t('setup.passwordPlaceholder', 'Minimum 8 characters')} required size="lg" style={glassInputStyle} />
                </>
              )}

              {step === 3 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)' }}>
                      {t('setup.timezone', 'Timezone')}
                    </label>
                    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.7)', fontSize: 'var(--font-size-sm)' }}>
                      {timezone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)' }}>
                        {t('setup.dateFormat', 'Date format')}
                      </label>
                      <Select value={dateFormat} onChange={(v) => setDateFormat(v)} options={DATE_FORMATS} size="sm" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)' }}>
                        {t('setup.currency', 'Currency')}
                      </label>
                      <Select value={currency} onChange={(v) => setCurrency(v)} options={CURRENCIES} size="sm" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="lg"
                  icon={<ArrowLeft size={16} />}
                  onClick={handleBack}
                  style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  {t('setup.back', 'Back')}
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={!canProceed() || loading}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                {loading ? t('setup.settingUp', 'Setting up...') : step < 3 ? t('setup.continue', 'Continue') : t('setup.complete', 'Complete setup')}
                {!loading && step < 3 && <ArrowRight size={16} style={{ marginLeft: 6 }} />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
