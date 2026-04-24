import { isSupabaseConfigured, supabase } from './supabase';

const FALLBACK_PREFIX = 'diy.social';

function readStore(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${FALLBACK_PREFIX}.${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${FALLBACK_PREFIX}.${key}`, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

export async function searchProfiles(query = '') {
  const q = query.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, bio, specialties, solved_topics_count, created_at, email_verified')
      .order('handle');

    if (error) throw error;

    const mapped = (data || []).map((row) => ({
      id: row.id,
      handle: row.handle,
      name: row.display_name || row.handle,
      avatar: row.avatar_url || '',
      bio: row.bio || '',
      specialties: row.specialties || [],
      solvedTopicsCount: row.solved_topics_count || 0,
      joinedAt: row.created_at,
      verified: Boolean(row.email_verified)
    }));

    if (!q) return mapped;

    return mapped.filter(
      (profile) =>
        profile.handle.toLowerCase().includes(q) ||
        profile.name.toLowerCase().includes(q) ||
        profile.specialties.join(' ').toLowerCase().includes(q)
    );
  }

  const fallbackProfiles = readStore('profiles', [
    {
      id: 'user-nari',
      handle: 'nari_87',
      name: 'Nari',
      avatar: '',
      bio: 'Smart device power diagnosis.',
      specialties: ['electronics', 'power'],
      solvedTopicsCount: 12,
      joinedAt: '2025-11-12T00:00:00.000Z',
      verified: true
    },
    {
      id: 'user-frame',
      handle: 'framefuse',
      name: 'Frame Fuse',
      avatar: '',
      bio: 'Board-level repair and microsoldering.',
      specialties: ['soldering', 'firmware'],
      solvedTopicsCount: 8,
      joinedAt: '2025-12-21T00:00:00.000Z',
      verified: true
    }
  ]);

  if (!q) return fallbackProfiles;

  return fallbackProfiles.filter(
    (profile) =>
      profile.handle.toLowerCase().includes(q) ||
      profile.name.toLowerCase().includes(q) ||
      profile.specialties.join(' ').toLowerCase().includes(q)
  );
}

export async function getProfileByHandle(handle) {
  if (!handle) return null;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, bio, specialties, solved_topics_count, created_at, email_verified')
      .eq('handle', handle)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      handle: data.handle,
      name: data.display_name || data.handle,
      avatar: data.avatar_url || '',
      bio: data.bio || '',
      specialties: data.specialties || [],
      solvedTopicsCount: data.solved_topics_count || 0,
      joinedAt: data.created_at,
      verified: Boolean(data.email_verified)
    };
  }

  const rows = readStore('profiles', []);
  return rows.find((row) => row.handle === handle) || null;
}

export async function getRelationshipState(currentUserId) {
  if (!currentUserId) return { friendships: {}, inbound: {}, outbound: {} };

  if (isSupabaseConfigured && supabase) {
    const [{ data: requests, error: reqErr }, { data: friendships, error: frErr }] = await Promise.all([
      supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),
      supabase
        .from('friendships')
        .select('user_a_id, user_b_id, status')
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
    ]);

    if (reqErr) throw reqErr;
    if (frErr) throw frErr;

    const outbound = {};
    const inbound = {};
    const friends = {};

    (requests || []).forEach((req) => {
      if (req.sender_id === currentUserId && req.status === 'pending') {
        outbound[req.receiver_id] = req.id;
      }
      if (req.receiver_id === currentUserId && req.status === 'pending') {
        inbound[req.sender_id] = req.id;
      }
    });

    (friendships || []).forEach((friendship) => {
      if (friendship.status !== 'accepted') return;
      const peerId = friendship.user_a_id === currentUserId ? friendship.user_b_id : friendship.user_a_id;
      friends[peerId] = true;
    });

    return { friendships: friends, inbound, outbound };
  }

  return readStore(`relationships.${currentUserId}`, { friendships: {}, inbound: {}, outbound: {} });
}

export async function sendFriendRequest(senderId, receiverId) {
  if (!senderId || !receiverId || senderId === receiverId) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending'
    });

    if (error) throw error;
    return;
  }

  const rel = readStore(`relationships.${senderId}`, { friendships: {}, inbound: {}, outbound: {} });
  rel.outbound[receiverId] = `local-${Date.now()}`;
  writeStore(`relationships.${senderId}`, rel);

  const peer = readStore(`relationships.${receiverId}`, { friendships: {}, inbound: {}, outbound: {} });
  peer.inbound[senderId] = `local-${Date.now()}`;
  writeStore(`relationships.${receiverId}`, peer);
}

export async function approveFriendRequest(currentUserId, senderId) {
  if (!currentUserId || !senderId) return;

  if (isSupabaseConfigured && supabase) {
    const { data: pending, error: findErr } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', senderId)
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;

    if (pending?.id) {
      const { error: updateErr } = await supabase
        .from('friend_requests')
        .update({ status: 'approved', responded_at: nowIso() })
        .eq('id', pending.id);
      if (updateErr) throw updateErr;
    }

    const low = senderId < currentUserId ? senderId : currentUserId;
    const high = senderId < currentUserId ? currentUserId : senderId;

    const { error: insertErr } = await supabase
      .from('friendships')
      .upsert({ user_a_id: low, user_b_id: high, status: 'accepted' }, { onConflict: 'user_a_id,user_b_id' });

    if (insertErr) throw insertErr;
    return;
  }

  const mine = readStore(`relationships.${currentUserId}`, { friendships: {}, inbound: {}, outbound: {} });
  delete mine.inbound[senderId];
  mine.friendships[senderId] = true;
  writeStore(`relationships.${currentUserId}`, mine);

  const peer = readStore(`relationships.${senderId}`, { friendships: {}, inbound: {}, outbound: {} });
  delete peer.outbound[currentUserId];
  peer.friendships[currentUserId] = true;
  writeStore(`relationships.${senderId}`, peer);
}

export async function getDmMessages(currentUserId, peerId) {
  if (!currentUserId || !peerId) return [];

  if (isSupabaseConfigured && supabase) {
    const low = currentUserId < peerId ? currentUserId : peerId;
    const high = currentUserId < peerId ? peerId : currentUserId;

    const { data: thread, error: threadErr } = await supabase
      .from('dm_threads')
      .select('id')
      .eq('user_a_id', low)
      .eq('user_b_id', high)
      .maybeSingle();

    if (threadErr) throw threadErr;
    if (!thread?.id) return [];

    const { data: messages, error: msgErr } = await supabase
      .from('dm_messages')
      .select('id, sender_id, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at');

    if (msgErr) throw msgErr;

    return (messages || []).map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      body: message.body,
      createdAt: message.created_at
    }));
  }

  return readStore(`dm.${currentUserId}.${peerId}`, []);
}

export async function sendDmMessage(currentUserId, peerId, body) {
  if (!currentUserId || !peerId || !body.trim()) return;

  if (isSupabaseConfigured && supabase) {
    const low = currentUserId < peerId ? currentUserId : peerId;
    const high = currentUserId < peerId ? peerId : currentUserId;

    const { data: thread, error: upsertErr } = await supabase
      .from('dm_threads')
      .upsert({ user_a_id: low, user_b_id: high }, { onConflict: 'user_a_id,user_b_id' })
      .select('id')
      .single();

    if (upsertErr) throw upsertErr;

    const { error: msgErr } = await supabase.from('dm_messages').insert({
      thread_id: thread.id,
      sender_id: currentUserId,
      body: body.trim()
    });

    if (msgErr) throw msgErr;
    return;
  }

  const mineKey = `dm.${currentUserId}.${peerId}`;
  const peerKey = `dm.${peerId}.${currentUserId}`;
  const message = {
    id: Date.now(),
    senderId: currentUserId,
    body: body.trim(),
    createdAt: nowIso()
  };

  writeStore(mineKey, [...readStore(mineKey, []), message]);
  writeStore(peerKey, [...readStore(peerKey, []), message]);
}

export async function reportTarget(reporterId, payload) {
  if (!reporterId) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      target_type: payload.targetType,
      target_id: payload.targetId,
      reason: payload.reason,
      details: payload.details || ''
    });
    if (error) throw error;
    return;
  }

  const reports = readStore('reports', []);
  reports.push({ id: `r-${Date.now()}`, reporterId, ...payload, createdAt: nowIso() });
  writeStore('reports', reports);
}

export async function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('user_blocks')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) throw error;
    return;
  }

  const rows = readStore(`blocks.${blockerId}`, {});
  rows[blockedId] = true;
  writeStore(`blocks.${blockerId}`, rows);
}

export async function muteUser(muterId, mutedId) {
  if (!muterId || !mutedId) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('user_mutes')
      .upsert({ muter_id: muterId, muted_id: mutedId }, { onConflict: 'muter_id,muted_id' });
    if (error) throw error;
    return;
  }

  const rows = readStore(`mutes.${muterId}`, {});
  rows[mutedId] = true;
  writeStore(`mutes.${muterId}`, rows);
}

export async function getModerationQueue() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('moderation_queue')
      .select('id, target_type, target_id, reason, severity, status, created_at')
      .in('status', ['open', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      targetType: item.target_type,
      targetTitle: `Target ${item.target_id}`,
      reason: item.reason,
      severity: item.severity,
      createdAt: new Date(item.created_at).toLocaleString()
    }));
  }

  return readStore('reports', []).map((report) => ({
    id: report.id,
    targetType: report.targetType,
    targetTitle: `Target ${report.targetId}`,
    reason: report.reason,
    severity: 'medium',
    createdAt: new Date(report.createdAt).toLocaleString()
  }));
}







