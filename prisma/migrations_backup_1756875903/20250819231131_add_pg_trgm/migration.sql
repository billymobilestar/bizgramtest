CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_handle_trgm_idx ON "Profile" USING GIN (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_displayname_trgm_idx ON "Profile" USING GIN ("displayName" gin_trgm_ops);

