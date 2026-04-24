import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { topics } from '../data/threads';
import { getProfileByHandle, sendFriendRequest } from '../lib/social';

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
}

export default function ProfilePage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { isVerified, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const nextProfile = await getProfileByHandle(handle || '');
        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <section className="diy-card p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-wide">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <section className="diy-card p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-white">{error}</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return <Navigate to="/community" replace />;
  }

  const solvedFallbackCount = topics.filter((topic) => topic.author === profile.handle && topic.solved)
    .length;

  const solvedCount = profile.solvedTopicsCount || solvedFallbackCount;

  async function onSendRequest() {
    if (!isVerified || !user?.id) {
      navigate(
        `/signin?next=${encodeURIComponent(`/u/${profile.handle}`)}&reason=${encodeURIComponent(
          'Sign in is required to send friend requests.'
        )}`
      );
      return;
    }

    try {
      await sendFriendRequest(user.id, profile.id);
      setNotice(`Friend request sent to @${profile.handle}.`);
    } catch (err) {
      setNotice(err.message || 'Could not send friend request.');
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Public Profile</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">@{profile.handle}</h2>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
        <article className="diy-card p-4 sm:p-5">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={`Avatar of ${profile.handle}`}
              className="h-40 w-full border-2 border-black object-cover shadow-hard"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center border-2 border-black bg-neon text-4xl font-bold shadow-hard">
              {profile.handle.slice(0, 2).toUpperCase()}
            </div>
          )}

          <button
            className="pressable mt-4 w-full bg-electric px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
            type="button"
            onClick={onSendRequest}
          >
            Send Friend Request
          </button>

          <Link
            to="/community"
            className="pressable mt-2 inline-flex w-full justify-center bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink"
          >
            Back To Community
          </Link>
        </article>

        <article className="diy-card grid gap-3 p-4 sm:p-5">
          <p className="text-lg font-bold">{profile.name || profile.handle}</p>
          <p className="text-sm">{profile.bio || 'No bio added yet.'}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Solved Topics</p>
              <p className="mt-1 text-2xl font-bold">{solvedCount}</p>
            </div>
            <div className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Joined</p>
              <p className="mt-1 text-base font-bold">{formatDate(profile.joinedAt)}</p>
            </div>
          </div>

          <div className="border-2 border-black bg-white p-3 shadow-hard">
            <p className="font-mono text-xs uppercase tracking-wide">Specialties</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile.specialties || []).length ? (
                profile.specialties.map((specialty) => (
                  <span key={specialty} className="sticker-tag bg-neon text-ink">
                    {specialty}
                  </span>
                ))
              ) : (
                <span className="text-sm">No specialties listed.</span>
              )}
            </div>
          </div>

          <p className="font-mono text-xs uppercase tracking-wide">
            Email verification: {profile.verified ? 'verified' : 'unverified'}
          </p>
        </article>
      </section>

      {notice ? (
        <p className="mt-4 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">
          {notice}
        </p>
      ) : null}
    </main>
  );
}







