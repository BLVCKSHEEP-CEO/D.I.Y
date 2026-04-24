import { categories, threadByTopicId, topics as staticTopics } from '../data/threads';
import { isSupabaseConfigured, supabase } from './supabase';

function toSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function fallbackTopics() {
  return staticTopics;
}

function fallbackThread(topicId) {
  const root = threadByTopicId[topicId];
  return root ? structuredClone(root) : null;
}

function mapTopicRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || row.body?.slice(0, 120) || '',
    body: row.body || '',
    status: row.status || 'open',
    category: row.category || categories[0],
    tags: row.tags || [],
    difficulty: row.difficulty || 'beginner',
    author: row.author_handle || 'member',
    repliesCount: row.replies_count || 0,
    watchers: row.watchers || 0,
    solved: Boolean(row.solved),
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleString() : 'just now'
  };
}

function mapReplyRow(row) {
  return {
    id: row.id,
    topicId: row.topic_id,
    parentReplyId: row.parent_reply_id,
    author: row.author_handle || 'member',
    category: row.category || 'Community',
    errorCode: row.error_code || 'USR',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : 'just now',
    tags: row.tags || [],
    content: row.body || '',
    reactions: row.reactions || { helpful: 0, unclear: 0 },
    accepted: Boolean(row.accepted)
  };
}

function buildTree(replies) {
  if (!replies.length) return null;

  const nodes = new Map();
  replies.forEach((reply) => {
    nodes.set(reply.id, { ...reply, replies: [] });
  });

  let root = null;
  replies.forEach((reply) => {
    const current = nodes.get(reply.id);
    if (!reply.parentReplyId) {
      root = current;
      return;
    }
    const parent = nodes.get(reply.parentReplyId);
    if (parent) parent.replies.push(current);
  });

  return root;
}

export async function fetchTopics() {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackTopics();
  }

  const { data, error } = await supabase
    .from('community_topics')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return fallbackTopics();
  }

  if (!data?.length) {
    return fallbackTopics();
  }

  return data.map(mapTopicRow);
}

export async function fetchTopicBySlug(slug) {
  if (!slug) return null;

  if (!isSupabaseConfigured || !supabase) {
    return staticTopics.find((topic) => topic.slug === slug) || null;
  }

  const { data, error } = await supabase
    .from('community_topics')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return staticTopics.find((topic) => topic.slug === slug) || null;
  }

  return mapTopicRow(data);
}

export async function fetchThreadByTopicId(topicId) {
  if (!topicId) return null;

  if (!isSupabaseConfigured || !supabase) {
    return fallbackThread(topicId);
  }

  const { data, error } = await supabase
    .from('community_replies')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at');

  if (error) {
    return fallbackThread(topicId);
  }

  if (!data?.length) {
    return null;
  }

  return buildTree(data.map(mapReplyRow));
}

export async function createTopic({ title, body, category, tags = [], difficulty = 'beginner', authorHandle = 'member' }) {
  const slugBase = toSlug(title);
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

  if (!isSupabaseConfigured || !supabase) {
    const local = {
      id: Date.now(),
      slug,
      title,
      excerpt: body.slice(0, 120),
      body,
      status: 'open',
      category,
      tags,
      difficulty,
      author: authorHandle,
      repliesCount: 0,
      watchers: 1,
      solved: false,
      updatedAt: 'just now'
    };
    return local;
  }

  const payload = {
    slug,
    title,
    body,
    excerpt: body.slice(0, 120),
    category,
    status: 'open',
    difficulty,
    tags,
    author_handle: authorHandle,
    replies_count: 0,
    watchers: 1,
    solved: false
  };

  const { data, error } = await supabase
    .from('community_topics')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return {
      id: Date.now(),
      slug,
      title,
      excerpt: body.slice(0, 120),
      body,
      status: 'open',
      category,
      tags,
      difficulty,
      author: authorHandle,
      repliesCount: 0,
      watchers: 1,
      solved: false,
      updatedAt: 'just now'
    };
  }

  return mapTopicRow(data);
}

export async function addReply({ topicId, parentReplyId = null, authorHandle, category, body, tags = [] }) {
  if (!topicId || !body.trim()) return null;

  if (!isSupabaseConfigured || !supabase) {
    return {
      id: Date.now() + Math.floor(Math.random() * 999),
      parentReplyId,
      topicId,
      author: authorHandle,
      category: category || 'Community',
      errorCode: 'USR',
      createdAt: 'just now',
      tags,
      content: body.trim(),
      replies: [],
      reactions: { helpful: 0, unclear: 0 },
      accepted: false
    };
  }

  const payload = {
    topic_id: topicId,
    parent_reply_id: parentReplyId,
    author_handle: authorHandle,
    category: category || 'Community',
    error_code: 'USR',
    tags,
    body: body.trim(),
    reactions: { helpful: 0, unclear: 0 },
    accepted: false
  };

  const { data, error } = await supabase
    .from('community_replies')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return {
      id: Date.now() + Math.floor(Math.random() * 999),
      parentReplyId,
      topicId,
      author: authorHandle,
      category: category || 'Community',
      errorCode: 'USR',
      createdAt: 'just now',
      tags,
      content: body.trim(),
      replies: [],
      reactions: { helpful: 0, unclear: 0 },
      accepted: false
    };
  }

  return {
    ...mapReplyRow(data),
    replies: []
  };
}







