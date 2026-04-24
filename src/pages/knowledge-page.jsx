import StickerTag from '../components/ui/sticker-tag';
import { commonFixes, playbooks } from '../data/fixes';

export default function KnowledgePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="diy-card-void p-4 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Knowledge Base</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Reusable Repair Playbooks</h2>
        <p className="mt-3 max-w-3xl text-sm sm:text-base">
          Convert solved threads into durable documentation so fixes outlive chat history.
        </p>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="diy-card p-4">
          <p className="font-mono text-xs uppercase tracking-wide">Step 1</p>
          <h3 className="mt-1 text-lg font-bold">Find A Similar Issue</h3>
          <p className="mt-2 text-sm">Use quick fixes for immediate checks before deeper diagnostics.</p>
        </article>
        <article className="diy-card p-4">
          <p className="font-mono text-xs uppercase tracking-wide">Step 2</p>
          <h3 className="mt-1 text-lg font-bold">Open A Playbook</h3>
          <p className="mt-2 text-sm">Follow a tested process with level and format labels.</p>
        </article>
        <article className="diy-card p-4">
          <p className="font-mono text-xs uppercase tracking-wide">Step 3</p>
          <h3 className="mt-1 text-lg font-bold">Escalate If Needed</h3>
          <p className="mt-2 text-sm">If the fix fails, move to Community and share your findings.</p>
        </article>
      </section>

      <section className="mt-7">
        <div className="diy-card p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Common Fixes</p>
          <h3 className="mt-2 text-2xl font-bold leading-none sm:text-3xl">
            S.T.E.M, PC, and Phone Repair Quick Wins
          </h3>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {commonFixes.map((fix) => (
            <article key={fix.id} className="diy-card p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <StickerTag tone="neon">{fix.domain}</StickerTag>
                <StickerTag tone="action">Common</StickerTag>
              </div>

              <h4 className="text-lg font-bold leading-tight">{fix.problem}</h4>

              <div className="mt-3">
                <p className="font-mono text-xs uppercase tracking-wide">Symptoms</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {fix.symptoms.map((symptom) => (
                    <li key={symptom}>- {symptom}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <p className="font-mono text-xs uppercase tracking-wide">Fix Steps</p>
                <ol className="mt-2 space-y-1 text-sm">
                  {fix.steps.map((step, index) => (
                    <li key={step}>
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-3 border-2 border-black bg-amber px-2 py-2 font-mono text-xs shadow-hard">
                Safety: {fix.safety}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Detailed Playbooks</p>
        </div>
        {playbooks.map((playbook) => (
          <article key={playbook.title} className="diy-card p-4 sm:p-5">
            <h3 className="text-xl font-bold leading-tight">{playbook.title}</h3>
            <p className="mt-2 text-sm sm:text-base">{playbook.summary}</p>
            <div className="mt-4 flex gap-2">
              <StickerTag tone="amber">{playbook.level}</StickerTag>
              <StickerTag tone="electric">{playbook.format}</StickerTag>
            </div>
            <button className="pressable mt-4 bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
              Open Playbook
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}







