import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">404</p>
        <h2 className="mt-2 text-4xl font-bold leading-none">Thread Not Found</h2>
        <p className="mt-3 text-sm sm:text-base">
          This URL does not map to a topic or page in D.I.Y.
        </p>
        <Link to="/" className="pressable mt-5 inline-flex bg-electric px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
          Back To AI Assistant
        </Link>
      </section>
    </main>
  );
}







