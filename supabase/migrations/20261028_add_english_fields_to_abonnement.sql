-- English counterparts of abonnement's marketing-copy columns, so the
-- pricing cards (PlanCard.jsx, used by both AbonnementPage.jsx and
-- LandingPricingSection.jsx) can show the right language instead of
-- always falling back to French. The existing cible/description/features
-- columns are the French version (added in
-- 20261002_add_description_fields_to_abonnement.sql and
-- 20261002_convert_abonnement_description_to_feature_list.sql, plus the
-- pre-existing untracked "features" column) and keep that role --
-- nothing here renames or repurposes them.
--
-- description_en is plain text like description; features_en is a
-- Postgres text[] like features. cible_en stays plain text like cible.
--
-- No safe default exists for this marketing copy either -- added
-- nullable and must be filled in per plan afterwards, e.g.:
--   update public.abonnement set
--     cible_en = '...',
--     description_en = '...',
--     features_en = array['...', '...']
--   where name ilike '%silver%';
--
-- Until filled in, the frontend falls back to the French column for that
-- plan when viewed in English (see pickLocalizedPlanField in
-- dashboard/src/lib/abonnementDisplay.js), so an English-speaking visitor
-- never sees a blank card while the catalog is being translated.
alter table if exists public.abonnement
  add column if not exists cible_en text,
  add column if not exists description_en text,
  add column if not exists features_en text[];
