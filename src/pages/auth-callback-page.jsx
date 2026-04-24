import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isVerified, authError } = useAuth();

  useEffect(() => {
    if (isVerified) {
      navigate('/community', { replace: true });
    }
  }, [isVerified, navigate]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em]">OAuth Callback</p>
        <h2 className="mt-2 text-2xl font-bold leading-none">Completing Sign-In</h2>
        <p className="mt-3 text-sm sm:text-base">
          {authError || 'Please wait while we verify your account...'}
        </p>
      </section>
    </main>
  );
}







