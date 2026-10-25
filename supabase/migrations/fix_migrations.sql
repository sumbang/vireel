-- 1. Supprimer l'ancien champ 'credits' (s'il existe)
ALTER TABLE public.abonnement
DROP COLUMN IF EXISTS credits;

-- 2. Ajouter les nouveaux champs avec leurs types exacts
ALTER TABLE public.abonnement
    ADD COLUMN IF NOT EXISTS icon varchar,
    ADD COLUMN IF NOT EXISTS highlighted bool DEFAULT false,
    ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS color varchar,
    ADD COLUMN IF NOT EXISTS credit int2 DEFAULT 0;

-- 3. (Optionnel) Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN public.abonnement.icon IS 'Nom ou identifiant de l icône';
COMMENT ON COLUMN public.abonnement.highlighted IS 'Indique si l abonnement doit être mis en avant';
COMMENT ON COLUMN public.abonnement.features IS 'Liste des fonctionnalités incluses';
COMMENT ON COLUMN public.abonnement.color IS 'Code couleur associé à l abonnement';
COMMENT ON COLUMN public.abonnement.credit IS 'Nombre de crédits inclus';

-- Ajout des nouveaux champs à la table film_summaries
ALTER TABLE public.film_summaries
    ADD COLUMN IF NOT EXISTS music_track_id text,
    ADD COLUMN IF NOT EXISTS music_start_ms int4,
    ADD COLUMN IF NOT EXISTS music_end_ms int4;

-- (Optionnel) Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN public.film_summaries.music_track_id IS 'Identifiant de la piste musicale';
COMMENT ON COLUMN public.film_summaries.music_start_ms IS 'Début de la musique en millisecondes';
COMMENT ON COLUMN public.film_summaries.music_end_ms IS 'Fin de la musique en millisecondes';

-- ÉTAPE 1 : Supprimer toutes les colonnes de la table 'souscription' sauf 'id'
-- (PostgreSQL permet de cibler les colonnes dynamiquement ou via une liste)
DO $$
DECLARE
r RECORD;
BEGIN
FOR r IN (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'souscription'
          AND column_name != 'id'
    )
    LOOP
        EXECUTE 'ALTER TABLE public.souscription DROP COLUMN IF EXISTS ' || quote_ident(r.column_name) || ' CASCADE;';
END LOOP;
END $$;

-- ÉTAPE 2 : Ajouter tous les nouveaux champs avec leurs types et contraintes respectifs
ALTER TABLE public.souscription
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS userid uuid,
    ADD COLUMN IF NOT EXISTS abonnement uuid,
    ADD COLUMN IF NOT EXISTS payment_mode varchar,
    ADD COLUMN IF NOT EXISTS payment_amount float4,
    ADD COLUMN IF NOT EXISTS payment_reference varchar,
    ADD COLUMN IF NOT EXISTS payment_start_date timestamptz,
    ADD COLUMN IF NOT EXISTS payment_end_date timestamptz,
    ADD COLUMN IF NOT EXISTS payment_status payment_status,
    ADD COLUMN IF NOT EXISTS payment_comment text,
    ADD COLUMN IF NOT EXISTS auto_renew bool NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
    ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
    ADD COLUMN IF NOT EXISTS paused_at timestamptz,
    ADD COLUMN IF NOT EXISTS resumed_at timestamptz,
    ADD COLUMN IF NOT EXISTS retention_deadline_at timestamptz,
    ADD COLUMN IF NOT EXISTS account_disabled_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL,
    ADD COLUMN IF NOT EXISTS plan_credit numeric,
    ADD COLUMN IF NOT EXISTS plan_stockage numeric,
    ADD COLUMN IF NOT EXISTS next_credit_allocation_at timestamptz,
    ADD COLUMN IF NOT EXISTS credit_cycle_start_at timestamptz,
    ADD COLUMN IF NOT EXISTS credit_cycle_end_at timestamptz,
    ADD COLUMN IF NOT EXISTS scheduled_abonnement_id uuid,
    ADD COLUMN IF NOT EXISTS scheduled_billing_interval text,
    ADD COLUMN IF NOT EXISTS scheduled_effective_at timestamptz,
    ADD COLUMN IF NOT EXISTS scheduled_created_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_schedule_id text;