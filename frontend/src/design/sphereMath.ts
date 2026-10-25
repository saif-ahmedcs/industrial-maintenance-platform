export const DEFAULT_POINT_COUNT = 900;
export const MAX_POINT_COUNT = 1200;
export const MIN_POINT_COUNT = 120;
export const BASELINE_SIZE_PX = 480;
export const ROTATION_STEP = 0.006;
export const MAX_DEVICE_PIXEL_RATIO = 2;

export const SPHERE_COLORS = {
  tealCyan: '#00827c',
  white: '#ffffff',
  edgePink: '#fde9ff',
} as const;

export const WHITE_POINT_FRACTION = 0.12;
export const EDGE_RADIAL_THRESHOLD = 0.92;

export interface SpherePoint {
  x: number;
  y: number;
  z: number;
  isWhite: boolean;
}

export function generateSpherePoints(count: number): SpherePoint[] {
  const safeCount = Math.max(0, Math.floor(count));
  const points: SpherePoint[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < safeCount; i++) {
    const y = safeCount > 1 ? 1 - (i / (safeCount - 1)) * 2 : 0;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    points.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
      isWhite: ((i * 2654435761) % 1000) / 1000 < WHITE_POINT_FRACTION,
    });
  }

  return points;
}

export function pointCountForSize(sizePx: number): number {
  const scaled = Math.round(DEFAULT_POINT_COUNT * (sizePx / BASELINE_SIZE_PX));
  return Math.min(MAX_POINT_COUNT, Math.max(MIN_POINT_COUNT, scaled));
}

export interface ProjectedPoint {
  screenX: number;
  screenY: number;
  depth: number;
  radial: number;
  isWhite: boolean;
}

export function projectPoint(
  point: SpherePoint,
  angle: number,
): ProjectedPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedX = point.x * cos + point.z * sin;
  const rotatedZ = -point.x * sin + point.z * cos;

  return {
    screenX: rotatedX,
    screenY: point.y,
    depth: (rotatedZ + 1) / 2,
    radial: Math.sqrt(rotatedX * rotatedX + point.y * point.y),
    isWhite: point.isWhite,
  };
}
