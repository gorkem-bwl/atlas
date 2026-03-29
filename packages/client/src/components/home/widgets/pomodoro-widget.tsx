import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer } from 'lucide-react';
import type { WidgetDefinition, WidgetProps } from './types';

type Phase = 'work' | 'break';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PomodoroWidgetComponent({ width, height }: WidgetProps) {
  const [phase, setPhase] = useState<Phase>('work');
  const [remaining, setRemaining] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const total = phase === 'work' ? WORK_SECONDS : BREAK_SECONDS;
  const progress = 1 - remaining / total;

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        setRunning(false);
        const nextPhase: Phase = phase === 'work' ? 'break' : 'work';
        setPhase(nextPhase);
        return nextPhase === 'work' ? WORK_SECONDS : BREAK_SECONDS;
      }
      return prev - 1;
    });
  }, [phase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, tick]);

  const handleClick = () => setRunning((r) => !r);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunning(false);
    setPhase('work');
    setRemaining(WORK_SECONDS);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width, height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '12px 16px',
        gap: 8,
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: phase === 'work' ? 'rgba(255,255,255,0.6)' : 'rgba(134,239,172,0.8)',
        }}
      >
        {phase === 'work' ? 'Focus' : 'Break'}
      </span>
      <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-inverse)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {formatTimer(remaining)}
      </span>
      {/* Progress bar */}
      <div style={{ width: '80%', height: 6, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 'var(--radius-sm)',
            background: phase === 'work' ? 'rgba(251,146,60,0.8)' : 'rgba(134,239,172,0.8)',
            transition: 'width 1s linear',
          }}
        />
      </div>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.4)' }}>
        {running ? 'click to pause' : 'click to start'}
      </span>
      {(running || remaining !== WORK_SECONDS || phase !== 'work') && (
        <button
          onClick={handleReset}
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 'var(--font-size-lg)',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ↻
        </button>
      )}
    </div>
  );
}

export const pomodoroWidget: WidgetDefinition = {
  id: 'pomodoro',
  name: 'Pomodoro timer',
  description: '25/5 minute focus and break timer',
  icon: Timer,
  defaultEnabled: true,
  component: PomodoroWidgetComponent,
};
