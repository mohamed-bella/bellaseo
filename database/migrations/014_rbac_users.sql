-- ==========================================
-- 014: Role-Based Access Control (RBAC) Users
-- ==========================================

-- 1. Create the `users` table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor', -- 'admin' or 'editor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the `user_campaigns` junction table (which specific campaigns can an editor see?)
CREATE TABLE IF NOT EXISTS user_campaigns (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, campaign_id)
);

-- 3. Add auto-update trigger for users table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

-- 4. Seed default admin user (username: admin, password: admin123)
-- Hash generated via bcrypt: $2b$10$eYiJXHkk2AwUX6AqDJ/lJF4uT52qdFjU.5YdXQxNnf4aes5J
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$eYiJXHkk2AwUX6AqDJ/lJF4uT52qdFjU.5YdXQxNnf4aes5J', 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = '$2b$10$eYiJXHkk2AwUX6AqDJ/lJF4uT52qdFjU.5YdXQxNnf4aes5J';
