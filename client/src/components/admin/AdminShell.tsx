import { NavLink, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { LayoutDashboard, Database, AlertTriangle, MessageSquareWarning, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/kb', label: 'Knowledge Base', icon: Database, end: false },
  { to: '/admin/escalations', label: 'Escalations', icon: AlertTriangle, end: false },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquareWarning, end: false },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0 mesh-bg opacity-50" />
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-black/20 p-5 backdrop-blur-xl">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan shadow-glow-sm" />
            <span className="font-display text-lg text-ink">Synapse&nbsp;AI</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-cyan/10 text-cyan'
                      : 'text-muted hover:bg-white/5 hover:text-ink',
                  )
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/chat"
            className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} /> Back to chat
          </Link>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
