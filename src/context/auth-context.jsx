import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { trackEvent } from '../lib/telemetry';

const AuthContext = createContext(null);

function mapUser(session) {
  const rawUser = session?.user;
  if (!rawUser) return null;

  const provider =
    rawUser.app_metadata?.provider ||
    rawUser.identities?.[0]?.provider ||
    'email';

  return {
    id: rawUser.id,
    name:
      rawUser.user_metadata?.full_name ||
      rawUser.user_metadata?.name ||
      rawUser.email?.split('@')[0] ||
      'User',
    email: rawUser.email || '',
    avatar: rawUser.user_metadata?.avatar_url || '',
    bio: rawUser.user_metadata?.bio || '',
    specialties: rawUser.user_metadata?.specialties || [],
    provider,
    verifiedAt: rawUser.email_confirmed_at || rawUser.confirmed_at || '',
    emailVerified: Boolean(rawUser.email_confirmed_at || rawUser.confirmed_at)
  };
}

function redirectToCallback() {
  return `${window.location.origin}/auth/callback`;
}

async function syncProfileRow(rawUser) {
  if (!supabase || !rawUser?.id) return;

  const emailPrefix = rawUser.email?.split('@')[0] || `user_${rawUser.id.slice(0, 8)}`;
  const nextHandle =
    rawUser.user_metadata?.handle ||
    emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30) ||
    `user_${rawUser.id.slice(0, 8)}`;

  const nextDisplayName =
    rawUser.user_metadata?.full_name ||
    rawUser.user_metadata?.name ||
    emailPrefix;

  await supabase.from('profiles').upsert(
    {
      id: rawUser.id,
      handle: nextHandle,
      display_name: nextDisplayName,
      avatar_url: rawUser.user_metadata?.avatar_url || '',
      bio: rawUser.user_metadata?.bio || '',
      specialties: rawUser.user_metadata?.specialties || [],
      email_verified: Boolean(rawUser.email_confirmed_at || rawUser.confirmed_at)
    },
    { onConflict: 'id' }
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
        trackEvent('auth_get_session_error', { message: error.message });
      }

      setSession(data.session || null);
      setUser(mapUser(data.session));
      setIsLoading(false);

      if (data.session?.user) {
        syncProfileRow(data.session.user).catch((err) => {
          trackEvent('profile_sync_error', { message: err?.message || 'sync failed' });
        });
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(mapUser(nextSession));
      if (nextSession?.user) {
        syncProfileRow(nextSession.user).catch((err) => {
          trackEvent('profile_sync_error', { message: err?.message || 'sync failed' });
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isVerified = Boolean(user && session);
  const provider = user?.provider || '';

  function assertConfigured() {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error(
        'Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
  }

  async function signInWithEmail(email, password) {
    assertConfigured();
    setAuthError('');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_sign_in_error', { message: error.message });
      throw error;
    }
  }

  async function signUpWithEmail(email, password) {
    assertConfigured();
    setAuthError('');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectToCallback()
      }
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_sign_up_error', { message: error.message });
      throw error;
    }
  }

  async function sendPasswordResetEmail(email) {
    assertConfigured();
    setAuthError('');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectToCallback()
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_password_reset_error', { message: error.message });
      throw error;
    }
  }

  async function resendVerificationEmail(email) {
    assertConfigured();
    setAuthError('');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectToCallback()
      }
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_resend_verification_error', { message: error.message });
      throw error;
    }
  }

  async function signInWithProvider(nextProvider) {
    assertConfigured();
    setAuthError('');

    if (!['google', 'apple'].includes(nextProvider)) {
      throw new Error('Unsupported provider.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: nextProvider,
      options: {
        redirectTo: redirectToCallback()
      }
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_provider_sign_in_error', { message: error.message, provider: nextProvider });
      throw error;
    }
  }

  async function updateProfile({ name, avatar, bio, specialties = [] }) {
    assertConfigured();
    setAuthError('');

    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty.');
    }

    const normalizedAvatar = (avatar || '').trim();
    const normalizedBio = (bio || '').trim();
    const normalizedSpecialties = (specialties || [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
    if (normalizedBio.length > 160) {
      throw new Error('Bio must be 160 characters or fewer.');
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: trimmed,
        name: trimmed,
        avatar_url: normalizedAvatar,
        bio: normalizedBio,
        specialties: normalizedSpecialties
      }
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_update_profile_error', { message: error.message });
      throw error;
    }

    if (data?.user) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
                name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || prev.name,
                avatar: data.user.user_metadata?.avatar_url || '',
                bio: data.user.user_metadata?.bio || '',
                specialties: data.user.user_metadata?.specialties || [],
                emailVerified: Boolean(data.user.email_confirmed_at || data.user.confirmed_at)
            }
          : prev
      );
    }
  }

    async function revokeOtherSessions() {
      assertConfigured();
      setAuthError('');

      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) {
        setAuthError(error.message);
        trackEvent('auth_revoke_sessions_error', { message: error.message });
        throw error;
      }
    }

    async function listMfaFactors() {
      assertConfigured();
      setAuthError('');

      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setAuthError(error.message);
        trackEvent('auth_list_mfa_error', { message: error.message });
        throw error;
      }

      return data;
    }

    async function startTotpEnrollment(friendlyName = 'D.I.Y Authenticator') {
      assertConfigured();
      setAuthError('');

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName
      });

      if (error) {
        setAuthError(error.message);
        trackEvent('auth_start_totp_error', { message: error.message });
        throw error;
      }

      return data;
    }

    async function verifyTotpEnrollment(factorId, code) {
      assertConfigured();
      setAuthError('');

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        setAuthError(challengeError.message);
        trackEvent('auth_totp_challenge_error', { message: challengeError.message });
        throw challengeError;
      }

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code
      });

      if (error) {
        setAuthError(error.message);
        trackEvent('auth_verify_totp_error', { message: error.message });
        throw error;
      }

      return data;
    }

  async function updateEmail(nextEmail) {
    assertConfigured();
    setAuthError('');

    const normalizedEmail = (nextEmail || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    const { error } = await supabase.auth.updateUser({
      email: normalizedEmail
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_update_email_error', { message: error.message });
      throw error;
    }
  }

  async function updatePassword(nextPassword) {
    assertConfigured();
    setAuthError('');

    if (!nextPassword || nextPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { error } = await supabase.auth.updateUser({
      password: nextPassword
    });

    if (error) {
      setAuthError(error.message);
      trackEvent('auth_update_password_error', { message: error.message });
      throw error;
    }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  function clearAuthError() {
    setAuthError('');
  }

  const value = useMemo(
    () => ({
      user,
      provider,
      isVerified,
      isLoading,
      authError,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordResetEmail,
      resendVerificationEmail,
      signInWithProvider,
      updateProfile,
      updateEmail,
      updatePassword,
      revokeOtherSessions,
      listMfaFactors,
      startTotpEnrollment,
      verifyTotpEnrollment,
      clearAuthError,
      logout
    }),
    [user, provider, isVerified, isLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return ctx;
}







