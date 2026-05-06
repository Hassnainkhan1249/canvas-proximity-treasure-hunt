import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Treasure,
  Particle,
  Ripple,
  HintLevel,
  HINT_CONFIG,
  getDistance,
  getHintLevel,
  generateTreasures,
  createParticles,
  createRipple,
} from '../utils/gameUtils';

interface GameCanvasProps {
  level: number;
  onTreasureFound: (treasure: Treasure) => void;
  onAllFound: () => void;
  onHintChange: (hint: HintLevel) => void;
  onSearchCountChange: (count: number) => void;
  isPlaying: boolean;
}

export default function GameCanvas({
  level,
  onTreasureFound,
  onAllFound,
  onHintChange,
  onSearchCountChange,
  isPlaying,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treasuresRef = useRef<Treasure[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const cursorRef = useRef({ x: -100, y: -100 });
  const hintRef = useRef<HintLevel>('freezing');
  const animFrameRef = useRef(0);
  const searchCountRef = useRef(0);
  const pulsePhaseRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number; age: number }[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const celebratingRef = useRef(false);
  const celebrationTimerRef = useRef(0);

  const treasureCount = Math.min(2 + level, 8);

  // Initialize treasures on level change
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    const w = rect?.width ?? 800;
    const h = rect?.height ?? 600;
    canvas.width = w;
    canvas.height = h;
    setCanvasSize({ width: w, height: h });

    treasuresRef.current = generateTreasures(treasureCount, w, h);
    particlesRef.current = [];
    ripplesRef.current = [];
    searchCountRef.current = 0;
    onSearchCountChange(0);
    hintRef.current = 'freezing';
    onHintChange('freezing');
    trailRef.current = [];
    celebratingRef.current = false;
  }, [level, isPlaying, treasureCount, onHintChange, onSearchCountChange]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPlaying || celebratingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cursorRef.current = { x, y };
      searchCountRef.current++;
      onSearchCountChange(searchCountRef.current);

      // Add trail point
      trailRef.current.push({ x, y, age: 0 });
      if (trailRef.current.length > 30) trailRef.current.shift();

      // Find closest unfound treasure
      const unfound = treasuresRef.current.filter((t) => !t.found);
      if (unfound.length === 0) return;

      let closestDist = Infinity;
      let closestTreasure: Treasure | null = null;
      for (const t of unfound) {
        const dist = getDistance({ x, y }, t);
        if (dist < closestDist) {
          closestDist = dist;
          closestTreasure = t;
        }
      }

      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
      const hint = getHintLevel(closestDist, diagonal);
      hintRef.current = hint;
      onHintChange(hint);

      // Add ripple
      const hintConf = HINT_CONFIG[hint];
      ripplesRef.current.push(createRipple(x, y, hintConf.color));

      // Check if found
      if (hint === 'found' && closestTreasure) {
        closestTreasure.found = true;
        celebratingRef.current = true;
        celebrationTimerRef.current = 120;

        // Massive particle burst
        particlesRef.current.push(
          ...createParticles(closestTreasure.x, closestTreasure.y, 80)
        );

        // Multiple ripples
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (closestTreasure) {
              ripplesRef.current.push(
                createRipple(closestTreasure.x, closestTreasure.y, '#a855f7')
              );
            }
          }, i * 100);
        }

        onTreasureFound(closestTreasure);

        const remaining = treasuresRef.current.filter((t) => !t.found);
        if (remaining.length === 0) {
          setTimeout(() => onAllFound(), 2000);
        }
      }
    },
    [isPlaying, onTreasureFound, onAllFound, onHintChange, onSearchCountChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPlaying) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      cursorRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [isPlaying]
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const drawStar = (
      cx: number,
      cy: number,
      spikes: number,
      outerR: number,
      innerR: number,
      rotation: number
    ) => {
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / spikes - Math.PI / 2 + rotation;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawTriangle = (cx: number, cy: number, size: number, rotation: number) => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (i * (Math.PI * 2)) / 3 - Math.PI / 2 + rotation;
        const px = cx + Math.cos(angle) * size;
        const py = cy + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const animate = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background gradient based on hint
      const hintConf = HINT_CONFIG[hintRef.current];
      const bgGrad = ctx.createRadialGradient(
        cursorRef.current.x,
        cursorRef.current.y,
        0,
        cursorRef.current.x,
        cursorRef.current.y,
        Math.max(w, h) * 0.6
      );
      bgGrad.addColorStop(0, hintConf.bgColor);
      bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Draw trail
      for (let i = 0; i < trailRef.current.length; i++) {
        const tp = trailRef.current[i];
        tp.age++;
        const alpha = Math.max(0, 1 - tp.age / 200);
        if (alpha <= 0) {
          trailRef.current.splice(i, 1);
          i--;
          continue;
        }
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${alpha * 0.3})`;
        ctx.fill();

        // Connect trail dots
        if (i > 0) {
          const prev = trailRef.current[i - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(tp.x, tp.y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha * 0.15})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const ripple = ripplesRef.current[i];
        ripple.radius += 2;
        ripple.opacity -= 0.012;

        if (ripple.opacity <= 0) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.color;
        ctx.globalAlpha = ripple.opacity;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Pulse effect at cursor
      pulsePhaseRef.current += 0.05 * hintConf.pulseSpeed;
      const pulseSize = 15 + Math.sin(pulsePhaseRef.current) * 8;
      const pulseAlpha = 0.2 + Math.sin(pulsePhaseRef.current) * 0.1;

      if (cursorRef.current.x > 0 && cursorRef.current.y > 0) {
        ctx.beginPath();
        ctx.arc(cursorRef.current.x, cursorRef.current.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = hintConf.glowColor;
        ctx.globalAlpha = pulseAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Cursor dot
        ctx.beginPath();
        ctx.arc(cursorRef.current.x, cursorRef.current.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = hintConf.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cursorRef.current.x, cursorRef.current.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      // Draw found treasures
      for (const t of treasuresRef.current) {
        if (t.found) {
          // Glow
          const glowSize = 30 + Math.sin(pulsePhaseRef.current * 0.5) * 5;
          const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, glowSize);
          grd.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
          grd.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = grd;
          ctx.fillRect(t.x - glowSize, t.y - glowSize, glowSize * 2, glowSize * 2);

          // Emoji
          ctx.font = '28px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.emoji, t.x, t.y);
        }
      }

      // Proximity indicator for unfound treasures - show directional arrow subtly
      const unfound = treasuresRef.current.filter((t) => !t.found);
      if (unfound.length > 0 && cursorRef.current.x > 0 && hintRef.current !== 'freezing') {
        // Find nearest unfound
        let nearest = unfound[0];
        let nearDist = getDistance(cursorRef.current, nearest);
        for (const t of unfound) {
          const d = getDistance(cursorRef.current, t);
          if (d < nearDist) {
            nearDist = d;
            nearest = t;
          }
        }

        // Subtle compass needle pointing toward treasure
        if (hintRef.current === 'burning' || hintRef.current === 'hot') {
          const angle = Math.atan2(
            nearest.y - cursorRef.current.y,
            nearest.x - cursorRef.current.x
          );
          const arrowDist = 35;
          const ax = cursorRef.current.x + Math.cos(angle) * arrowDist;
          const ay = cursorRef.current.y + Math.sin(angle) * arrowDist;

          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-4, -4);
          ctx.lineTo(-4, 4);
          ctx.closePath();
          ctx.fillStyle = hintConf.color;
          ctx.globalAlpha = 0.5 + Math.sin(pulsePhaseRef.current) * 0.2;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // Draw unfound treasure count indicators at edges
      for (const t of unfound) {
        // Only draw edge indicators if treasure is off-screen or show subtle markers
        const edgePad = 20;
        const isNearEdge =
          t.x < edgePad || t.x > w - edgePad || t.y < edgePad || t.y > h - edgePad;
        if (isNearEdge) {
          ctx.beginPath();
          ctx.arc(
            Math.max(edgePad, Math.min(w - edgePad, t.x)),
            Math.max(edgePad, Math.min(h - edgePad, t.y)),
            5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.fill();
        }
      }

      // Celebration timer
      if (celebratingRef.current) {
        celebrationTimerRef.current--;
        if (celebrationTimerRef.current <= 0) {
          celebratingRef.current = false;
        }
      }

      // Update and draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.vx *= 0.99;
        p.life--;
        p.rotation += p.rotationSpeed;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        switch (p.shape) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'square':
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            break;
          case 'star':
            drawStar(0, 0, 5, p.size, p.size * 0.4, 0);
            ctx.fill();
            break;
          case 'triangle':
            drawTriangle(0, 0, p.size, 0);
            ctx.fill();
            break;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Draw hint text on canvas
      if (cursorRef.current.x > 0 && searchCountRef.current > 0) {
        const label = hintConf.label;
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Background pill
        const metrics = ctx.measureText(label);
        const px = cursorRef.current.x;
        const py = cursorRef.current.y - 30;
        const pw = metrics.width + 20;
        const ph = 28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(px - pw / 2, py - ph, pw, ph, 14);
        ctx.fill();

        ctx.fillStyle = hintConf.color;
        ctx.fillText(label, px, py - 5);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, canvasSize]);

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isPlaying || celebratingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const fakeEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent<HTMLCanvasElement>;
      handleClick(fakeEvent);
    },
    [isPlaying, handleClick]
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouch}
      className="w-full h-full cursor-crosshair rounded-2xl"
      style={{ touchAction: 'none' }}
    />
  );
}
