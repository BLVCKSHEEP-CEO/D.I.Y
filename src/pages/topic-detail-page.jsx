import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import RepairAssistantPanel from '../components/chat/repair-assistant-panel';
import Comment from '../components/comment';
import StatusPill from '../components/ui/status-pill';
import StickerTag from '../components/ui/sticker-tag';
import { fetchThreadByTopicId, fetchTopicBySlug, addReply as addCommunityReply, fetchTopics } from '../lib/community-data';
import { trackEvent } from '../lib/telemetry';

function addReplyToTree(node, targetId, newReply) {
  if (!node) return node;
  if (node.id === targetId) {
    return {
      ...node,
      replies: [...(node.replies || []), newReply]
    };
  }

  return {
    ...node,
    replies: (node.replies || []).map((reply) => addReplyToTree(reply, targetId, newReply))
  };
}

export default function TopicDetailPage() {
  const navigate = useNavigate();
  const { isVerified, user } = useAuth();
  const { slug } = useParams();
  const [topic, setTopic] = useState(null);
  const [relatedTopics, setRelatedTopics] = useState([]);
  const [thread, setThread] = useState(null);
  const [rootReply, setRootReply] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTopicData() {
      setLoading(true);
      try {
        const nextTopic = await fetchTopicBySlug(slug || '');
        const allTopics = await fetchTopics();

        if (cancelled) return;
        setTopic(nextTopic);

        if (nextTopic?.id) {
          const nextThread = await fetchThreadByTopicId(nextTopic.id);
          if (!cancelled) {
            setThread(nextThread);
          }
          setRelatedTopics(allTopics.filter((item) => item.id !== nextTopic.id).slice(0, 2));
        } else {
          setThread(null);
          setRelatedTopics([]);
        }
      } catch (err) {
        if (!cancelled) {
          trackEvent('topic_detail_load_error', { message: err.message || 'load failed', slug });
          setTopic(null);
          setThread(null);
          setRelatedTopics([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRootReply('');
        }
      }
    }

    loadTopicData();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <article className="diy-card p-5 sm:p-6">
          <h2 className="text-2xl font-bold">Loading topic...</h2>
        </article>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <article className="diy-card p-5 sm:p-6">
          <h2 className="text-2xl font-bold">Topic not found</h2>
          <Link to="/" className="pressable mt-4 inline-flex bg-electric px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
            Return To Feed
          </Link>
        </article>
      </main>
    );
  }

  const problemContext = [
    `Title: ${topic.title}`,
    `Category: ${topic.category}`,
    `Status: ${topic.status}`,
    `Body: ${topic.body}`,
    `Tags: ${topic.tags.join(', ')}`
  ].join('\n');

  async function handleReply(targetId, content) {
    if (!isVerified) {
      navigate(
        `/signin?next=${encodeURIComponent(`/topic/${topic.slug}`)}&reason=${encodeURIComponent(
          'Sign in is required to reply to messages.'
        )}`
      );
      return;
    }

    try {
      const persisted = await addCommunityReply({
        topicId: topic.id,
        parentReplyId: targetId,
        authorHandle: user?.name || user?.email?.split('@')[0] || 'member',
        category: 'Community',
        body: content,
        tags: []
      });

      if (!persisted) return;

      setThread((prev) => addReplyToTree(prev, targetId, persisted));
    } catch (err) {
      trackEvent('topic_reply_error', { message: err.message || 'reply failed', topicId: topic.id });
    }
  }

  async function submitRootReply(event) {
    event.preventDefault();
    if (!isVerified) {
      navigate(
        `/signin?next=${encodeURIComponent(`/topic/${topic.slug}`)}&reason=${encodeURIComponent(
          'Sign in is required to post thread responses.'
        )}`
      );
      return;
    }

    const content = rootReply.trim();
    if (!content || !thread) return;

    await handleReply(thread.id, content);
    setRootReply('');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="diy-card-void p-4 sm:p-6 flash-enter">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StickerTag tone="plain">{topic.category}</StickerTag>
          <StatusPill status={topic.status} />
          <Link to={`/u/${topic.author}`} className="sticker-tag bg-neon text-ink">
            @{topic.author}
          </Link>
          <span className="rounded-none border-2 border-black bg-white px-2 py-1 font-mono text-[11px] text-ink shadow-hard">
            updated {topic.updatedAt}
          </span>
        </div>
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{topic.title}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed sm:text-base">{topic.body}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {topic.tags.map((tag) => (
            <StickerTag key={tag} tone="electric">
              [{tag}]
            </StickerTag>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-4">
        {thread ? (
          <Comment
            comment={thread}
            onReply={handleReply}
            canReply={isVerified}
            onRequireAuth={() =>
              navigate(
                `/signin?next=${encodeURIComponent(`/topic/${topic.slug}`)}&reason=${encodeURIComponent(
                  'Sign in is required to reply to comments.'
                )}`
              )
            }
          />
        ) : null}

        {thread ? (
          <form className="diy-card grid gap-2 p-4 sm:p-5" onSubmit={submitRootReply}>
            <h3 className="text-lg font-bold">Respond To Thread</h3>
            <textarea
              className="input-brutal min-h-28"
              placeholder="Share your troubleshooting step, findings, or solution"
              value={rootReply}
              onChange={(event) => setRootReply(event.target.value)}
            />
            <button
              className="pressable w-fit bg-action px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              type="submit"
            >
              {isVerified ? 'Post Thread Response' : 'Sign In To Respond'}
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-7">
        <RepairAssistantPanel
          title="Thread Assistant"
          problemContext={problemContext}
        />
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        {relatedTopics.map((item) => (
          <article key={item.id} className="diy-card p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-wide">Related topic</p>
            <h3 className="mt-2 text-xl font-bold leading-tight">{item.title}</h3>
            <p className="mt-2 text-sm">{item.excerpt}</p>
            <Link
              to={`/topic/${item.slug}`}
              className="pressable mt-4 inline-flex bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
            >
              Open
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}







