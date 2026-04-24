import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

export default function VerifiedGate({ children, title = 'Verified Account Required' }) {
  const { isVerified, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="diy-card p-5 sm:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Auth</p>
          <h2 className="mt-2 text-2xl font-bold leading-none">Checking Session</h2>
          <p className="mt-3 text-sm sm:text-base">Please wait...</p>
        </section>
      </main>
    );
  }

  if (isVerified) {
    return children;
  }

  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/signin?next=${next}&reason=${encodeURIComponent(title)}`} replace />;
}







