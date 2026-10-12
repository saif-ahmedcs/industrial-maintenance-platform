import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasAny, type Role } from '../lib/auth/roles';
import { useSession } from '../lib/auth/session';

export interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useSession();

  if (!hasAny(user?.roles ?? [], roles)) {
    return <Navigate to="/not-permitted" replace />;
  }

  return <>{children}</>;
}
