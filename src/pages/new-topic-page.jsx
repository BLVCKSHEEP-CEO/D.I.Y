import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { categories } from '../data/threads';
import { createTopic } from '../lib/community-data';
import { trackEvent } from '../lib/telemetry';

export default function NewTopicPage() {
  const navigate = useNavigate();
  const { isVerified, user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function onPublish(event) {
    event.preventDefault();
    if (!isVerified) {
      navigate(
        `/signin?next=${encodeURIComponent('/new')}&reason=${encodeURIComponent(
          'Sign in is required to publish new topics.'
        )}`
      );
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setNotice('Title and issue description are required.');
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const topic = await createTopic({
        title: trimmedTitle,
        body: trimmedBody,
        category,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        authorHandle: user?.name || user?.email?.split('@')[0] || 'member'
      });
      navigate(`/topic/${topic.slug}`);
    } catch (err) {
      setNotice(err.message || 'Failed to publish topic.');
      trackEvent('new_topic_publish_error', { message: err.message || 'publish failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="diy-card-void p-4 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Create Topic</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Start A Repair Thread</h2>
      </section>

      <form className="diy-card mt-6 grid gap-4 p-4 sm:p-6" onSubmit={onPublish}>
        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">Title</span>
          <input
            className="input-brutal"
            placeholder="e.g. ThinkPad T480 random shutdown after SSD swap"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">Category</span>
          <select className="input-brutal" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">Issue Description</span>
          <textarea
            className="input-brutal min-h-40"
            placeholder="Include timeline, parts replaced, exact errors, and what you already tested..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">Tags (comma separated)</span>
          <input
            className="input-brutal"
            placeholder="GPU, BIOS, Soldering"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            className="pressable bg-action px-4 py-2 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Publishing...' : 'Publish Topic'}
          </button>
          <button className="pressable bg-electric px-4 py-2 text-sm font-bold uppercase tracking-wide text-white" type="button">
            Save Draft
          </button>
        </div>

        {notice ? (
          <p className="border-2 border-black bg-amber px-3 py-2 font-mono text-xs shadow-hard">{notice}</p>
        ) : null}
      </form>
    </main>
  );
}







