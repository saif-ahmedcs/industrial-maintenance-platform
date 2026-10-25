import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../design/Button';
import { IconButton } from '../design/IconButton';
import { NavLink } from '../design/NavLink';
import { StatusTag } from '../design/StatusTag';
import { listNotifications } from '../features/alerts/api';
import { can, type Role } from '../lib/auth/roles';
import { signOut, useSession } from '../lib/auth/session';
import { formatNumber } from '../lib/format';

const POLL_INTERVAL_MS = 30_000;

interface NavItem {
  label: string;
  to: string;
  guard?: (roles: Role[]) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'OVERVIEW', to: '/' },
  { label: 'ASSETS', to: '/assets' },
  { label: 'WORK ORDERS', to: '/work-orders' },
  { label: 'INVENTORY', to: '/spare-parts' },
  { label: 'TELEMETRY', to: '/telemetry' },
  { label: 'ALERTS', to: '/alerts' },
  { label: 'AUDIT', to: '/audit', guard: can.viewAudit },
];

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const { user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const unreadAlertsQuery = useQuery({
    queryKey: ['notifications', 'list', { status: 'UNREAD', limit: 5 }],
    queryFn: () => listNotifications({ status: 'UNREAD', limit: 5 }),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: Boolean(user),
  });
  const unreadCount = unreadAlertsQuery.data?.meta.total ?? 0;

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.guard || item.guard(user.roles),
  );

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative z-10">
        <div className="mx-auto flex h-20 w-full max-w-page items-center justify-between gap-4 px-9">
          <Link
            to="/"
            className="font-display text-eyebrow font-medium uppercase text-text-platinum"
          >
            Industrial Maintenance
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                active={isActive(location.pathname, item.to)}
                className="inline-flex items-center gap-1.5"
              >
                {item.label}
                {item.to === '/alerts' && unreadCount > 0 && (
                  <span className="rounded-small border border-surface-slate bg-surface-abyss px-1.5 py-0.5 font-display text-caption font-normal text-accent-lavender">
                    {formatNumber(unreadCount)}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <span className="font-display text-label text-text-silver">
              {user.email}
            </span>
            <div className="flex items-center gap-1.5">
              {user.roles.map((role) => (
                <StatusTag key={role} status={role} showDot={false} />
              ))}
            </div>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>

          <IconButton
            icon={mobileOpen ? 'close' : 'menu'}
            label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
            className="lg:hidden"
          />
        </div>

        {mobileOpen && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="flex flex-col gap-1 bg-surface-abyss px-9 py-6 lg:hidden"
          >
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                active={isActive(location.pathname, item.to)}
                className="inline-flex items-center gap-1.5 py-2"
              >
                {item.label}
                {item.to === '/alerts' && unreadCount > 0 && (
                  <span className="rounded-small border border-surface-slate bg-surface-abyss px-1.5 py-0.5 font-display text-caption font-normal text-accent-lavender">
                    {formatNumber(unreadCount)}
                  </span>
                )}
              </NavLink>
            ))}

            <div className="mt-4 flex flex-col gap-3 pt-4">
              <span className="font-display text-label text-text-silver">
                {user.email}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {user.roles.map((role) => (
                  <StatusTag key={role} status={role} showDot={false} />
                ))}
              </div>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-9 py-9">
        <Outlet />
      </main>
    </div>
  );
}
