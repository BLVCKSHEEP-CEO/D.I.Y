import { useEffect, useState } from 'react';
import RepairAssistantPanel from '../components/chat/repair-assistant-panel';

const ONBOARDING_KEY = 'diy.onboarding.dismissed';

const starterPrompts = {
  'S.T.E.M': 'MCU upload timeout after wiring sensor shield. What should I test first?',
  Hardware: 'Smart speaker dead after wrong adapter. Safe diagnostic checklist?',
  Software: 'App crashes after update. How do I isolate regression quickly?',
  Networking: 'Intermittent I2C or network noise under load. What measurements matter?'
};

export default function AssistantPage() {
  const [problemContext, setProblemContext] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(ONBOARDING_KEY) === '1';
    setShowOnboarding(!dismissed);
  }, []);

  function dismissOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="diy-card-void p-4 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">AI Assistant</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Primary Repair Intelligence</h2>
        <p className="mt-3 max-w-3xl text-sm sm:text-base">
          D.I.Y now starts with AI-first diagnostics. Share symptoms, images, and repair history to
          get actionable troubleshooting plans before posting publicly.
        </p>
      </section>

      {showOnboarding ? (
        <section className="mt-4 diy-card p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-[0.16em]">First-Time Guided Tour</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <article className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Step 1</p>
              <p className="mt-1 text-sm font-bold">Ask AI</p>
              <p className="mt-1 text-xs">Describe symptoms and upload photos for triage.</p>
            </article>
            <article className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Step 2</p>
              <p className="mt-1 text-sm font-bold">Post To Community</p>
              <p className="mt-1 text-xs">Validate diagnosis with peers and experts.</p>
            </article>
            <article className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Step 3</p>
              <p className="mt-1 text-sm font-bold">Save As Playbook</p>
              <p className="mt-1 text-xs">Turn successful fixes into reusable repair docs.</p>
            </article>
          </div>
          <button
            className="pressable mt-3 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            type="button"
            onClick={dismissOnboarding}
          >
            Dismiss Tour
          </button>
        </section>
      ) : null}

      <section className="mt-5">
        <article className="diy-card p-4 sm:p-5">
          <h3 className="text-xl font-bold">Problem Context</h3>
          <p className="mt-2 text-sm">
            The assistant will prioritize this context for every answer in the conversation.
          </p>
          <textarea
            className="input-brutal mt-3 min-h-44 w-full"
            placeholder="Example: Phone reboots at 40 percent battery after a screen replacement."
            value={problemContext}
            onChange={(event) => setProblemContext(event.target.value)}
          />
          <div className="mt-3 space-y-2">
            <p className="font-mono text-xs uppercase tracking-wide">Starter Prompts</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(starterPrompts).map(([category, prompt]) => (
                <button
                  key={category}
                  className="pressable bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink"
                  type="button"
                  onClick={() => setProblemContext(prompt)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em]">Live Assistant</p>
        <div className="diy-card p-2 sm:p-3">
          <RepairAssistantPanel problemContext={problemContext} />
        </div>
      </section>
    </main>
  );
}







