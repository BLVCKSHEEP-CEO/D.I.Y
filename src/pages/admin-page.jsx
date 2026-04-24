import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '../components/auth/admin-gate';
import StatCard from '../components/ui/stat-card';
import StickerTag from '../components/ui/sticker-tag';
import StatusPill from '../components/ui/status-pill';
import { adminUsers, moderationReports } from '../data/admin';
import { topics } from '../data/threads';
import { getModerationQueue } from '../lib/social';

const ADMIN_STORAGE_KEY = 'diy-admin-state-v1';

function getSeverityTone(severity) {
  if (severity === 'high') return 'action';
  if (severity === 'medium') return 'amber';
  return 'neon';
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [topicState, setTopicState] = useState(
    topics.map((topic) => ({ ...topic, pinned: false, locked: false }))
  );
  const [reportState, setReportState] = useState(moderationReports);
  const [userState, setUserState] = useState(adminUsers);
  const [policies, setPolicies] = useState({
    autoClose: true,
    requirePhotoProof: true,
    maintenanceBanner: false
  });
  const [severityFilter, setSeverityFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const rawState = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!rawState) return;

      const parsedState = JSON.parse(rawState);
      if (Array.isArray(parsedState.topics)) setTopicState(parsedState.topics);
      if (Array.isArray(parsedState.reports)) setReportState(parsedState.reports);
      if (Array.isArray(parsedState.users)) setUserState(parsedState.users);
      if (parsedState.policies) setPolicies(parsedState.policies);
    } catch {
      setNotice('Failed to load saved admin state. Using defaults.');
    }

    let cancelled = false;

    async function hydrateQueue() {
      try {
        const queue = await getModerationQueue();
        if (!cancelled && queue.length) {
          setReportState(queue);
        }
      } catch {
        if (!cancelled) {
          setNotice('Using local moderation queue fallback.');
        }
      }
    }

    hydrateQueue();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const saveState = {
      topics: topicState,
      reports: reportState,
      users: userState,
      policies
    };

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(saveState));
  }, [topicState, reportState, userState, policies]);

  const solvedCount = topicState.filter((topic) => topic.status === 'solved').length;
  const openCount = topicState.filter((topic) => topic.status === 'open').length;
  const queueCount = reportState.length;
  const flaggedUsers = userState.filter((user) => user.flags > 0).length;

  const filteredReports = useMemo(() => {
    if (severityFilter === 'all') return reportState;
    return reportState.filter((report) => report.severity === severityFilter);
  }, [reportState, severityFilter]);

  const filteredTopics = useMemo(() => {
    if (!topicFilter.trim()) return topicState;

    const q = topicFilter.trim().toLowerCase();
    return topicState.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        topic.category.toLowerCase().includes(q) ||
        topic.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [topicState, topicFilter]);

  function dismissReport(reportId) {
    setReportState((prev) => prev.filter((report) => report.id !== reportId));
  }

  function escalateReport(reportId) {
    setReportState((prev) =>
      prev.map((report) => {
        if (report.id !== reportId) return report;
        return { ...report, severity: 'high', reason: `${report.reason} [Escalated]` };
      })
    );
    setNotice(`Report ${reportId} escalated.`);
  }

  function togglePin(topicId) {
    setTopicState((prev) =>
      prev.map((topic) => (topic.id === topicId ? { ...topic, pinned: !topic.pinned } : topic))
    );
  }

  function toggleSolved(topicId) {
    setTopicState((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) return topic;
        const solved = topic.status !== 'solved';
        return { ...topic, status: solved ? 'solved' : 'open', solved };
      })
    );
  }

  function toggleLocked(topicId) {
    setTopicState((prev) =>
      prev.map((topic) => (topic.id === topicId ? { ...topic, locked: !topic.locked } : topic))
    );
  }

  function toggleUserRole(userId) {
    setUserState((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        return { ...user, role: user.role === 'member' ? 'moderator' : 'member' };
      })
    );
  }

  function clearFlags(userId) {
    setUserState((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, flags: 0 } : user))
    );
  }

  function savePolicies() {
    setNotice('Policy changes saved.');
  }

  function exportLogs() {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      reports: reportState,
      topics: topicState,
      users: userState,
      policies
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diy-admin-export.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Admin logs exported as diy-admin-export.json');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="diy-card-void p-4 sm:p-6">
        <div className="mb-3 flex justify-end">
          <button
            className="pressable bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
            onClick={() => {
              clearAdminSession();
              navigate('/admin');
            }}
          >
            Lock Admin
          </button>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Admin</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Control Panel</h2>
        <p className="mt-3 max-w-3xl text-sm sm:text-base">
          Moderate threads, prioritize urgent repair queues, and keep the D.I.Y knowledge graph clean.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Topics" value={topics.length} />
        <StatCard label="Open Cases" value={openCount} tone="void" />
        <StatCard label="Solved Cases" value={solvedCount} />
        <StatCard label="Queue Alerts" value={queueCount} tone="void" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="diy-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xl font-bold">Moderation Queue</h3>
            <StickerTag tone="action">{queueCount} pending</StickerTag>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Severity Filter</span>
            <button
              className={`pressable px-2 py-1 text-[11px] font-bold uppercase ${
                severityFilter === 'all' ? 'bg-electric text-white' : 'bg-white text-ink'
              }`}
              onClick={() => setSeverityFilter('all')}
            >
              All
            </button>
            <button
              className={`pressable px-2 py-1 text-[11px] font-bold uppercase ${
                severityFilter === 'high' ? 'bg-action text-white' : 'bg-white text-ink'
              }`}
              onClick={() => setSeverityFilter('high')}
            >
              High
            </button>
            <button
              className={`pressable px-2 py-1 text-[11px] font-bold uppercase ${
                severityFilter === 'medium' ? 'bg-amber text-ink' : 'bg-white text-ink'
              }`}
              onClick={() => setSeverityFilter('medium')}
            >
              Medium
            </button>
            <button
              className={`pressable px-2 py-1 text-[11px] font-bold uppercase ${
                severityFilter === 'low' ? 'bg-neon text-ink' : 'bg-white text-ink'
              }`}
              onClick={() => setSeverityFilter('low')}
            >
              Low
            </button>
          </div>

          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="border-2 border-black bg-white p-3 shadow-hard">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StickerTag tone="plain">{report.targetType}</StickerTag>
                  <StickerTag tone={getSeverityTone(report.severity)}>{report.severity}</StickerTag>
                  <span className="font-mono text-xs">{report.createdAt}</span>
                </div>
                <p className="font-bold">{report.targetTitle}</p>
                <p className="mt-1 text-sm">Reason: {report.reason}</p>
                <p className="mt-1 font-mono text-xs">Reporter: {report.reporter}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
                    onClick={() => dismissReport(report.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="pressable bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    onClick={() => dismissReport(report.id)}
                  >
                    Remove
                  </button>
                  <button
                    className="pressable bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    onClick={() => escalateReport(report.id)}
                  >
                    Escalate
                  </button>
                </div>
              </div>
            ))}

            {!filteredReports.length ? (
              <p className="border-2 border-black bg-white px-3 py-4 text-sm shadow-hard">
                No reports in this filter.
              </p>
            ) : null}
          </div>
        </article>

        <article className="diy-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xl font-bold">Topic Operations</h3>
            <StickerTag tone="amber">live actions</StickerTag>
          </div>

          <input
            className="input-brutal mb-3 w-full"
            placeholder="Filter topics by title, category, or tag"
            value={topicFilter}
            onChange={(event) => setTopicFilter(event.target.value)}
          />

          <div className="space-y-3">
            {filteredTopics.slice(0, 8).map((topic) => (
              <div key={topic.id} className="border-2 border-black bg-white p-3 shadow-hard">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusPill status={topic.status} />
                  <StickerTag tone="plain">{topic.category}</StickerTag>
                  <span className="font-mono text-xs">{topic.updatedAt}</span>
                  {topic.pinned ? <StickerTag tone="electric">pinned</StickerTag> : null}
                  {topic.locked ? <StickerTag tone="action">locked</StickerTag> : null}
                </div>
                <p className="font-bold">{topic.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="pressable bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    onClick={() => togglePin(topic.id)}
                  >
                    {topic.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    className="pressable bg-neon px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
                    onClick={() => toggleSolved(topic.id)}
                  >
                    {topic.status === 'solved' ? 'Reopen' : 'Mark Solved'}
                  </button>
                  <button
                    className="pressable bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    onClick={() => toggleLocked(topic.id)}
                  >
                    {topic.locked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              </div>
            ))}

            {!filteredTopics.length ? (
              <p className="border-2 border-black bg-white px-3 py-4 text-sm shadow-hard">
                No topics match this filter.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="diy-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xl font-bold">User Management</h3>
            <StickerTag tone="action">{flaggedUsers} flagged</StickerTag>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-2 border-black bg-white text-sm shadow-hard">
              <thead className="border-b-2 border-black bg-ink text-paper">
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Handle</th>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Role</th>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Rep</th>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Flags</th>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Last Active</th>
                  <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userState.map((user) => (
                  <tr key={user.id} className="border-b-2 border-black">
                    <td className="px-3 py-2 font-bold">{user.handle}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">{user.reputation}</td>
                    <td className="px-3 py-2">{user.flags}</td>
                    <td className="px-3 py-2 font-mono text-xs">{user.lastActive}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="pressable bg-electric px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                          onClick={() => toggleUserRole(user.id)}
                        >
                          Toggle Role
                        </button>
                        <button
                          className="pressable bg-neon px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink"
                          onClick={() => clearFlags(user.id)}
                        >
                          Clear Flags
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="diy-card p-4 sm:p-5">
          <h3 className="text-xl font-bold">System Controls</h3>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 border-2 border-black bg-white p-3 shadow-hard">
              <span className="text-sm font-bold">Enable auto-close stale topics</span>
              <input
                type="checkbox"
                checked={policies.autoClose}
                onChange={(event) =>
                  setPolicies((prev) => ({ ...prev, autoClose: event.target.checked }))
                }
                className="h-4 w-4 accent-electric"
              />
            </label>
            <label className="flex items-center justify-between gap-3 border-2 border-black bg-white p-3 shadow-hard">
              <span className="text-sm font-bold">Require photo proof for hardware fixes</span>
              <input
                type="checkbox"
                checked={policies.requirePhotoProof}
                onChange={(event) =>
                  setPolicies((prev) => ({ ...prev, requirePhotoProof: event.target.checked }))
                }
                className="h-4 w-4 accent-electric"
              />
            </label>
            <label className="flex items-center justify-between gap-3 border-2 border-black bg-white p-3 shadow-hard">
              <span className="text-sm font-bold">Enable emergency maintenance banner</span>
              <input
                type="checkbox"
                checked={policies.maintenanceBanner}
                onChange={(event) =>
                  setPolicies((prev) => ({ ...prev, maintenanceBanner: event.target.checked }))
                }
                className="h-4 w-4 accent-electric"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="pressable bg-action px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              onClick={savePolicies}
            >
              Save Policies
            </button>
            <button
              className="pressable bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              onClick={exportLogs}
            >
              Export Logs
            </button>
          </div>

          {notice ? (
            <p className="mt-4 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">
              {notice}
            </p>
          ) : null}
        </article>
      </section>
    </main>
  );
}







