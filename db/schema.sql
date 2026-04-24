-- D.I.Y PostgreSQL schema for repair topics and threaded replies.

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  handle VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  reputation INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE topics (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(220) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'solved', 'archived')),
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  solved_reply_id BIGINT,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE replies (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  parent_reply_id BIGINT REFERENCES replies(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  category VARCHAR(40) NOT NULL,
  error_code VARCHAR(24),
  is_solution BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  depth INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT depth_non_negative CHECK (depth >= 0)
);

ALTER TABLE topics
  ADD CONSTRAINT fk_topics_solved_reply
  FOREIGN KEY (solved_reply_id) REFERENCES replies(id) ON DELETE SET NULL;

CREATE TABLE topic_follows (
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE topic_votes (
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE reply_votes (
  reply_id BIGINT NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reply_id, user_id)
);

CREATE TABLE attachments (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES topics(id) ON DELETE CASCADE,
  reply_id BIGINT REFERENCES replies(id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  storage_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_owner_target CHECK (
    (topic_id IS NOT NULL AND reply_id IS NULL) OR
    (topic_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE INDEX idx_topics_status_created ON topics(status, created_at DESC);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_author_created ON topics(author_id, created_at DESC);
CREATE INDEX idx_replies_topic_parent ON replies(topic_id, parent_reply_id);
CREATE INDEX idx_replies_topic_depth ON replies(topic_id, depth, created_at);
CREATE INDEX idx_replies_author_created ON replies(author_id, created_at DESC);
CREATE INDEX idx_topic_follows_user ON topic_follows(user_id, created_at DESC);
CREATE INDEX idx_topic_votes_user ON topic_votes(user_id, created_at DESC);
CREATE INDEX idx_reply_votes_user ON reply_votes(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_replies_updated_at
BEFORE UPDATE ON replies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Example recursive query for a full thread:
-- WITH RECURSIVE thread AS (
--   SELECT r.*, 0 AS level
--   FROM replies r
--   WHERE r.topic_id = $1 AND r.parent_reply_id IS NULL
--   UNION ALL
--   SELECT child.*, thread.level + 1
--   FROM replies child
--   JOIN thread ON child.parent_reply_id = thread.id
-- )
-- SELECT * FROM thread ORDER BY created_at;

-- ============================================================
-- Supabase social + profile + moderation extension
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  solved_topics_count INT NOT NULL DEFAULT 0,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 160)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT friend_request_not_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pair_pending
ON friend_requests(sender_id, receiver_id)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS friendships (
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_a_id, user_b_id),
  CONSTRAINT friendship_not_self CHECK (user_a_id <> user_b_id),
  CONSTRAINT friendship_order CHECK (user_a_id < user_b_id)
);

CREATE TABLE IF NOT EXISTS dm_threads (
  id BIGSERIAL PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dm_not_self CHECK (user_a_id <> user_b_id),
  CONSTRAINT dm_order CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  CONSTRAINT dm_body_not_empty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread_created
ON dm_messages(thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT block_not_self CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS user_mutes (
  muter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id),
  CONSTRAINT mute_not_self CHECK (muter_id <> muted_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'topic', 'reply', 'dm_message')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id BIGSERIAL PRIMARY KEY,
  report_id BIGINT REFERENCES reports(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created
ON moderation_queue(status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_topics (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'solved', 'archived')),
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_handle TEXT NOT NULL,
  replies_count INT NOT NULL DEFAULT 0,
  watchers INT NOT NULL DEFAULT 0,
  solved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_topics_updated
ON community_topics(updated_at DESC);

CREATE TABLE IF NOT EXISTS community_replies (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  parent_reply_id BIGINT REFERENCES community_replies(id) ON DELETE CASCADE,
  author_handle TEXT NOT NULL,
  category TEXT NOT NULL,
  error_code TEXT NOT NULL DEFAULT 'USR',
  tags TEXT[] NOT NULL DEFAULT '{}',
  body TEXT NOT NULL,
  reactions JSONB NOT NULL DEFAULT '{"helpful":0,"unclear":0}'::jsonb,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_replies_topic_created
ON community_replies(topic_id, created_at ASC);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created
ON telemetry_events(created_at DESC);

CREATE OR REPLACE FUNCTION trg_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trg_profile_updated_at();

CREATE OR REPLACE FUNCTION trg_dm_thread_touch_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_threads
  SET last_message_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dm_thread_touch_last_message ON dm_messages;
CREATE TRIGGER trg_dm_thread_touch_last_message
AFTER INSERT ON dm_messages
FOR EACH ROW EXECUTE FUNCTION trg_dm_thread_touch_last_message();

CREATE OR REPLACE FUNCTION trg_reports_to_moderation_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO moderation_queue(report_id, target_type, target_id, reason, severity)
  VALUES (
    NEW.id,
    NEW.target_type,
    NEW.target_id,
    NEW.reason,
    CASE
      WHEN NEW.reason ILIKE '%threat%' OR NEW.reason ILIKE '%hate%' THEN 'high'
      WHEN NEW.reason ILIKE '%spam%' THEN 'medium'
      ELSE 'low'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_to_moderation_queue ON reports;
CREATE TRIGGER trg_reports_to_moderation_queue
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION trg_reports_to_moderation_queue();

CREATE OR REPLACE FUNCTION enforce_dm_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM dm_messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 12 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 12 DM messages per minute';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dm_rate_limit ON dm_messages;
CREATE TRIGGER trg_dm_rate_limit
BEFORE INSERT ON dm_messages
FOR EACH ROW EXECUTE FUNCTION enforce_dm_rate_limit();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_public_read ON profiles;
CREATE POLICY profiles_public_read ON profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS friend_requests_member_read ON friend_requests;
CREATE POLICY friend_requests_member_read ON friend_requests
FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS friend_requests_sender_insert ON friend_requests;
CREATE POLICY friend_requests_sender_insert ON friend_requests
FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS friend_requests_receiver_update ON friend_requests;
CREATE POLICY friend_requests_receiver_update ON friend_requests
FOR UPDATE USING (receiver_id = auth.uid() OR sender_id = auth.uid())
WITH CHECK (receiver_id = auth.uid() OR sender_id = auth.uid());

DROP POLICY IF EXISTS friendships_member_read ON friendships;
CREATE POLICY friendships_member_read ON friendships
FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS friendships_member_write ON friendships;
CREATE POLICY friendships_member_write ON friendships
FOR INSERT WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS dm_threads_member_read ON dm_threads;
CREATE POLICY dm_threads_member_read ON dm_threads
FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS dm_threads_member_write ON dm_threads;
CREATE POLICY dm_threads_member_write ON dm_threads
FOR INSERT WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS dm_messages_member_read ON dm_messages;
CREATE POLICY dm_messages_member_read ON dm_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM dm_threads t
    WHERE t.id = dm_messages.thread_id
      AND (t.user_a_id = auth.uid() OR t.user_b_id = auth.uid())
  )
);

DROP POLICY IF EXISTS dm_messages_sender_write ON dm_messages;
CREATE POLICY dm_messages_sender_write ON dm_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM dm_threads t
    WHERE t.id = dm_messages.thread_id
      AND (t.user_a_id = auth.uid() OR t.user_b_id = auth.uid())
  )
);

DROP POLICY IF EXISTS user_blocks_owner_rw ON user_blocks;
CREATE POLICY user_blocks_owner_rw ON user_blocks
FOR ALL USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS user_mutes_owner_rw ON user_mutes;
CREATE POLICY user_mutes_owner_rw ON user_mutes
FOR ALL USING (muter_id = auth.uid())
WITH CHECK (muter_id = auth.uid());

DROP POLICY IF EXISTS reports_reporter_read ON reports;
CREATE POLICY reports_reporter_read ON reports
FOR SELECT USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_reporter_insert ON reports;
CREATE POLICY reports_reporter_insert ON reports
FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS moderation_queue_read_authenticated ON moderation_queue;
CREATE POLICY moderation_queue_read_authenticated ON moderation_queue
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS community_topics_public_read ON community_topics;
CREATE POLICY community_topics_public_read ON community_topics
FOR SELECT USING (true);

DROP POLICY IF EXISTS community_topics_authenticated_write ON community_topics;
CREATE POLICY community_topics_authenticated_write ON community_topics
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS community_replies_public_read ON community_replies;
CREATE POLICY community_replies_public_read ON community_replies
FOR SELECT USING (true);

DROP POLICY IF EXISTS community_replies_authenticated_write ON community_replies;
CREATE POLICY community_replies_authenticated_write ON community_replies
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS telemetry_events_authenticated_insert ON telemetry_events;
CREATE POLICY telemetry_events_authenticated_insert ON telemetry_events
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
