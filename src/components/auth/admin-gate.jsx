import { useEffect, useMemo, useState } from 'react';

const ADMIN_SESSION_KEY = 'diy-admin-auth-v1';
const ADMIN_FAILED_ATTEMPTS_KEY = 'diy-admin-failed-attempts-v1';
const ADMIN_LOCKOUT_UNTIL_KEY = 'diy-admin-lockout-until-v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function getStoredNumber(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clearSecurityState() {
  localStorage.removeItem(ADMIN_FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(ADMIN_LOCKOUT_UNTIL_KEY);
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export default function AdminGate({ children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(
    getStoredNumber(ADMIN_FAILED_ATTEMPTS_KEY)
  );
  const [lockoutUntil, setLockoutUntil] = useState(
    getStoredNumber(ADMIN_LOCKOUT_UNTIL_KEY)
  );
  const [now, setNow] = useState(Date.now());
  const [isAuthorized, setIsAuthorized] = useState(
    sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok'
  );

  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  const isLocked = lockoutUntil > now;
  const remainingSeconds = useMemo(() => {
    if (!isLocked) return 0;
    return Math.ceil((lockoutUntil - now) / 1000);
  }, [isLocked, lockoutUntil, now]);

  useEffect(() => {
    if (!isLocked) return undefined;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked]);

  useEffect(() => {
    if (lockoutUntil <= Date.now() && lockoutUntil !== 0) {
      setLockoutUntil(0);
      localStorage.removeItem(ADMIN_LOCKOUT_UNTIL_KEY);
    }
  }, [lockoutUntil]);

  function onSubmit(event) {
    event.preventDefault();

    if (isLocked) {
      setError(`Too many attempts. Try again in ${remainingSeconds}s.`);
      return;
    }

    if (!expectedPassword) {
      setError('Admin password is not configured. Set VITE_ADMIN_PASSWORD in .env.');
      return;
    }

    if (password === expectedPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok');
      clearSecurityState();
      setFailedAttempts(0);
      setLockoutUntil(0);
      setIsAuthorized(true);
      setError('');
      setPassword('');
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    localStorage.setItem(ADMIN_FAILED_ATTEMPTS_KEY, String(nextAttempts));

    if (nextAttempts >= MAX_ATTEMPTS) {
      const nextLockout = Date.now() + LOCKOUT_MS;
      setLockoutUntil(nextLockout);
      localStorage.setItem(ADMIN_LOCKOUT_UNTIL_KEY, String(nextLockout));
      setError(`Too many attempts. Locked for ${Math.floor(LOCKOUT_MS / 60000)} minutes.`);
      return;
    }

    setError(
      `Incorrect password. ${MAX_ATTEMPTS - nextAttempts} attempt${
        MAX_ATTEMPTS - nextAttempts === 1 ? '' : 's'
      } remaining.`
    );
  }

  if (isAuthorized) {
    return children;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-4 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Restricted</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Admin Access</h2>
        <p className="mt-3 text-sm sm:text-base">
          Enter admin password to unlock the control panel.
        </p>
      </section>

      <form className="diy-card mt-5 grid gap-3 p-4 sm:p-5" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">Password</span>
          <input
            type="password"
            className="input-brutal"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            placeholder="Enter admin password"
          />
        </label>

        {isLocked ? (
          <p className="border-2 border-black bg-amber px-3 py-2 font-mono text-xs text-ink shadow-hard">
            Security lock active: {remainingSeconds}s remaining.
          </p>
        ) : (
          <p className="font-mono text-xs uppercase tracking-wide">
            Attempts left before lockout: {Math.max(0, MAX_ATTEMPTS - failedAttempts)}
          </p>
        )}

        {error ? (
          <p className="border-2 border-black bg-action px-3 py-2 font-mono text-xs text-white shadow-hard">
            {error}
          </p>
        ) : null}

        <button
          className="pressable bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isLocked}
        >
          Unlock Admin
        </button>
      </form>
    </main>
  );
}







