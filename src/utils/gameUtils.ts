export interface Point {
  x: number;
  y: number;
}

export interface Treasure {
  x: number;
  y: number;
  radius: number;
  found: boolean;
  emoji: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star' | 'square' | 'triangle';
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

export type HintLevel =
  | 'freezing'
  | 'cold'
  | 'cool'
  | 'warm'
  | 'hot'
  | 'burning'
  | 'found';

export const TREASURE_EMOJIS = ['💎', '👑', '🏆', '💰', '🔮', '⭐', '🗝️', '🎁', '🧭', '🪙'];

export const HINT_CONFIG: Record<
  HintLevel,
  { label: string; color: string; bgColor: string; glowColor: string; pulseSpeed: number }
> = {
  freezing: {
    label: '🥶 Freezing!',
    color: '#a5b4fc',
    bgColor: 'rgba(99, 102, 241, 0.08)',
    glowColor: 'rgba(99, 102, 241, 0.3)',
    pulseSpeed: 0.5,
  },
  cold: {
    label: '❄️ Cold',
    color: '#93c5fd',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    glowColor: 'rgba(59, 130, 246, 0.35)',
    pulseSpeed: 0.8,
  },
  cool: {
    label: '🌊 Cool',
    color: '#67e8f9',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    pulseSpeed: 1.2,
  },
  warm: {
    label: '☀️ Warm',
    color: '#fbbf24',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    pulseSpeed: 1.8,
  },
  hot: {
    label: '🔥 Hot!',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    glowColor: 'rgba(249, 115, 22, 0.5)',
    pulseSpeed: 2.5,
  },
  burning: {
    label: '🌋 BURNING!!',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.18)',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    pulseSpeed: 4,
  },
  found: {
    label: '🎉 FOUND IT!',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.2)',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    pulseSpeed: 6,
  },
};

export function getDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function getHintLevel(distance: number, canvasSize: number): HintLevel {
  const maxDist = canvasSize * 0.7;
  const ratio = Math.min(distance / maxDist, 1);

  if (ratio < 0.04) return 'found';
  if (ratio < 0.1) return 'burning';
  if (ratio < 0.2) return 'hot';
  if (ratio < 0.35) return 'warm';
  if (ratio < 0.55) return 'cool';
  if (ratio < 0.75) return 'cold';
  return 'freezing';
}

export function generateTreasures(
  count: number,
  canvasWidth: number,
  canvasHeight: number
): Treasure[] {
  const padding = 60;
  const treasures: Treasure[] = [];

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = padding + Math.random() * (canvasWidth - padding * 2);
      y = padding + Math.random() * (canvasHeight - padding * 2);
      attempts++;
    } while (
      attempts < 50 &&
      treasures.some((t) => getDistance({ x, y }, t) < 80)
    );

    treasures.push({
      x,
      y,
      radius: 20,
      found: false,
      emoji: TREASURE_EMOJIS[i % TREASURE_EMOJIS.length],
    });
  }

  return treasures;
}

export function createParticles(x: number, y: number, count: number): Particle[] {
  const colors = [
    '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#10b981', '#ec4899', '#f97316', '#6366f1',
  ];
  const shapes: Particle['shape'][] = ['circle', 'star', 'square', 'triangle'];

  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 6;
    const life = 60 + Math.random() * 80;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life,
      maxLife: life,
      size: 3 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    };
  });
}

export function createRipple(x: number, y: number, color: string): Ripple {
  return {
    x,
    y,
    radius: 5,
    maxRadius: 60 + Math.random() * 40,
    opacity: 0.6,
    color,
  };
}
