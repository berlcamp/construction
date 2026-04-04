CREATE TABLE construction.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only create construction.profiles when signup metadata marks this app.
-- Other apps sharing the same Supabase project should pass a different `app` value (or none).

CREATE OR REPLACE FUNCTION construction.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'app' = 'construction' THEN
    INSERT INTO construction.profiles (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = construction;

-- Unique name per app: another product may already use `on_auth_user_created` on auth.users.
DROP TRIGGER IF EXISTS construction_on_auth_user_created ON auth.users;

CREATE TRIGGER construction_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION construction.handle_new_user();
