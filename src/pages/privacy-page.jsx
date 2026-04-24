export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Legal</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Privacy Policy</h2>
        <p className="mt-3 text-sm sm:text-base">
          This app stores account and community data required to provide authentication, messaging,
          moderation, and troubleshooting features.
        </p>
      </section>

      <section className="diy-card mt-5 grid gap-3 p-4 sm:p-5 text-sm">
        <p>We collect account metadata, community posts, direct messages, and moderation actions.</p>
        <p>We use Supabase for authentication and persistence. Gemini API is used for assistant responses.</p>
        <p>Do not include sensitive personal, financial, or biometric data in repair threads.</p>
        <p>Contact support to request account-data removal in production deployments.</p>
      </section>
    </main>
  );
}







