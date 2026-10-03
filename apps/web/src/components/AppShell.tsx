import { Link } from '@tanstack/react-router';
import { Activity, BedDouble, LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';

const nav = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/internacoes', label: 'Internações', icon: BedDouble },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen md:sticky md:top-0 shrink-0">
        <div className="flex items-center gap-2 px-5 py-4 md:py-6">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Gestão Hospitalar</span>
        </div>
        <nav className="flex md:flex-col gap-1 px-3 pb-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              search={
                to === '/' ? { dias: 30 } : { pagina: 1, ordem: 'admissionDate', dir: 'desc' }
              }
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm opacity-75 hover:opacity-100 hover:bg-primary/20"
              activeProps={{ className: 'bg-primary/25 !opacity-100 font-medium' }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-lg border bg-card p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
