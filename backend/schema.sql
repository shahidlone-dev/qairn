-- ============================================================
-- qaaf — Complete Supabase Database Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        TEXT        NOT NULL UNIQUE,
  phone           TEXT        NOT NULL UNIQUE,
  password        TEXT        NOT NULL,
  full_name       TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  dept            TEXT,
  university      TEXT,
  year            SMALLINT,
  is_premium      BOOLEAN     DEFAULT FALSE,
  is_tutor        BOOLEAN     DEFAULT FALSE,
  is_helper       BOOLEAN     DEFAULT FALSE,
  is_verified     BOOLEAN     DEFAULT FALSE,
  circle_count    INTEGER     DEFAULT 0,
  post_count      INTEGER     DEFAULT 0,
  rating          NUMERIC(3,2)DEFAULT 0.0,
  rating_count    INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone    ON users(phone);
CREATE INDEX idx_users_dept     ON users(dept);

-- ── CIRCLE (follows) ──────────────────────────────────────────────────────────
CREATE TABLE circles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_circles_follower  ON circles(follower_id);
CREATE INDEX idx_circles_following ON circles(following_id);

-- ── POSTS ─────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  media_url   TEXT,
  media_type  TEXT        CHECK (media_type IN ('image', 'video', 'reel', NULL)),
  like_count  INTEGER     DEFAULT 0,
  comment_count INTEGER   DEFAULT 0,
  share_count INTEGER     DEFAULT 0,
  is_deleted  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id    ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- ── POST LIKES ────────────────────────────────────────────────────────────────
CREATE TABLE post_likes (
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ── COMMENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES comments(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  is_deleted  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- ── MARKET LISTINGS ───────────────────────────────────────────────────────────
CREATE TABLE market_listings (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('item', 'note')),
  title         TEXT        NOT NULL,
  description   TEXT,
  price         NUMERIC     NOT NULL CHECK (price >= 0),
  dept          TEXT,

  -- Item specific
  condition     TEXT        CHECK (condition IN ('new', 'slight', 'used', NULL)),
  images        TEXT[],

  -- Note specific
  note_type     TEXT        CHECK (note_type IN ('pdf', 'physical', NULL)),
  pages         INTEGER,
  subject       TEXT,
  file_url      TEXT,
  rating        NUMERIC(3,2)DEFAULT 0.0,
  sales         INTEGER     DEFAULT 0,

  is_sold       BOOLEAN     DEFAULT FALSE,
  is_featured   BOOLEAN     DEFAULT FALSE,
  is_deleted    BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_seller_id ON market_listings(seller_id);
CREATE INDEX idx_market_type      ON market_listings(type);
CREATE INDEX idx_market_dept      ON market_listings(dept);
CREATE INDEX idx_market_is_sold   ON market_listings(is_sold);

-- ── MARKET ORDERS ─────────────────────────────────────────────────────────────
CREATE TABLE market_orders (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id   UUID        NOT NULL REFERENCES market_listings(id) ON DELETE RESTRICT,
  buyer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount       NUMERIC     NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','confirmed','meeting_set','delivered','completed','cancelled')),
  meet_location TEXT,
  meet_time    TIMESTAMPTZ,
  pages        INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer_id  ON market_orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON market_orders(seller_id);
CREATE INDEX idx_orders_status    ON market_orders(status);

-- ── SERVICE LISTINGS ──────────────────────────────────────────────────────────
CREATE TABLE service_listings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('tutor', 'assignment')),
  subjects       TEXT[]      NOT NULL,
  dept           TEXT,
  bio            TEXT,

  -- Tutor specific
  rate_per_hour  NUMERIC,
  is_available   BOOLEAN     DEFAULT TRUE,
  sessions_done  INTEGER     DEFAULT 0,

  -- Assignment specific
  price_per_page NUMERIC,
  max_pages      INTEGER,
  delivery_days  INTEGER,
  assignments_done INTEGER   DEFAULT 0,

  rating         NUMERIC(3,2)DEFAULT 0.0,
  rating_count   INTEGER     DEFAULT 0,
  is_active      BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_provider ON service_listings(provider_id);
CREATE INDEX idx_services_type     ON service_listings(type);
CREATE INDEX idx_services_dept     ON service_listings(dept);

-- ── SERVICE BOOKINGS ──────────────────────────────────────────────────────────
CREATE TABLE service_bookings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id   UUID        NOT NULL REFERENCES service_listings(id) ON DELETE RESTRICT,
  client_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type         TEXT        NOT NULL CHECK (type IN ('tutor', 'assignment')),

  -- Tutor session
  hours        INTEGER,
  session_time TIMESTAMPTZ,

  -- Assignment
  pages        INTEGER,
  deadline     TIMESTAMPTZ,
  instructions TEXT,

  amount       NUMERIC     NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','in_progress','delivered','completed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_client_id   ON service_bookings(client_id);
CREATE INDEX idx_bookings_provider_id ON service_bookings(provider_id);
CREATE INDEX idx_bookings_status      ON service_bookings(status);

-- ── CHATS ─────────────────────────────────────────────────────────────────────
CREATE TABLE chats (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT        NOT NULL CHECK (type IN ('dm', 'group')),
  name         TEXT,
  avatar_url   TEXT,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_members (
  chat_id    UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  is_admin   BOOLEAN     DEFAULT FALSE,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members(user_id);

-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id      UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type         TEXT        NOT NULL DEFAULT 'text'
                           CHECK (type IN ('text','image','file','voice')),
  text         TEXT,
  media_url    TEXT,
  file_name    TEXT,
  file_size    INTEGER,
  duration     INTEGER,
  reply_to_id  UUID        REFERENCES messages(id) ON DELETE SET NULL,
  reactions    JSONB       DEFAULT '[]',
  status       TEXT        NOT NULL DEFAULT 'sent'
                           CHECK (status IN ('sent','delivered','seen')),
  is_deleted   BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id    ON messages(chat_id);
CREATE INDEX idx_messages_sender_id  ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  data        JSONB       DEFAULT '{}',
  is_read     BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ── SAVED POSTS ───────────────────────────────────────────────────────────────
CREATE TABLE saved_posts (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','posts','market_listings','market_orders',
    'service_listings','service_bookings','chats','messages'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Enable RLS on all tables (backend service key bypasses this)
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_listings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Public read for posts and market listings
CREATE POLICY "Public read posts"           ON posts            FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Public read market listings" ON market_listings  FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Public read service listings"ON service_listings FOR SELECT USING (is_active);
CREATE POLICY "Public read users"           ON users            FOR SELECT USING (true);