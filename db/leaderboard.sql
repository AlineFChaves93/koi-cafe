CREATE TABLE IF NOT EXISTS koi_leaderboard (
  player_id TEXT PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  score BIGINT NOT NULL DEFAULT 0,
  counters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS koi_leaderboard_rank_idx
  ON koi_leaderboard (score DESC, updated_at ASC);

