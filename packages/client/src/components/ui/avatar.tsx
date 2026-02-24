import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { getInitials } from '@atlasmail/shared';

// Generates a consistent background color from an email string
function hashColor(str: string): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string;
  size?: number;
}

export function Avatar({ src, name, email = '', size = 32 }: AvatarProps) {
  const initials = getInitials(name ?? null, email);
  const bgColor = hashColor(email || name || 'default');
  const fontSize = size <= 24 ? 10 : size <= 32 ? 12 : 14;

  return (
    <AvatarPrimitive.Root
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name || email}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <AvatarPrimitive.Fallback
        delayMs={src ? 300 : 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: bgColor,
          color: '#ffffff',
          fontSize,
          fontWeight: 600,
          fontFamily: 'var(--font-family)',
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
