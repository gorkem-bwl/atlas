import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail, Calendar, FileText, Pencil, CloudSun, Cloud, CloudRain, Sun,
  Snowflake, CloudLightning, CloudDrizzle, CloudFog,
  ChevronDown, Bell, Users, BellOff, Check,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useThreadCounts } from '../hooks/use-threads';
import { useCalendarEvents } from '../hooks/use-calendar';
import { ROUTES } from '../config/routes';
import '../styles/home.css';

// ---------------------------------------------------------------------------
// Background images — curated nature collection (Unsplash, free to use)
// ---------------------------------------------------------------------------

const BG_IMAGES = [
  // Forest path with sunlight filtering through trees
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop',
  // Misty mountain lake at dawn
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format&fit=crop',
  // Serene wooden bridge in tropical forest
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop',
  // Mountain range with golden hour light
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format&fit=crop',
  // Calm lake with mountain reflection
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=1920&q=80&auto=format&fit=crop',
  // Autumn forest with warm tones
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80&auto=format&fit=crop',
  // Lavender field at sunset
  'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=80&auto=format&fit=crop',
  // Northern lights over snowy landscape
  'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1920&q=80&auto=format&fit=crop',
  // Tropical beach with crystal water
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format&fit=crop',
  // Misty pine forest
  'https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80&auto=format&fit=crop',
  // Japanese garden with cherry blossoms
  'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80&auto=format&fit=crop',
  // Waterfall in lush greenery
  'https://images.unsplash.com/photo-1432405972618-c6b0c1d50207?w=1920&q=80&auto=format&fit=crop',
];

function getDailyImageIndex(): number {
  // Pick a consistent image for the day so it doesn't change on every page load
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % BG_IMAGES.length;
}

// ---------------------------------------------------------------------------
// Time-of-day tint overlay
// ---------------------------------------------------------------------------

function getTimeTint(hour: number): string {
  // Early morning (5-7): warm golden
  if (hour >= 5 && hour < 7) return 'rgba(255, 180, 50, 0.12)';
  // Morning (7-11): light warm
  if (hour >= 7 && hour < 11) return 'rgba(255, 220, 130, 0.06)';
  // Midday (11-14): neutral/clear
  if (hour >= 11 && hour < 14) return 'rgba(255, 255, 255, 0.03)';
  // Afternoon (14-17): warm amber
  if (hour >= 14 && hour < 17) return 'rgba(255, 170, 60, 0.08)';
  // Golden hour (17-19): deep amber
  if (hour >= 17 && hour < 19) return 'rgba(255, 130, 30, 0.14)';
  // Dusk (19-21): blue-purple
  if (hour >= 19 && hour < 21) return 'rgba(80, 60, 180, 0.12)';
  // Night (21-5): deep blue
  return 'rgba(20, 30, 80, 0.18)';
}

// ---------------------------------------------------------------------------
// Mouse parallax hook
// ---------------------------------------------------------------------------

function useMouseParallax(strength: number = 15) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function handleMouseMove(e: MouseEvent) {
      // Normalize mouse position to -1..1
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = -nx * strength;
      targetY = -ny * strength;
    }

    function animate() {
      // Smooth lerp toward target
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      setOffset({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [strength]);

  return offset;
}

// ---------------------------------------------------------------------------
// Email preview filter
// ---------------------------------------------------------------------------

type PreviewFilter = 'all' | 'people' | 'priority' | 'none';

const PREVIEW_OPTIONS: { id: PreviewFilter; labelKey: string; icon: typeof Bell; color: string }[] = [
  { id: 'all', labelKey: 'home.allEmails', icon: Bell, color: '#4ade80' },
  { id: 'people', labelKey: 'home.emailsFromPeople', icon: Users, color: '#60a5fa' },
  { id: 'priority', labelKey: 'home.priorityEmails', icon: Bell, color: '#fbbf24' },
  { id: 'none', labelKey: 'home.noEmails', icon: BellOff, color: '#f87171' },
];

const PREVIEW_LABEL_KEYS: Record<PreviewFilter, string> = {
  all: 'home.showAllEmails',
  people: 'home.emailsFromPeople',
  priority: 'home.priorityEmails',
  none: 'home.noEmailPreview',
};

// ---------------------------------------------------------------------------
// Weather helpers
// ---------------------------------------------------------------------------

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

const WEATHER_ICON_MAP: Record<string, typeof Sun> = {
  '01': Sun,
  '02': CloudSun,
  '03': Cloud,
  '04': Cloud,
  '09': CloudDrizzle,
  '10': CloudRain,
  '11': CloudLightning,
  '13': Snowflake,
  '50': CloudFog,
};

function getWeatherIcon(iconCode: string) {
  const prefix = iconCode.slice(0, 2);
  return WEATHER_ICON_MAP[prefix] ?? CloudSun;
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('atlasmail_weather');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          setWeather(parsed.data);
          return;
        }
      } catch { /* ignore */ }
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const json = await res.json();
          const current = json.current;
          const wmoCode = current.weather_code as number;
          const { desc, icon } = mapWMOCode(wmoCode);

          let city = '';
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const geoJson = await geoRes.json();
            city = geoJson.city || geoJson.locality || '';
          } catch { /* ignore */ }

          const data: WeatherData = {
            temp: Math.round(current.temperature_2m),
            description: desc,
            icon,
            city,
          };
          setWeather(data);
          localStorage.setItem('atlasmail_weather', JSON.stringify({ data, ts: Date.now() }));
        } catch { /* ignore */ }
      },
      () => { /* permission denied */ },
      { timeout: 5000 },
    );
  }, []);

  return weather;
}

function mapWMOCode(code: number): { desc: string; icon: string } {
  if (code === 0) return { desc: 'Clear sky', icon: '01d' };
  if (code <= 3) return { desc: 'Partly cloudy', icon: '02d' };
  if (code <= 49) return { desc: 'Foggy', icon: '50d' };
  if (code <= 59) return { desc: 'Drizzle', icon: '09d' };
  if (code <= 69) return { desc: 'Rain', icon: '10d' };
  if (code <= 79) return { desc: 'Snow', icon: '13d' };
  if (code <= 84) return { desc: 'Rain showers', icon: '10d' };
  if (code <= 86) return { desc: 'Snow showers', icon: '13d' };
  if (code <= 99) return { desc: 'Thunderstorm', icon: '11d' };
  return { desc: 'Clear', icon: '01d' };
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreetingKey(hour: number): string {
  if (hour < 12) return 'home.goodMorning';
  if (hour < 17) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Preview dropdown
// ---------------------------------------------------------------------------

function PreviewDropdown({
  value,
  onChange,
}: {
  value: PreviewFilter;
  onChange: (v: PreviewFilter) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 13,
          fontFamily: 'var(--font-family)',
          fontWeight: 400,
          cursor: 'pointer',
          transition: 'background 0.15s',
          outline: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
      >
        {t(PREVIEW_LABEL_KEYS[value])}
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 220,
            background: 'var(--color-bg-elevated)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            border: '1px solid var(--color-border-primary)',
            overflow: 'hidden',
            zIndex: 100,
            padding: '6px',
          }}
        >
          <div
            style={{
              padding: '8px 12px 6px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t('home.previewEmails')}
          </div>
          {PREVIEW_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                transition: 'background 0.12s',
                outline: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <opt.icon size={16} color={opt.color} strokeWidth={1.8} />
              <span style={{ flex: 1, textAlign: 'left' }}>{t(opt.labelKey)}</span>
              {value === opt.id && <Check size={14} color="var(--color-accent-primary)" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App card
// ---------------------------------------------------------------------------

function AppCard({
  icon: Icon,
  label,
  color,
  badge,
  onClick,
}: {
  icon: typeof Mail;
  label: string;
  color: string;
  badge?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '32px 20px 24px',
        background: hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 22,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 24px 48px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.15)',
        width: 150,
        outline: 'none',
        fontFamily: 'var(--font-family)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 6px 20px ${color}55`,
          transition: 'transform 0.25s ease',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <Icon size={28} color="#fff" strokeWidth={1.7} />
      </div>
      <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
        {label}
      </span>
      {badge && (
        <span
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            marginTop: -8,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Background layer with crossfade
// ---------------------------------------------------------------------------

function BackgroundLayer({
  imageUrl,
  parallaxOffset,
  className,
}: {
  imageUrl: string;
  parallaxOffset: { x: number; y: number };
  className: string;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${imageUrl})`,
        translate: `${parallaxOffset.x}px ${parallaxOffset.y}px`,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const now = useCurrentTime();
  const weather = useWeather();
  const account = useAuthStore((s) => s.account);
  const { data: counts } = useThreadCounts();
  const parallax = useMouseParallax(15);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>(() => {
    return (localStorage.getItem('atlasmail_home_preview') as PreviewFilter) || 'all';
  });

  useEffect(() => {
    localStorage.setItem('atlasmail_home_preview', previewFilter);
  }, [previewFilter]);

  // Image rotation — changes daily, crossfade on manual cycle
  const [imageIndex, setImageIndex] = useState(getDailyImageIndex);
  const [prevImageIndex, setPrevImageIndex] = useState<number | null>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cycleImage = useCallback(() => {
    setPrevImageIndex(imageIndex);
    setImageIndex((i) => (i + 1) % BG_IMAGES.length);
    if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
    crossfadeTimerRef.current = setTimeout(() => setPrevImageIndex(null), 2200);
  }, [imageIndex]);

  // Auto-cycle every 5 minutes
  useEffect(() => {
    const id = setInterval(cycleImage, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [cycleImage]);

  // Preload next image
  useEffect(() => {
    const nextIdx = (imageIndex + 1) % BG_IMAGES.length;
    const img = new Image();
    img.src = BG_IMAGES[nextIdx];
  }, [imageIndex]);

  // Today's events
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);
  const { data: todayEvents } = useCalendarEvents(todayStart, todayEnd);

  const firstName = account?.name?.split(' ')[0] || '';
  const hour = now.getHours();
  const greetingKey = getGreetingKey(hour);
  const inboxUnread = counts?.categories?.all?.unread ?? 0;
  const eventCount = todayEvents?.length ?? 0;
  const timeTint = getTimeTint(hour);

  const WeatherIcon = weather ? getWeatherIcon(weather.icon) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Background images with ken burns + parallax + crossfade */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Previous image (fading out) */}
        {prevImageIndex !== null && (
          <BackgroundLayer
            key={`prev-${prevImageIndex}`}
            imageUrl={BG_IMAGES[prevImageIndex]}
            parallaxOffset={parallax}
            className="home-bg-image home-bg-image--exiting"
          />
        )}

        {/* Current image */}
        <BackgroundLayer
          key={`current-${imageIndex}`}
          imageUrl={BG_IMAGES[imageIndex]}
          parallaxOffset={parallax}
          className={prevImageIndex !== null ? 'home-bg-image home-bg-image--entering' : 'home-bg-image'}
        />
      </div>

      {/* Dark overlay + vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)',
          zIndex: 1,
        }}
      />

      {/* Time-of-day tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: timeTint,
          zIndex: 2,
          transition: 'background 60s linear',
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 200px 40px rgba(0,0,0,0.25)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Top bar */}
      <div
        className="home-topbar-entrance"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '28px 36px',
        }}
      >
        {/* Left: Date + Time + Weather */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 500 }}>
            {formatDate(now)}
          </span>
          <span
            style={{
              color: '#fff',
              fontSize: 40,
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
            }}
          >
            {formatTime(now)}
          </span>
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {WeatherIcon && <WeatherIcon size={15} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />}
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                {weather.temp}°C · {weather.description}
                {weather.city ? `, ${weather.city}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Right: Preview dropdown */}
        <PreviewDropdown value={previewFilter} onChange={setPreviewFilter} />
      </div>

      {/* Center content */}
      <div
        className="home-content-entrance"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Greeting */}
        <h1
          style={{
            color: '#fff',
            fontSize: 64,
            fontWeight: 700,
            margin: 0,
            textShadow: '0 2px 30px rgba(0,0,0,0.25)',
            lineHeight: 1.15,
            letterSpacing: '-1px',
          }}
        >
          {t(greetingKey)}
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 19,
            margin: '8px 0 0',
            fontWeight: 400,
            textShadow: '0 1px 8px rgba(0,0,0,0.2)',
          }}
        >
          {firstName ? t('home.welcomeBack', { name: firstName }) : t('home.whatToDo')}
        </p>

        {/* 3 App cards */}
        <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
          <AppCard
            icon={Mail}
            label={t('nav.mail')}
            color="#4a9e8f"
            badge={inboxUnread > 0 ? t('home.unread', { count: inboxUnread }) : undefined}
            onClick={() => navigate(ROUTES.INBOX)}
          />
          <AppCard
            icon={Calendar}
            label={t('nav.calendar')}
            color="#7c6fbd"
            badge={eventCount > 0 ? t('home.eventsToday', { count: eventCount }) : undefined}
            onClick={() => navigate(ROUTES.CALENDAR)}
          />
          <AppCard
            icon={FileText}
            label={t('nav.write')}
            color="#c4856c"
            onClick={() => navigate(ROUTES.DOCS)}
          />
          <AppCard
            icon={Pencil}
            label={t('nav.draw')}
            color="#d4845f"
            onClick={() => navigate(ROUTES.DRAW)}
          />
        </div>
      </div>
    </div>
  );
}
