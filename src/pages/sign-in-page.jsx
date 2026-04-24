import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export default function SignInPage() {
  const {
    isVerified,
    authError,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    resendVerificationEmail,
    signInWithProvider,
    clearAuthError
  } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState('');
  const [busy, setBusy] = useState(false);

  const nextPath = params.get('next') || '/community';
  const reason = params.get('reason') || 'Sign in to continue.';

  useEffect(() => {
    if (isVerified) {
      navigate(nextPath, { replace: true });
    }
  }, [isVerified, navigate, nextPath]);

  async function run(action, successMessage = '') {
    setBusy(true);
    setLocalError('');
    setNotice('');
    clearAuthError();

    try {
      await action();
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication request failed.');
    } finally {
      setBusy(false);
    }
  }

  function emailIsPresent() {
    if ((email || '').trim()) return true;
    setLocalError('Enter your email address first.');
    return false;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Authentication</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Sign In</h2>
        <p className="mt-3 text-sm sm:text-base">{reason}</p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="diy-card p-4 sm:p-5">
          <h3 className="text-xl font-bold">Email Authentication</h3>
          <p className="mt-2 text-sm">Use your email and password to sign in or create an account.</p>

          <form className="mt-4 grid gap-3" onSubmit={(event) => event.preventDefault()}>
            <input
              className="input-brutal"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="input-brutal"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                className="pressable bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => signInWithEmail(email, password),
                    'Signed in successfully.'
                  )
                }
              >
                Sign In
              </button>
              <button
                className="pressable bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => signUpWithEmail(email, password),
                    'Account created. Check your inbox to verify your email if prompted.'
                  )
                }
              >
                Create Account
              </button>
            </div>

            <div className="mt-1 flex flex-wrap gap-2">
              <button
                className="pressable bg-amber px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!emailIsPresent()) return;
                  run(
                    () => sendPasswordResetEmail(email),
                    'Password reset email sent. Check your inbox.'
                  );
                }}
              >
                Forgot Password
              </button>
              <button
                className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!emailIsPresent()) return;
                  run(
                    () => resendVerificationEmail(email),
                    'Verification email resent. Check your inbox.'
                  );
                }}
              >
                Resend Verification
              </button>
            </div>
          </form>

          {localError || authError ? (
            <p className="mt-3 border-2 border-black bg-action px-3 py-2 font-mono text-xs text-white shadow-hard">
              {localError || authError}
            </p>
          ) : null}

          {notice ? (
            <p className="mt-3 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">
              {notice}
            </p>
          ) : null}
        </article>

        <article className="diy-card p-4 sm:p-5">
          <h3 className="text-xl font-bold">Social Sign-In</h3>
          <p className="mt-2 text-sm">Use your provider account for OAuth login.</p>

          <div className="mt-4 grid gap-2">
            <button
              className="pressable bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
              type="button"
              disabled={busy}
              onClick={() => run(() => signInWithProvider('google'))}
            >
              Continue With Google
            </button>
            <button
              className="pressable bg-action px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
              type="button"
              disabled={busy}
              onClick={() => run(() => signInWithProvider('apple'))}
            >
              Continue With Apple
            </button>
          </div>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-wide">
            OAuth returns through /auth/callback then redirects to your requested page.
          </p>

          <Link
            to="/assistant"
            className="pressable mt-4 inline-flex bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
          >
            Back To Assistant
          </Link>
        </article>
      </section>
    </main>
  );
}







