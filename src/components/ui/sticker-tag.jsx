export default function StickerTag({ children, tone = 'electric' }) {
  const toneClass = {
    electric: 'bg-electric text-white',
    neon: 'bg-neon text-ink',
    action: 'bg-action text-white',
    amber: 'bg-amber text-ink',
    plain: 'bg-white text-ink'
  }[tone];

  return <span className={`sticker-tag ${toneClass || 'bg-white text-ink'}`}>{children}</span>;
}







