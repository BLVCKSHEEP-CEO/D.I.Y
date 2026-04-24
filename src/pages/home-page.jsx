import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { categories, threadByTopicId, topics } from '../data/threads';
import { commonFixes } from '../data/fixes';
import { addReply, fetchThreadByTopicId, fetchTopics } from '../lib/community-data';
import { trackEvent } from '../lib/telemetry';
import {
  approveFriendRequest,
  blockUser,
  getDmMessages,
  getRelationshipState,
  muteUser,
  reportTarget,
  searchProfiles,
  sendDmMessage,
  sendFriendRequest
} from '../lib/social';

const SEND_COOLDOWN_SECONDS = 6;
const MAX_PER_MINUTE = 8;

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

function flattenThread(root, depth = 0, parentId = null) {
  if (!root) return [];

  const current = {
    id: root.id,
    author: root.author,
    content: root.content,
    createdAt: root.createdAt,
    category: root.category,
    tags: root.tags || [],
    depth,
    parentId
  };

  const childRows = (root.replies || []).flatMap((reply) => flattenThread(reply, depth + 1, root.id));
  return [current, ...childRows];
}

function findMessageById(root, id) {
  if (!root) return null;
  if (root.id === id) return root;

  for (const child of root.replies || []) {
    const found = findMessageById(child, id);
    if (found) return found;
  }

  return null;
}

function countDescendants(node) {
  if (!node?.replies?.length) return 0;
  return node.replies.reduce((total, reply) => total + 1 + countDescendants(reply), 0);
}

function canSendRateLimited(lastSentAt, sentTimestamps) {
  const now = Date.now();
  if (lastSentAt && now - lastSentAt < SEND_COOLDOWN_SECONDS * 1000) {
    return false;
  }

  const minuteAgo = now - 60 * 1000;
  const recent = sentTimestamps.filter((ts) => ts > minuteAgo);
  return recent.length < MAX_PER_MINUTE;
}

function useWindowedRows(rows, pageSize = 80) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [rows, pageSize]);

  return {
    rows: rows.slice(0, visibleCount),
    canLoadMore: rows.length > visibleCount,
    loadMore: () => setVisibleCount((prev) => prev + pageSize)
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isVerified, user } = useAuth();

  const [activeChannel, setActiveChannel] = useState('All');
  const [topicRows, setTopicRows] = useState(topics);
  const [activeTopicId, setActiveTopicId] = useState(topics[0]?.id || null);
  const [activeMessageId, setActiveMessageId] = useState(null);

  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const [threadMap, setThreadMap] = useState(() => {
    const next = {};
    for (const [topicId, thread] of Object.entries(threadByTopicId)) {
      next[topicId] = structuredClone(thread);
    }
    return next;
  });

  const [channelInput, setChannelInput] = useState('');
  const [peopleSearchInput, setPeopleSearchInput] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [relationship, setRelationship] = useState({ friendships: {}, inbound: {}, outbound: {} });
  const [activeDmPeerId, setActiveDmPeerId] = useState('');
  const [activeDmMessages, setActiveDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState('');

  const [moderationNotice, setModerationNotice] = useState('');
  const [notice, setNotice] = useState('');

  const [lastCommunitySentAt, setLastCommunitySentAt] = useState(0);
  const [communitySentTimestamps, setCommunitySentTimestamps] = useState([]);
  const [lastDmSentAt, setLastDmSentAt] = useState(0);
  const [dmSentTimestamps, setDmSentTimestamps] = useState([]);

  const channelList = useMemo(() => ['All', ...categories], []);

  useEffect(() => {
    let cancelled = false;

    async function loadTopics() {
      try {
        const rows = await fetchTopics();
        if (!cancelled && rows?.length) {
          setTopicRows(rows);
          if (!rows.some((row) => row.id === activeTopicId)) {
            setActiveTopicId(rows[0]?.id || null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          trackEvent('community_topics_load_error', { message: err.message || 'load failed' });
        }
      }
    }

    loadTopics();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        const rows = await searchProfiles('');
        if (!cancelled) {
          const merged = rows.length
            ? rows
            : Array.from(new Set(topicRows.map((topic) => topic.author))).map((handle, idx) => ({
                id: `fallback-${idx}-${handle}`,
                handle,
                name: handle,
                avatar: '',
                bio: '',
                specialties: [],
                solvedTopicsCount: topicRows.filter((t) => t.author === handle && t.solved).length,
                joinedAt: '2025-01-01T00:00:00.000Z',
                verified: false
              }));
          setProfiles(merged);
        }
      } catch (err) {
        if (!cancelled) {
          setModerationNotice(err.message || 'Failed to load profiles.');
        }
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [topicRows]);

  useEffect(() => {
    let cancelled = false;

    async function loadRelationships() {
      if (!isVerified || !user?.id) return;

      try {
        const next = await getRelationshipState(user.id);
        if (!cancelled) {
          setRelationship(next);
        }
      } catch (err) {
        if (!cancelled) {
          setModerationNotice(err.message || 'Failed to load relationship state.');
        }
      }
    }

    loadRelationships();

    return () => {
      cancelled = true;
    };
  }, [isVerified, user?.id]);

  const profileByHandle = useMemo(() => {
    const map = {};
    profiles.forEach((profile) => {
      map[profile.handle] = profile;
    });
    return map;
  }, [profiles]);

  const filteredTopics = useMemo(() => {
    let rows = topicRows.filter((topic) => activeChannel === 'All' || topic.category === activeChannel);

    const q = globalSearch.trim().toLowerCase();
    if (q) {
      const userMatch = profiles.some(
        (profile) =>
          profile.handle.toLowerCase().includes(q) ||
          (profile.name || '').toLowerCase().includes(q)
      );
      const fixMatch = commonFixes.some(
        (fix) => fix.problem.toLowerCase().includes(q) || fix.domain.toLowerCase().includes(q)
      );

      rows = rows.filter(
        (topic) =>
          topic.title.toLowerCase().includes(q) ||
          topic.body.toLowerCase().includes(q) ||
          topic.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          topic.author.toLowerCase().includes(q) ||
          userMatch ||
          fixMatch
      );
    }

    if (statusFilter !== 'all') rows = rows.filter((topic) => topic.status === statusFilter);
    if (difficultyFilter !== 'all') rows = rows.filter((topic) => topic.difficulty === difficultyFilter);
    if (categoryFilter !== 'all') rows = rows.filter((topic) => topic.category === categoryFilter);

    if (sortBy === 'recent') {
      rows = [...rows].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    }
    if (sortBy === 'watchers') {
      rows = [...rows].sort((a, b) => b.watchers - a.watchers);
    }
    if (sortBy === 'replies') {
      rows = [...rows].sort((a, b) => b.repliesCount - a.repliesCount);
    }

    return rows;
  }, [activeChannel, globalSearch, statusFilter, difficultyFilter, categoryFilter, sortBy, profiles, topicRows]);

  const activeTopic =
    filteredTopics.find((topic) => topic.id === activeTopicId) || filteredTopics[0] || null;

  useEffect(() => {
    if (!activeTopic) {
      setActiveTopicId(null);
      return;
    }

    if (!filteredTopics.some((topic) => topic.id === activeTopicId)) {
      setActiveTopicId(filteredTopics[0].id);
    }
  }, [activeTopicId, filteredTopics, activeTopic]);

  const activeThread = activeTopic ? threadMap[String(activeTopic.id)] : null;

  useEffect(() => {
    let cancelled = false;

    async function loadThread() {
      if (!activeTopic?.id) return;
      try {
        const thread = await fetchThreadByTopicId(activeTopic.id);
        if (!cancelled && thread) {
          setThreadMap((prev) => ({ ...prev, [String(activeTopic.id)]: thread }));
        }
      } catch (err) {
        if (!cancelled) {
          trackEvent('community_thread_load_error', {
            message: err.message || 'thread load failed',
            topicId: activeTopic.id
          });
        }
      }
    }

    loadThread();
    return () => {
      cancelled = true;
    };
  }, [activeTopic?.id]);

  const messageRows = useMemo(() => flattenThread(activeThread), [activeThread]);
  const visibleMessageRows = useMemo(() => messageRows.filter((message) => message.depth <= 1), [messageRows]);
  const messageWindow = useWindowedRows(
    [...visibleMessageRows].sort((a, b) => (b.reactions?.helpful || 0) - (a.reactions?.helpful || 0)),
    60
  );

  const selectedMessage =
    visibleMessageRows.find((message) => message.id === activeMessageId) ||
    (visibleMessageRows.length ? visibleMessageRows[0] : null);

  const selectedThreadRoot = selectedMessage ? findMessageById(activeThread, selectedMessage.id) : null;
  const selectedThreadRows = useMemo(() => flattenThread(selectedThreadRoot, 0, null), [selectedThreadRoot]);
  const selectedReplyRows = useMemo(() => selectedThreadRows.filter((row) => row.depth > 0), [selectedThreadRows]);

  const filteredPeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter(
      (profile) =>
        profile.handle.toLowerCase().includes(q) ||
        (profile.name || '').toLowerCase().includes(q) ||
        (profile.specialties || []).join(' ').toLowerCase().includes(q)
    );
  }, [peopleSearch, profiles]);
  const peopleWindow = useWindowedRows(filteredPeople, 40);

  const approvedPeople = useMemo(
    () => filteredPeople.filter((person) => relationship.friendships[person.id]),
    [filteredPeople, relationship.friendships]
  );

  const activeDmPeer = profiles.find((profile) => profile.id === activeDmPeerId) || null;

  useEffect(() => {
    let cancelled = false;

    async function loadDm() {
      if (!isVerified || !user?.id || !activeDmPeerId) return;
      if (!relationship.friendships[activeDmPeerId]) return;

      try {
        const rows = await getDmMessages(user.id, activeDmPeerId);
        if (!cancelled) setActiveDmMessages(rows);
      } catch (err) {
        if (!cancelled) {
          setModerationNotice(err.message || 'Failed to load DM messages.');
        }
      }
    }

    loadDm();

    return () => {
      cancelled = true;
    };
  }, [activeDmPeerId, isVerified, user?.id, relationship.friendships]);

  function requireSignIn(reason) {
    if (isVerified) return true;
    navigate(`/signin?next=${encodeURIComponent('/community')}&reason=${encodeURIComponent(reason)}`);
    return false;
  }

  function submitPeopleSearch(event) {
    event.preventDefault();
    setPeopleSearch(peopleSearchInput.trim());
  }

  function clearPeopleSearch() {
    setPeopleSearchInput('');
    setPeopleSearch('');
  }

  async function refreshRelationships() {
    if (!isVerified || !user?.id) return;
    const next = await getRelationshipState(user.id);
    setRelationship(next);
  }

  async function onSendFriendRequest(profile) {
    if (!requireSignIn('Sign in is required to send friend requests.')) return;

    try {
      await sendFriendRequest(user.id, profile.id);
      await refreshRelationships();
      setNotice(`Friend request sent to @${profile.handle}.`);
    } catch (err) {
      setNotice(err.message || 'Could not send request.');
      trackEvent('friend_request_error', { message: err.message || 'send request failed' });
    }
  }

  async function onApproveRequest(profile) {
    if (!requireSignIn('Sign in is required to approve friend requests.')) return;

    try {
      await approveFriendRequest(user.id, profile.id);
      await refreshRelationships();
      setActiveDmPeerId(profile.id);
      setNotice(`You approved @${profile.handle}.`);
    } catch (err) {
      setNotice(err.message || 'Could not approve request.');
      trackEvent('friend_request_approve_error', { message: err.message || 'approve failed' });
    }
  }

  async function onReportMessage(message) {
    if (!requireSignIn('Sign in is required to report content.')) return;

    try {
      await reportTarget(user.id, {
        targetType: 'reply',
        targetId: String(message.id),
        reason: 'Community report',
        details: message.content.slice(0, 180)
      });
      setModerationNotice('Message reported. Admin moderation queue updated.');
    } catch (err) {
      setModerationNotice(err.message || 'Could not report message.');
      trackEvent('report_message_error', { message: err.message || 'report failed' });
    }
  }

  async function onBlockHandle(handle) {
    if (!requireSignIn('Sign in is required to block users.')) return;
    const profile = profileByHandle[handle];
    if (!profile?.id) return;

    try {
      await blockUser(user.id, profile.id);
      setNotice(`@${handle} blocked.`);
    } catch (err) {
      setNotice(err.message || 'Could not block user.');
      trackEvent('block_user_error', { message: err.message || 'block failed' });
    }
  }

  async function onMuteHandle(handle) {
    if (!requireSignIn('Sign in is required to mute users.')) return;
    const profile = profileByHandle[handle];
    if (!profile?.id) return;

    try {
      await muteUser(user.id, profile.id);
      setNotice(`@${handle} muted.`);
    } catch (err) {
      setNotice(err.message || 'Could not mute user.');
      trackEvent('mute_user_error', { message: err.message || 'mute failed' });
    }
  }

  async function submitChannelMessage(event) {
    event.preventDefault();

    if (!requireSignIn('Sign in is required to send messages in Community.')) return;

    const content = channelInput.trim();
    if (!content || !activeThread || !activeTopic) return;

    if (!canSendRateLimited(lastCommunitySentAt, communitySentTimestamps)) {
      setNotice(`Slow down. Max ${MAX_PER_MINUTE}/min and ${SEND_COOLDOWN_SECONDS}s cooldown.`);
      return;
    }

    let reply;
    try {
      reply = await addReply({
        topicId: activeTopic.id,
        parentReplyId: activeThread.id,
        authorHandle: user?.name || user?.email?.split('@')[0] || 'member',
        category: activeTopic.category,
        body: content,
        tags: []
      });
    } catch (err) {
      setNotice(err.message || 'Could not post message.');
      trackEvent('community_message_send_error', {
        message: err.message || 'community send failed',
        topicId: activeTopic.id
      });
      return;
    }

    if (!reply) {
      setNotice('Could not post message.');
      return;
    }

    setThreadMap((prev) => ({
      ...prev,
      [String(activeTopic.id)]: addReplyToTree(activeThread, activeThread.id, reply)
    }));

    const now = Date.now();
    setLastCommunitySentAt(now);
    setCommunitySentTimestamps((prev) => [...prev.filter((ts) => ts > now - 60 * 1000), now]);
    setChannelInput('');
    setActiveMessageId(reply.id);
    setNotice('Message posted.');
  }

  async function submitDmMessage(event) {
    event.preventDefault();

    if (!requireSignIn('Sign in is required to send private messages.')) return;
    if (!activeDmPeer || !relationship.friendships[activeDmPeer.id]) {
      setNotice('DM locked until friend request is approved.');
      return;
    }

    const content = dmInput.trim();
    if (!content) return;

    if (!canSendRateLimited(lastDmSentAt, dmSentTimestamps)) {
      setNotice(`Slow down. Max ${MAX_PER_MINUTE}/min and ${SEND_COOLDOWN_SECONDS}s cooldown.`);
      return;
    }

    try {
      await sendDmMessage(user.id, activeDmPeer.id, content);
      const next = await getDmMessages(user.id, activeDmPeer.id);
      setActiveDmMessages(next);
      const now = Date.now();
      setLastDmSentAt(now);
      setDmSentTimestamps((prev) => [...prev.filter((ts) => ts > now - 60 * 1000), now]);
      setDmInput('');
      setNotice('Private message sent.');
    } catch (err) {
      setNotice(err.message || 'Could not send private DM.');
      trackEvent('dm_send_error', { message: err.message || 'dm send failed' });
    }
  }

  function onSwitchTopic(event) {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) return;
    setActiveTopicId(value);
    setActiveMessageId(null);
  }

  return (
    <main className="mx-auto max-w-[1460px] px-3 py-5 sm:px-4 sm:py-6">
      <section className="mb-4 diy-card-void p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Community Workspace</p>
            <h2 className="mt-2 text-2xl font-bold leading-none sm:text-3xl">Repair Collaboration Workspace</h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base">
              Global search, filtered discovery, friend-gated DMs, and moderation controls now run on persisted social data.
            </p>
          </div>
          <Link
            to="/"
            className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
          >
            Back To AI
          </Link>
        </div>
      </section>

      <section className="mb-4 grid gap-3 md:grid-cols-6">
        <input
          className="input-brutal md:col-span-2"
          placeholder="Global search: topics, tags, users"
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
        />
        <select className="input-brutal" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="solved">Solved</option>
        </select>
        <select className="input-brutal" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
          <option value="all">All Difficulty</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select className="input-brutal" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={`filter-${category}`} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select className="input-brutal" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="recent">Most Recent</option>
          <option value="watchers">Most Watched</option>
          <option value="replies">Most Replies</option>
        </select>
      </section>

      <section className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_360px]">
        <aside className="diy-card p-3 sm:p-4">
          <div className="diy-card-void p-3">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-neon">Workspace</p>
            <h3 className="mt-2 text-lg font-bold leading-none">People And Channels</h3>
          </div>

          <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em]">Channels</p>
          <div className="mt-2 space-y-2">
            {channelList.map((channel) => (
              <button
                key={channel}
                type="button"
                className={`pressable w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-wide ${
                  activeChannel === channel ? 'bg-electric text-white' : 'bg-white text-ink'
                }`}
                onClick={() => {
                  setActiveChannel(channel);
                  setCategoryFilter(channel === 'All' ? 'all' : channel);
                }}
              >
                # {channel}
              </button>
            ))}
          </div>

          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em]">Find People</p>
          <form className="mt-2 flex gap-2" onSubmit={submitPeopleSearch}>
            <input
              className="input-brutal w-full"
              placeholder="Search users"
              value={peopleSearchInput}
              onChange={(event) => setPeopleSearchInput(event.target.value)}
            />
            <button className="pressable bg-electric px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-white" type="submit">
              Search
            </button>
            <button className="pressable bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-ink" type="button" onClick={clearPeopleSearch}>
              Clear
            </button>
          </form>

          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
            {peopleWindow.rows.map((person) => {
              const isFriend = Boolean(relationship.friendships[person.id]);
              const isInbound = Boolean(relationship.inbound[person.id]);
              const isOutbound = Boolean(relationship.outbound[person.id]);

              return (
                <article key={person.id} className="border-2 border-black bg-white p-3 shadow-hard">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/u/${person.handle}`} className="text-xs font-bold hover:underline">
                      @{person.handle}
                    </Link>
                    <span className={`sticker-tag ${person.verified ? 'bg-neon text-ink' : 'bg-amber text-ink'}`}>
                      {person.verified ? 'verified' : 'unverified'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wide">
                    {(person.specialties || []).slice(0, 2).join(' | ') || 'general'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isFriend ? (
                      <button
                        type="button"
                        className="pressable bg-neon px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink"
                        onClick={() => setActiveDmPeerId(person.id)}
                      >
                        Open DM
                      </button>
                    ) : null}
                    {isInbound ? (
                      <button
                        type="button"
                        className="pressable bg-electric px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                        onClick={() => onApproveRequest(person)}
                      >
                        Approve Request
                      </button>
                    ) : null}
                    {isOutbound ? <span className="sticker-tag bg-amber text-ink">Request Sent</span> : null}
                    {!isFriend && !isInbound && !isOutbound ? (
                      <button
                        type="button"
                        className="pressable bg-action px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                        onClick={() => onSendFriendRequest(person)}
                      >
                        Send Request
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {peopleWindow.canLoadMore ? (
              <button
                type="button"
                className="pressable w-full bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-ink"
                onClick={peopleWindow.loadMore}
              >
                Load More People
              </button>
            ) : null}
          </div>
        </aside>

        <section className="diy-card flex min-h-[620px] flex-col p-0">
          <header className="border-b-2 border-black bg-ink px-4 py-3 text-paper">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-neon">
              {activeTopic ? `# ${activeTopic.category}` : '# no-channel'}
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <h3 className="text-lg font-bold sm:text-2xl">
                {activeTopic ? activeTopic.title : 'No Topic Found'}
              </h3>
              <select
                className="input-brutal bg-white text-ink"
                value={activeTopic?.id || ''}
                onChange={onSwitchTopic}
              >
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-paper/90">
              Topic switcher enabled. Replies are ranked by helpful reactions first.
            </p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messageWindow.rows.map((message) => {
                const authorProfile = profileByHandle[message.author];
                return (
                  <article
                    key={message.id}
                    className={`border-2 border-black p-3 shadow-hard ${
                      selectedMessage?.id === message.id ? 'bg-neon/50' : 'bg-white'
                    }`}
                    style={{ marginLeft: `${message.depth * 12}px` }}
                    onClick={() => setActiveMessageId(message.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="sticker-tag bg-electric text-white" to={`/u/${message.author}`}>
                        {message.author}
                      </Link>
                      <span className="font-mono text-[11px]">{message.createdAt}</span>
                      <span className="sticker-tag bg-white text-ink">{message.category}</span>
                      <span className={`sticker-tag ${(authorProfile?.verified ? 'bg-neon' : 'bg-amber')} text-ink`}>
                        {authorProfile?.verified ? 'verified' : 'unverified'}
                      </span>
                      {message.accepted ? <span className="sticker-tag bg-neon text-ink">accepted answer</span> : null}
                    </div>

                    <p className="mt-2 text-sm leading-relaxed">{message.content}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="pressable bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink" type="button">
                        Helpful {message.reactions?.helpful || 0}
                      </button>
                      <button className="pressable bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink" type="button">
                        Unclear {message.reactions?.unclear || 0}
                      </button>
                      <button className="pressable bg-action px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white" type="button" onClick={() => onReportMessage(message)}>
                        Report
                      </button>
                      <button className="pressable bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink" type="button" onClick={() => onMuteHandle(message.author)}>
                        Mute User
                      </button>
                      <button className="pressable bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink" type="button" onClick={() => onBlockHandle(message.author)}>
                        Block User
                      </button>
                    </div>
                  </article>
                );
              })}
            {messageWindow.canLoadMore ? (
              <button
                type="button"
                className="pressable bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
                onClick={messageWindow.loadMore}
              >
                Load More Messages
              </button>
            ) : null}
          </div>

          <form className="border-t-2 border-black p-3" onSubmit={submitChannelMessage}>
            <textarea
              className="input-brutal min-h-24 w-full"
              placeholder={`Message #${activeTopic?.category || 'channel'} (anti-spam: ${MAX_PER_MINUTE}/min + ${SEND_COOLDOWN_SECONDS}s cooldown)`}
              value={channelInput}
              onChange={(event) => setChannelInput(event.target.value)}
            />
            <button className="pressable mt-2 bg-action px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" type="submit">
              {isVerified ? 'Send Message' : 'Sign In To Send'}
            </button>
          </form>
        </section>

        <aside className="diy-card flex min-h-[620px] flex-col p-0 lg:col-span-2 xl:col-span-1">
          <header className="border-b-2 border-black bg-paper px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">Thread + Private DM</p>
            <h3 className="mt-1 text-lg font-bold">
              {selectedMessage ? `Replies To ${selectedMessage.author}` : 'Reply Chain'}
            </h3>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedMessage ? (
              <div className="space-y-3">
                <article className="border-2 border-black bg-white p-3 shadow-hard">
                  <p className="font-mono text-xs uppercase tracking-wide">Selected Message</p>
                  <p className="mt-2 text-sm leading-relaxed">{selectedMessage.content}</p>
                </article>

                {selectedReplyRows.length ? (
                  <div className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-wide">
                      {countDescendants(selectedThreadRoot)} replies
                    </p>
                    {selectedReplyRows.map((message) => (
                      <article
                        key={`thread-${message.id}`}
                        className="border-2 border-black bg-white p-3 shadow-hard"
                        style={{ marginLeft: `${(message.depth - 1) * 10}px` }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/u/${message.author}`} className="sticker-tag bg-neon text-ink">
                            {message.author}
                          </Link>
                          <span className="font-mono text-[11px]">{message.createdAt}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">{message.content}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="border-2 border-black bg-white p-3 text-sm shadow-hard">No replies yet.</p>
                )}
              </div>
            ) : (
              <p className="border-2 border-black bg-white p-3 text-sm shadow-hard">
                Select a message to inspect replies.
              </p>
            )}

            <div className="mt-4 border-t-2 border-black pt-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em]">Private DMs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {approvedPeople.map((person) => (
                  <button
                    key={`dm-btn-${person.id}`}
                    type="button"
                    className={`pressable px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      activeDmPeerId === person.id ? 'bg-neon text-ink' : 'bg-white text-ink'
                    }`}
                    onClick={() => setActiveDmPeerId(person.id)}
                  >
                    @{person.handle}
                  </button>
                ))}
                {!approvedPeople.length ? (
                  <p className="text-xs">No approved friends yet.</p>
                ) : null}
              </div>

              <form className="mt-2" onSubmit={submitDmMessage}>
                <textarea
                  className="input-brutal min-h-20 w-full"
                  placeholder={
                    activeDmPeer
                      ? `DM @${activeDmPeer.handle} (anti-spam active)`
                      : 'Select an approved friend to DM'
                  }
                  value={dmInput}
                  onChange={(event) => setDmInput(event.target.value)}
                />
                <button className="pressable mt-2 bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" type="submit">
                  Send Private DM
                </button>
              </form>

              <div className="mt-2 max-h-36 space-y-2 overflow-y-auto border-2 border-black bg-white p-2 shadow-hard">
                {activeDmMessages.map((message) => (
                  <article key={`dm-${message.id}`} className="border-2 border-black bg-paper p-2 shadow-hard">
                    <p className="font-mono text-[10px] uppercase tracking-wide">
                      {message.senderId === user?.id ? 'you' : activeDmPeer?.handle || 'peer'} •{' '}
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                    <p className="mt-1 text-xs">{message.body}</p>
                  </article>
                ))}
                {!activeDmMessages.length ? <p className="text-xs">No private messages yet.</p> : null}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {notice ? (
        <p className="mt-4 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">{notice}</p>
      ) : null}

      {moderationNotice ? (
        <p className="mt-2 border-2 border-black bg-action px-3 py-2 font-mono text-xs text-white shadow-hard">
          {moderationNotice}
        </p>
      ) : null}
    </main>
  );
}







