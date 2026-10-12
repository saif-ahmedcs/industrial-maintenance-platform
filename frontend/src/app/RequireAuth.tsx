import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '../design/Skeleton';
import { Surface } from '../design/Surface';
import { useSession } from '../lib/auth/session';

export interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'restoring') {
    return (
      <div className="flex min-h-screen items-center justify-center p-9">
        <Surface className="w-full max-w-sm">
          <Skeleton lines={4} height={16} />
        </Surface>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
