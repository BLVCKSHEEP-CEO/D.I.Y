import { useState } from 'react';
import { Link } from 'react-router-dom';

const threadLineColors = ['bg-electric', 'bg-action', 'bg-neon', 'bg-amber'];

function Comment({ comment, level = 0, onReply, canReply = true, onRequireAuth }) {
  const lineColor = threadLineColors[level % threadLineColors.length];
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  function submitReply(event) {
    event.preventDefault();
    const content = replyText.trim();
    if (!content) return;

    onReply(comment.id, content);
    setReplyText('');
    setReplyOpen(false);
  }

  return (
    <article className="flash-enter">
      <div className="diy-card p-4 sm:p-5">
        <header className="mb-3 flex flex-wrap items-center gap-2">
          <span className="sticker-tag bg-neon text-ink">{comment.category}</span>
          <Link to={`/u/${comment.author}`} className="text-base font-bold hover:underline sm:text-lg">
            {comment.author}
          </Link>
          <span className="font-mono text-xs sm:text-sm">ERR:{comment.errorCode}</span>
          <span className="ml-auto rounded-none border-2 border-black bg-white px-2 py-1 font-mono text-[11px] shadow-hard">
            {comment.createdAt}
          </span>
        </header>

        <p className="mb-3 text-sm leading-relaxed sm:text-base">{comment.content}</p>

        {comment.tags?.length ? (
          <div className="mb-1 flex flex-wrap gap-2">
            {comment.tags.map((tag) => (
              <span key={tag} className="sticker-tag bg-electric text-white">
                [{tag}]
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            onClick={() => {
              if (!canReply) {
                onRequireAuth?.();
                return;
              }
              setReplyOpen((prev) => !prev);
            }}
            type="button"
          >
            {canReply ? (replyOpen ? 'Cancel' : 'Reply') : 'Sign In To Reply'}
          </button>
        </div>

        {replyOpen ? (
          <form className="mt-3 grid gap-2" onSubmit={submitReply}>
            <textarea
              className="input-brutal min-h-24"
              placeholder="Write your response"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
            />
            <button
              className="pressable w-fit bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              type="submit"
            >
              Post Reply
            </button>
          </form>
        ) : null}
      </div>

      {comment.replies?.length ? (
        <div className="mt-3 pl-3 sm:pl-6">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="mb-3 flex gap-3 sm:gap-4">
              <div className={`thread-line ${lineColor}`} />
              <div className="min-w-0 flex-1">
                <Comment
                  comment={reply}
                  level={level + 1}
                  onReply={onReply}
                  canReply={canReply}
                  onRequireAuth={onRequireAuth}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default Comment;







