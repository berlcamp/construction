-- Create the custom schema
CREATE SCHEMA IF NOT EXISTS construction;

-- Grant access to Supabase roles so PostgREST (API), Auth, and Realtime can operate
GRANT USAGE ON SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA construction TO anon, authenticated, service_role;

-- Ensure future objects in this schema also get the right grants
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
