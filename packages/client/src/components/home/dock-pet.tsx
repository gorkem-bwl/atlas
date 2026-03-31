import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Pet sprites config
// ---------------------------------------------------------------------------

type PetType = 'cat' | 'fox';

const PET_CONFIG: Record<PetType, { walkFrames: number; frameRate: number }> = {
  cat: { walkFrames: 6, frameRate: 120 },
  fox: { walkFrames: 8, frameRate: 100 },
};

function getFramePath(pet: PetType, action: string, frame: number): string {
  return `/pets/${pet}/${action}/frame_${String(frame).padStart(3, '0')}.png`;
}

// ---------------------------------------------------------------------------
// DockPet — pixel pet that wanders near the dock
// ---------------------------------------------------------------------------

interface DockPetProps {
  pet?: PetType;
  /** Bottom offset in px (position above the dock) */
  bottomOffset?: number;
}

type PetState = 'walk-east' | 'walk-west' | 'idle';

export function DockPet({ pet = 'cat', bottomOffset = 100 }: DockPetProps) {
  const config = PET_CONFIG[pet];
  const [state, setState] = useState<PetState>('idle');
  const [frame, setFrame] = useState(0);
  const [x, setX] = useState(() => Math.random() * (window.innerWidth - 200) + 100);
  const animRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const moveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const xRef = useRef(x);
  xRef.current = x;

  // Frame animation
  useEffect(() => {
    if (state === 'idle') {
      setFrame(0);
      return;
    }
    const maxFrames = config.walkFrames;
    animRef.current = setInterval(() => {
      setFrame((f) => (f + 1) % maxFrames);
    }, config.frameRate);
    return () => clearInterval(animRef.current);
  }, [state, config]);

  // Movement
  useEffect(() => {
    if (state === 'idle') return;
    const speed = 1.2;
    const interval = setInterval(() => {
      setX((prev) => {
        const next = state === 'walk-east' ? prev + speed : prev - speed;
        // Clamp to viewport
        if (next > window.innerWidth - 60) { setState('walk-west'); return prev; }
        if (next < 20) { setState('walk-east'); return prev; }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [state]);

  // Behavior: alternate between walking and idling
  const pickNextAction = useCallback(() => {
    const rand = Math.random();
    if (rand < 0.3) {
      // Idle for 2-5 seconds
      setState('idle');
      moveRef.current = setTimeout(pickNextAction, 2000 + Math.random() * 3000);
    } else {
      // Walk in a direction for 3-8 seconds
      const dir = xRef.current > window.innerWidth / 2 ? 'walk-west' : 'walk-east';
      setState(Math.random() > 0.5 ? dir : (dir === 'walk-east' ? 'walk-west' : 'walk-east'));
      moveRef.current = setTimeout(pickNextAction, 3000 + Math.random() * 5000);
    }
  }, []);

  useEffect(() => {
    // Start with a short idle, then begin wandering
    moveRef.current = setTimeout(pickNextAction, 1000 + Math.random() * 2000);
    return () => clearTimeout(moveRef.current);
  }, [pickNextAction]);

  const src = state === 'idle'
    ? `/pets/${pet}/idle/frame_000.png`
    : getFramePath(pet, state, frame);

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: x,
        width: 40,
        height: 40,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: 45,
        transition: 'left 16ms linear',
      }}
    />
  );
}
