import { useEffect, useRef, useState } from 'react';
import {
  EDGE_RADIAL_THRESHOLD,
  MAX_DEVICE_PIXEL_RATIO,
  ROTATION_STEP,
  SPHERE_COLORS,
  generateSpherePoints,
  pointCountForSize,
  projectPoint,
  type SpherePoint,
} from './sphereMath';

export interface SphereProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

function getPrefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Sphere({
  size = 240,
  animated = true,
  className,
}: SphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<SpherePoint[]>([]);
  const angleRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  );
  const [tabVisible, setTabVisible] = useState(
    () =>
      typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const [inViewport, setInViewport] = useState(true);

  const classes = ['pointer-events-none', className].filter(Boolean).join(' ');

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () =>
      setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate =
    animated && !prefersReducedMotion && tabVisible && inViewport;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pointsRef.current = generateSpherePoints(pointCountForSize(size));

    const center = size / 2;
    const radius = size / 2;

    function drawFrame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      for (const point of pointsRef.current) {
        const projected = projectPoint(point, angleRef.current);
        const screenX = center + projected.screenX * radius;
        const screenY = center + projected.screenY * radius;

        const isEdge = projected.radial >= EDGE_RADIAL_THRESHOLD;
        const color = isEdge
          ? SPHERE_COLORS.edgePink
          : projected.isWhite
            ? SPHERE_COLORS.white
            : SPHERE_COLORS.tealCyan;

        const dotRadius = 1.4 + projected.depth * 2.6;
        const alpha = 0.35 + projected.depth * 0.65;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    function tick() {
      angleRef.current += ROTATION_STEP;
      drawFrame();
      frameRef.current = requestAnimationFrame(tick);
    }

    if (shouldAnimate) {
      frameRef.current = requestAnimationFrame(tick);
    } else {
      drawFrame();
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [size, shouldAnimate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="sphere-canvas"
      className={classes}
      style={{ width: size, height: size }}
    />
  );
}
