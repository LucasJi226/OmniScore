CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  instrument TEXT NOT NULL,
  description TEXT,
  uploader_id TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  file_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);
