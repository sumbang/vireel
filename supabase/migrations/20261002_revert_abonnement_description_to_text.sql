-- Reverts 20261002_convert_abonnement_description_to_feature_list.sql:
-- description goes back to a single plain text value instead of a JSON
-- array. AbonnementPage.jsx's "Fonctionnalites IA incluses dans les
-- credits" list already tolerates a plain string (wraps it as a single
-- item instead of mapping over an array), so no frontend change is
-- needed for this revert.
--
-- Any array content already entered is preserved by joining its items
-- into one comma-separated string rather than discarding it; edit it
-- into a clean sentence per plan afterwards if needed.
alter table if exists public.abonnement
    add column if not exists description_text text;

update public.abonnement
set description_text = case
                           when description is null then null
                           when jsonb_typeof(description) = 'array' then
                               (select string_agg(value, ', ')
                                from jsonb_array_elements_text(description) as t(value))
                           else description #>> '{}'
    end;

alter table if exists public.abonnement
drop column description;

alter table if exists public.abonnement
    rename column description_text to description;
