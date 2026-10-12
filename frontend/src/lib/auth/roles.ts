import type { Role } from '../../features/auth/api';

export type { Role };

export function hasAny(roles: Role[], allowed: Role[]): boolean {
  return roles.some((role) => allowed.includes(role));
}

export const can = {
  // POST/PATCH/DELETE /plants
  managePlants: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST/PATCH/DELETE /locations
  manageLocations: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST/PATCH/DELETE /asset-types
  manageAssetTypes: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST/PATCH/DELETE /assets, PATCH /assets/:id/status
  manageAssets: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST/PATCH/DELETE /maintenance-plans
  manageMaintenancePlans: (roles: Role[]) =>
    hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST /work-orders
  createWorkOrder: (roles: Role[]) =>
    hasAny(roles, ['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
  // PATCH /work-orders/:id/assign, /start, /complete
  transitionWorkOrder: (roles: Role[]) =>
    hasAny(roles, ['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
  // PATCH /work-orders/:id/cancel
  cancelWorkOrder: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST/PATCH/DELETE /spare-parts
  manageSpareParts: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // POST /spare-parts/:id/restock, /adjust
  adjustStock: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
  // PATCH /notifications/:id/acknowledge
  acknowledgeAlert: (roles: Role[]) =>
    hasAny(roles, ['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
  // PATCH /notifications/:id/resolve
  resolveAlert: (roles: Role[]) =>
    hasAny(roles, ['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
  // GET /audit (the whole controller is role-gated, not just writes)
  viewAudit: (roles: Role[]) => hasAny(roles, ['ADMIN', 'SUPERVISOR']),
};
