import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { listDevices, revokeAllOtherDevices, revokeDevice, touchCurrentDevice } from '../lib/session-devices';

export default function AccountPage() {
  const {
    isVerified,
    user,
    provider,
    authError,
    clearAuthError,
    updateProfile,
    updateEmail,
    updatePassword,
    revokeOtherSessions,
    startTotpEnrollment,
    verifyTotpEnrollment,
    listMfaFactors,
    resendVerificationEmail,
    logout
  } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [specialtiesInput, setSpecialtiesInput] = useState((user?.specialties || []).join(', '));
  const [newPassword, setNewPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpEnrollment, setTotpEnrollment] = useState(null);
  const [mfaSummary, setMfaSummary] = useState('');
  const [devices, setDevices] = useState([]);
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setAvatar(user?.avatar || '');
    setBio(user?.bio || '');
    setSpecialtiesInput((user?.specialties || []).join(', '));
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    touchCurrentDevice(user.id);
    setDevices(listDevices(user.id));
  }, [user?.id]);

  async function loadMfaSummary() {
    try {
      const factors = await listMfaFactors();
      const count = (factors?.all || []).length;
      setMfaSummary(count ? `${count} factor(s) configured` : 'No MFA factors configured');
    } catch {
      setMfaSummary('Could not read MFA factors');
    }
  }

  if (!isVerified) {
    return (
      <Navigate
        to={`/signin?next=${encodeURIComponent('/account')}&reason=${encodeURIComponent(
          'Sign in is required to manage account settings.'
        )}`}
        replace
      />
    );
  }

  async function run(action, successMessage = '') {
    setBusy(true);
    setLocalError('');
    setNotice('');
    clearAuthError();

    try {
      await action();
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (err) {
      setLocalError(err.message || 'Account action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="diy-card-void p-5 sm:p-7">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Account Panel</p>
        <h2 className="mt-2 text-3xl font-bold leading-none sm:text-4xl">Manage Account</h2>
        <p className="mt-3 text-sm sm:text-base">
          Update profile, manage login credentials, and maintain account security.
        </p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="diy-card grid gap-3 p-4 sm:p-5">
          <h3 className="text-xl font-bold">Profile</h3>
          <p className="font-mono text-xs uppercase tracking-wide">Provider: {provider || 'unknown'}</p>
          <p className="font-mono text-xs uppercase tracking-wide">
            Email status: {user?.emailVerified ? 'verified' : 'unverified'}
          </p>

          <div className="flex items-center gap-3 border-2 border-black bg-white p-3 shadow-hard">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="h-16 w-16 border-2 border-black object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-neon font-mono text-xs font-bold uppercase">
                {name?.trim()?.slice(0, 2) || 'NA'}
              </div>
            )}
            <p className="text-xs">
              Add a profile picture URL and a short bio so people can recognize you in the community.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Display Name</span>
            <input
              className="input-brutal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your display name"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Profile Picture URL</span>
            <input
              className="input-brutal"
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Short Bio (max 160)</span>
            <textarea
              className="input-brutal min-h-20"
              maxLength={160}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Repair interests, tools you use, and what you usually fix."
            />
            <span className="font-mono text-[10px] uppercase tracking-wide">{bio.length}/160</span>
          </label>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Specialties (comma-separated)</span>
            <input
              className="input-brutal"
              value={specialtiesInput}
              onChange={(event) => setSpecialtiesInput(event.target.value)}
              placeholder="electronics, firmware, soldering"
            />
          </label>

          <button
            className="pressable w-fit bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  updateProfile({
                    name,
                    avatar,
                    bio,
                    specialties: specialtiesInput
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }),
                'Profile updated: name, picture, and bio saved.'
              )
            }
          >
            Save Profile
          </button>
        </article>

        <article className="diy-card grid gap-3 p-4 sm:p-5">
          <h3 className="text-xl font-bold">Email & Verification</h3>
          <p className="text-sm">
            Current email: <span className="font-mono">{user?.email || 'n/a'}</span>
          </p>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">Change Email</span>
            <input
              className="input-brutal"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="new@email.com"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="pressable bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => updateEmail(email),
                  'Email update requested. Check both old and new inboxes if confirmation is required.'
                )
              }
            >
              Update Email
            </button>
            <button
              className="pressable bg-neon px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => resendVerificationEmail(user?.email || ''),
                  'Verification email resent.'
                )
              }
            >
              Resend Verification
            </button>
          </div>
        </article>

        <article className="diy-card grid gap-3 p-4 sm:p-5">
          <h3 className="text-xl font-bold">Security</h3>

          <label className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">New Password</span>
            <input
              className="input-brutal"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          <button
            className="pressable w-fit bg-action px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => updatePassword(newPassword), 'Password updated successfully.')
            }
          >
            Update Password
          </button>
        </article>

        <article className="diy-card grid gap-3 p-4 sm:p-5">
          <h3 className="text-xl font-bold">Session</h3>
          <p className="text-sm">Sign out from this device when you are done.</p>
          <button
            className="pressable w-fit bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await revokeOtherSessions();
                if (user?.id) {
                  setDevices(revokeAllOtherDevices(user.id));
                }
              }, 'Other sessions revoked.')
            }
          >
            Revoke Other Sessions
          </button>
          <button
            className="pressable w-fit bg-amber px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            type="button"
            onClick={logout}
          >
            Sign Out
          </button>

          <div className="mt-2 space-y-2">
            <p className="font-mono text-xs uppercase tracking-wide">Devices / Sessions</p>
            {devices.map((device) => (
              <article key={device.id} className="border-2 border-black bg-white p-2 shadow-hard">
                <p className="text-xs font-bold">
                  {device.label} {device.current ? '(current)' : ''}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide">
                  last seen {new Date(device.lastSeenAt).toLocaleString()}
                </p>
                {!device.current ? (
                  <button
                    className="pressable mt-2 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink"
                    type="button"
                    onClick={() => {
                      if (!user?.id) return;
                      setDevices(revokeDevice(user.id, device.id));
                    }}
                  >
                    Revoke Device
                  </button>
                ) : null}
              </article>
            ))}
            {!devices.length ? <p className="text-xs">No device records yet.</p> : null}
          </div>
        </article>

        <article className="diy-card grid gap-3 p-4 sm:p-5 lg:col-span-2">
          <h3 className="text-xl font-bold">Optional 2FA (TOTP)</h3>
          <p className="text-sm">
            Use an authenticator app to add a second factor.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="pressable bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              type="button"
              disabled={busy}
              onClick={() => run(loadMfaSummary)}
            >
              Check MFA Status
            </button>
            <button
              className="pressable bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const enrollment = await startTotpEnrollment();
                  setTotpEnrollment(enrollment);
                }, 'TOTP enrollment created. Scan QR and verify code.')
              }
            >
              Start TOTP Setup
            </button>
          </div>

          {mfaSummary ? (
            <p className="font-mono text-xs uppercase tracking-wide">{mfaSummary}</p>
          ) : null}

          {totpEnrollment?.totp?.qr_code ? (
            <div className="border-2 border-black bg-white p-3 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-wide">Scan this QR in your authenticator app</p>
              <img
                src={totpEnrollment.totp.qr_code}
                alt="TOTP QR"
                className="mt-2 h-44 w-44 border-2 border-black bg-paper p-1"
              />
              <label className="mt-3 grid gap-2">
                <span className="font-mono text-xs uppercase tracking-wide">Enter 6-digit code</span>
                <input
                  className="input-brutal"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  placeholder="123456"
                />
              </label>
              <button
                className="pressable mt-2 bg-neon px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => verifyTotpEnrollment(totpEnrollment.id, totpCode),
                    'TOTP factor verified and enabled.'
                  )
                }
              >
                Verify TOTP
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {localError || authError ? (
        <p className="mt-4 border-2 border-black bg-action px-3 py-2 font-mono text-xs text-white shadow-hard">
          {localError || authError}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-4 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">
          {notice}
        </p>
      ) : null}
    </main>
  );
}







