import React, { type CSSProperties, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';
import { SettingsSection, SettingsRow } from '../settings/settings-primitives';

type BgType = 'unsplash' | 'solid' | 'gradient' | 'custom';

const SOLID_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2c3e50', '#1b4332', '#3d348b', '#7678ed',
  '#f35b04', '#e63946', '#264653', '#2a9d8f',
  '#e9c46a', '#f4a261', '#606c38', '#283618',
];

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #667eea 0%, #f7797d 100%)',
  'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
];

const swatch: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 8,
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: 'border-color 0.15s, transform 0.15s',
  flexShrink: 0,
};

const selectedSwatch: CSSProperties = {
  ...swatch,
  borderColor: 'var(--color-accent-primary)',
  transform: 'scale(1.1)',
};

export function HomeBackgroundPanel() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  const bgType = (settings?.homeBgType as BgType) || 'unsplash';
  const bgValue = (settings?.homeBgValue as string) || '';

  const [customHex, setCustomHex] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload: { homeBgType: BgType; homeBgValue: string | null }) => {
      await api.put('/settings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });

  const setBg = (type: BgType, value: string | null) => {
    mutation.mutate({ homeBgType: type, homeBgValue: value });
  };

  const typeOptions: Array<{ value: BgType; label: string; desc: string }> = [
    { value: 'unsplash', label: 'Photo rotation', desc: 'Beautiful photos that change throughout the day' },
    { value: 'solid', label: 'Solid color', desc: 'A single background color' },
    { value: 'gradient', label: 'Gradient', desc: 'Smooth color gradients' },
    { value: 'custom', label: 'Custom color', desc: 'Enter a specific hex color code' },
  ];

  return (
    <div>
      <SettingsSection title="Background type" description="Choose what appears behind the home screen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {typeOptions.map((opt) => {
            const isActive = bgType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.value === 'unsplash') setBg('unsplash', null);
                  else if (opt.value === 'solid') setBg('solid', SOLID_COLORS[0]);
                  else if (opt.value === 'gradient') setBg('gradient', GRADIENTS[0]);
                  else if (opt.value === 'custom') setBg('custom', '#1a1a2e');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                  border: isActive ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border-secondary)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: isActive ? '5px solid var(--color-accent-primary)' : '2px solid var(--color-border-primary)',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                />
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {bgType === 'solid' && (
        <SettingsSection title="Pick a color" description="Select a background color for the home screen">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SOLID_COLORS.map((color) => (
              <div
                key={color}
                onClick={() => setBg('solid', color)}
                style={{
                  ...(bgValue === color ? selectedSwatch : swatch),
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
        </SettingsSection>
      )}

      {bgType === 'gradient' && (
        <SettingsSection title="Pick a gradient" description="Select a gradient for the home screen">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GRADIENTS.map((grad) => (
              <div
                key={grad}
                onClick={() => setBg('gradient', grad)}
                style={{
                  ...(bgValue === grad ? selectedSwatch : swatch),
                  background: grad,
                }}
              />
            ))}
          </div>
        </SettingsSection>
      )}

      {bgType === 'custom' && (
        <SettingsSection title="Custom color" description="Enter a hex color code">
          <SettingsRow label="Hex color" description="e.g. #1a1a2e or #f5f5f5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: bgValue || '#000000',
                  border: '1px solid var(--color-border-secondary)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={customHex || bgValue || ''}
                onChange={(e) => setCustomHex(e.target.value)}
                onBlur={() => {
                  const hex = customHex.trim();
                  if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
                    setBg('custom', hex);
                  }
                  setCustomHex('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const hex = customHex.trim();
                    if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
                      setBg('custom', hex);
                    }
                    setCustomHex('');
                  }
                }}
                placeholder="#1a1a2e"
                style={{
                  width: 120,
                  height: 32,
                  padding: '0 10px',
                  border: '1px solid var(--color-border-secondary)',
                  borderRadius: 6,
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </SettingsRow>
        </SettingsSection>
      )}
    </div>
  );
}
