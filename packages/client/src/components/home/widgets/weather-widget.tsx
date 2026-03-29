import { useState, useEffect } from 'react';
import { CloudSun } from 'lucide-react';
import type { WidgetDefinition, WidgetProps } from './types';

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  code: number;
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return '\u2600\uFE0F';
  if (code <= 3) return '\u26C5';
  if (code <= 48) return '\uD83C\uDF2B\uFE0F';
  if (code <= 57) return '\uD83C\uDF27\uFE0F';
  if (code <= 67) return '\uD83C\uDF27\uFE0F';
  if (code <= 77) return '\u2744\uFE0F';
  if (code <= 82) return '\uD83C\uDF26\uFE0F';
  if (code <= 86) return '\uD83C\uDF28\uFE0F';
  if (code <= 99) return '\u26C8\uFE0F';
  return '\u2600\uFE0F';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WeatherWidgetComponent({ width, height }: WidgetProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('atlasmail_weather_forecast');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 60 * 60 * 1000) {
          setForecast(parsed.data);
          return;
        }
      } catch { /* ignore */ }
    }

    if (!navigator.geolocation) {
      setError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`
          );
          const json = await res.json();
          const days: ForecastDay[] = json.daily.time.map((date: string, i: number) => ({
            day: DAY_NAMES[new Date(date + 'T12:00:00').getDay()],
            high: Math.round(json.daily.temperature_2m_max[i]),
            low: Math.round(json.daily.temperature_2m_min[i]),
            code: json.daily.weather_code[i],
          }));
          setForecast(days);
          localStorage.setItem('atlasmail_weather_forecast', JSON.stringify({ ts: Date.now(), data: days }));
        } catch {
          setError(true);
        }
      },
      () => setError(true),
      { timeout: 5000 },
    );
  }, []);

  if (error || forecast.length === 0) {
    return (
      <div
        style={{
          width, height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 'var(--font-size-lg)',
        }}
      >
        {error ? 'Location needed' : 'Loading...'}
      </div>
    );
  }

  return (
    <div
      style={{
        width, height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '12px 8px',
      }}
    >
      {forecast.map((d) => (
        <div
          key={d.day}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 'var(--font-size-md)', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {d.day}
          </span>
          <span style={{ fontSize: 'var(--font-size-2xl)', lineHeight: 1 }}>{getWeatherEmoji(d.code)}</span>
          <div style={{ display: 'flex', gap: 4, fontSize: 'var(--font-size-md)', fontWeight: 500 }}>
            <span style={{ color: 'var(--color-text-inverse)' }}>{d.high}°</span>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{d.low}°</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export const weatherWidget: WidgetDefinition = {
  id: 'weather',
  name: '4-day forecast',
  description: 'Weather forecast for the next 4 days based on your location',
  icon: CloudSun,
  defaultEnabled: true,
  component: WeatherWidgetComponent,
};
