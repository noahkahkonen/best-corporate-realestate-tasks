-- New photo status: queued for the photographer's next flight run.
-- Only the enum value is added here; no rows are written with it in this
-- migration (Postgres disallows using a fresh enum value in the same
-- transaction that creates it).
ALTER TYPE "PhotoStatus" ADD VALUE IF NOT EXISTS 'NEXT_ROUTE';
