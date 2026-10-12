import { describe, expect, it } from 'vitest';
import { can, hasAny, type Role } from './roles';

const ALL_ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER'];

const EXPECTED_PERMISSIONS: Record<keyof typeof can, Role[]> = {
  managePlants: ['ADMIN', 'SUPERVISOR'],
  manageLocations: ['ADMIN', 'SUPERVISOR'],
  manageAssetTypes: ['ADMIN', 'SUPERVISOR'],
  manageAssets: ['ADMIN', 'SUPERVISOR'],
  manageMaintenancePlans: ['ADMIN', 'SUPERVISOR'],
  createWorkOrder: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  transitionWorkOrder: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  cancelWorkOrder: ['ADMIN', 'SUPERVISOR'],
  manageSpareParts: ['ADMIN', 'SUPERVISOR'],
  adjustStock: ['ADMIN', 'SUPERVISOR'],
  acknowledgeAlert: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  resolveAlert: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  viewAudit: ['ADMIN', 'SUPERVISOR'],
};

describe('hasAny', () => {
  it('is true when at least one role is in the allowed list', () => {
    expect(hasAny(['TECHNICIAN'], ['ADMIN', 'TECHNICIAN'])).toBe(true);
  });

  it('is false when no role is in the allowed list', () => {
    expect(hasAny(['VIEWER'], ['ADMIN', 'SUPERVISOR'])).toBe(false);
  });

  it('is false for an empty roles array, regardless of what is allowed', () => {
    expect(hasAny([], ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER'])).toBe(
      false,
    );
  });

  it('considers every role when a user holds more than one', () => {
    expect(hasAny(['VIEWER', 'SUPERVISOR'], ['SUPERVISOR'])).toBe(true);
  });
});

describe('can', () => {
  for (const [action, allowedRoles] of Object.entries(EXPECTED_PERMISSIONS) as [
    keyof typeof can,
    Role[],
  ][]) {
    describe(action, () => {
      for (const role of ALL_ROLES) {
        const shouldBeAllowed = allowedRoles.includes(role);
        it(`${shouldBeAllowed ? 'allows' : 'denies'} a ${role}-only user`, () => {
          expect(can[action]([role])).toBe(shouldBeAllowed);
        });
      }

      it('denies a user with no roles', () => {
        expect(can[action]([])).toBe(false);
      });
    });
  }

  it('covers exactly the actions in docs/data-contract.md, nothing more or less', () => {
    expect(Object.keys(can).sort()).toEqual(
      Object.keys(EXPECTED_PERMISSIONS).sort(),
    );
  });
});
