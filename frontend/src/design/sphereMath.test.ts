import { describe, expect, it } from 'vitest';
import {
  BASELINE_SIZE_PX,
  DEFAULT_POINT_COUNT,
  MAX_POINT_COUNT,
  MIN_POINT_COUNT,
  generateSpherePoints,
  pointCountForSize,
  projectPoint,
} from './sphereMath';

describe('pointCountForSize', () => {
  it('returns the Phase 25.1 default count at the baseline size', () => {
    expect(pointCountForSize(BASELINE_SIZE_PX)).toBe(DEFAULT_POINT_COUNT);
  });

  it('never exceeds the Phase 16.2 cap, even for a very large sphere', () => {
    expect(pointCountForSize(10_000)).toBe(MAX_POINT_COUNT);
  });

  it('never drops below the floor, even for a tiny sphere', () => {
    expect(pointCountForSize(1)).toBe(MIN_POINT_COUNT);
  });
});

describe('generateSpherePoints', () => {
  it('generates exactly the requested number of points', () => {
    expect(generateSpherePoints(900)).toHaveLength(900);
  });

  it('places every point on the unit sphere', () => {
    for (const point of generateSpherePoints(200)) {
      const magnitude = Math.sqrt(
        point.x * point.x + point.y * point.y + point.z * point.z,
      );
      expect(magnitude).toBeCloseTo(1, 5);
    }
  });

  it('is deterministic for a given count', () => {
    expect(generateSpherePoints(50)).toEqual(generateSpherePoints(50));
  });
});

describe('projectPoint', () => {
  it('leaves a point unrotated at angle 0', () => {
    const point = { x: 0.5, y: 0.25, z: 0.5, isWhite: false };
    const projected = projectPoint(point, 0);
    expect(projected.screenX).toBeCloseTo(0.5, 10);
    expect(projected.screenY).toBe(0.25);
  });

  it('rotates a point a full turn back to its start', () => {
    const point = { x: 0.3, y: 0.1, z: 0.8, isWhite: true };
    const projected = projectPoint(point, Math.PI * 2);
    expect(projected.screenX).toBeCloseTo(0.3, 5);
  });
});
