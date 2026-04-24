export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Legal</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Terms of Use</h2>
        <p className="mt-3 text-sm sm:text-base">
          By using this platform, you agree to follow community standards and safety-first repair practices.
        </p>
      </section>

      <section className="diy-card mt-5 grid gap-3 p-4 sm:p-5 text-sm">
        <p>Users are responsible for their own repair actions and safety precautions.</p>
        <p>Do not post abusive, illegal, or dangerous instructions intended to cause harm.</p>
        <p>Admin moderation decisions may remove content that violates policy.</p>
        <p>The service may change features or availability without prior notice.</p>
      </section>
    </main>
  );
}







