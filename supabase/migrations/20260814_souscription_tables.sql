-- 2026xxxx_create_souscription.sql
-- Base table for user subscriptions (initial schema)

create table if not exists public.souscription (
                                                   id               uuid primary key default gen_random_uuid(),
    created_at       timestamptz not null default now(),
    userid           uuid not null references auth.users(id) on delete cascade,
    plan             text not null,
    payment_date     timestamptz not null default now(),
    payment_end_date timestamptz not null,
    amount           numeric(14, 2) not null default 0
    );

create index if not exists idx_souscription_userid
    on public.souscription(userid);

create index if not exists idx_souscription_payment_end_date
    on public.souscription(payment_end_date);

-- 2026xxxx_create_abonnement.sql
-- Initial schema for subscription plan catalog

create table if not exists public.abonnement (
                                                 id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    name         text not null,
    price        numeric(14, 2) not null default 0,
    credits     numeric(14, 2) not null default 0,
    storage    numeric(14, 6) not null default 0
    );

create unique index if not exists uq_abonnement_name
    on public.abonnement(name);

-- 20261025_add_priorite_to_abonnement.sql

alter table if exists public.abonnement
    add column if not exists priorite integer;

-- Backfill for existing rows that don't have a value yet
update public.abonnement
set priorite = 0
where priorite is null;

-- Enforce not-null + default for future rows
alter table if exists public.abonnement
alter column priorite set default 0,
    alter column priorite set not null;

-- Optional but useful for listing plans by priority
create index if not exists idx_abonnement_priorite
    on public.abonnement(priorite);