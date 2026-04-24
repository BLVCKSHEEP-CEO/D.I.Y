import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

const navItems = [
  { to: '/', label: 'AI Assistant' },
  { to: '/community', label: 'Community' },
  { to: '/new', label: 'New Topic' },
  { to: '/knowledge', label: 'Knowledge Base' }
];

export default function Shell() {
  const { isVerified, user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="diy-card-void p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">D.I.Y x Horizons</p>
              <h1 className="mt-2 text-3xl font-bold leading-none sm:text-5xl">AI-First Repair Copilot</h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base">
                Start with AI diagnosis, validate with the community, then capture fixes in the knowledge base.
              </p>
              <p className="mt-3 font-mono text-xs uppercase tracking-wide">
                {isVerified
                  ? `Signed in: ${user?.name || 'account'}`
                  : 'Not verified'}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to="/account"
                className="pressable bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              >
                Account
              </Link>
              {isVerified ? (
                <button
                  className="pressable bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
                  onClick={logout}
                  type="button"
                >
                  Logout
                </button>
              ) : (
                <Link
                  className="pressable bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                  to="/signin"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 border-2 border-black bg-white p-3 shadow-hard">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">What do you want to do?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/"
                className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              >
                Start AI Diagnosis
              </Link>
              <Link
                to="/community"
                className="pressable bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                Browse Community
              </Link>
              <Link
                to="/knowledge"
                className="pressable bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                Open Fix Library
              </Link>
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `pressable px-4 py-2 text-sm font-bold uppercase tracking-wide ${
                  isActive ? 'bg-electric text-white' : 'bg-white text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet />

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6">
        <div className="diy-card p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            Built for practical repair logs, reproducible fixes, and zero gatekeeping.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/privacy"
              className="pressable bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="pressable bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}







