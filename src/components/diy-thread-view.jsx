import Comment from './Comment';

const demoThread = {
  id: 1,
  author: 'nari_87',
  category: 'Soldering',
  errorCode: '0xA7',
  createdAt: '2h ago',
  tags: ['GPU', 'Repair', 'VRM'],
  content:
    'My RTX card powers on for 3 seconds then shuts down. Reflow did not help. Looking for board-level advice before I bin it.',
  replies: [
    {
      id: 2,
      author: 'framefuse',
      category: 'Hardware',
      errorCode: '0x1C',
      createdAt: '95m ago',
      tags: ['Multimeter'],
      content:
        'Start with resistance checks on the 12V rail and compare against known-good values. If near-short, isolate phases one by one.',
      replies: [
        {
          id: 3,
          author: 'chipherd',
          category: 'Guide',
          errorCode: '0x2E',
          createdAt: '70m ago',
          tags: ['MOSFET', 'Pad View'],
          content:
            'I posted a pad map and continuity points in the docs channel. Probe around the low-side MOSFET cluster first.',
          replies: []
        }
      ]
    },
    {
      id: 4,
      author: 'sigstack',
      category: 'Software',
      errorCode: '0x09',
      createdAt: '45m ago',
      tags: ['Linux', 'Driver'],
      content:
        'Also dump VBIOS and test in a Linux live USB to rule out a firmware or power-management profile issue.',
      replies: []
    }
  ]
};

export default function DiyThreadView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void mb-6 p-4 sm:p-6">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-neon">
          D.I.Y x Horizons
        </p>
        <h1 className="mb-3 text-3xl font-bold leading-none sm:text-5xl">Repair Threads</h1>
        <p className="max-w-3xl text-sm sm:text-base">
          A bold, tactile community feed for hardware and software fixes. Browse stacked cards,
          drill into linked replies, and document every failed experiment until something works.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="pressable bg-action px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
            New Repair Thread
          </button>
          <button className="pressable bg-electric px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
            Browse Categories
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="diy-card p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-wide">Current feed</p>
          <h2 className="text-2xl font-bold sm:text-3xl">RTX 3070 no-post after micro-surge</h2>
        </div>

        <Comment comment={demoThread} />
      </section>
    </main>
  );
}







