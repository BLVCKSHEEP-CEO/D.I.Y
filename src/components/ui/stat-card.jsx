export default function StatCard({ label, value, tone = 'paper' }) {
  const toneClass = tone === 'void' ? 'diy-card-void' : 'diy-card';

  return (
    <article className={`${toneClass} p-4 sm:p-5`}>
      <p className="font-mono text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none sm:text-4xl">{value}</p>
    </article>
  );
}







