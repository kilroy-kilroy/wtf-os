-- 20260702_client_documents_drop_category_check.sql
-- Root-cause fix for prospect share-links failing with Postgres 23514
-- ("client_documents violates check constraint client_documents_category_check").
--
-- Production carried a legacy CHECK constraint on client_documents.category from
-- an earlier schema. It was never declared in any repo migration — the repo's own
-- table definition (20260423) declares `category TEXT NOT NULL` with no CHECK,
-- i.e. category is intended to be free text. The stale constraint rejected the
-- share-link categories ('proposal', 'alignment', 'scope', 'other').
--
-- Drop it to bring production in line with the repo's declared schema. Dropping a
-- CHECK constraint never affects existing rows. Idempotent.

ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_category_check;
