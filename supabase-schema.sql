-- =============================================================================
-- Abundant Air — Customer & Invoice Manager
-- Supabase database schema
-- =============================================================================
-- HOW TO USE THIS FILE:
--   1. Create a free project at https://supabase.com
--   2. Open your project, go to the "SQL Editor" tab
--   3. Paste this entire file in and click "Run"
--   4. That's it — two tables, security rules, and indexes are all created.
--
-- This app uses Supabase's built-in "auth.users" table for login/registration,
-- so we don't need to create our own users table. We just reference it.
-- =============================================================================

-- Turn on the extension that lets Postgres generate UUIDs for us.
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table: customers
-- One row per customer. Each row is tagged with the id of the user (the
-- logged-in account) who created it, so every account only ever sees its own
-- customers.
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    phone       text,
    email       text,
    address     text,
    created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Table: invoices
-- One row per invoice. Linked to both the customer it belongs to and the
-- account that owns it.
-- -----------------------------------------------------------------------------
create table if not exists public.invoices (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id) on delete cascade,
    customer_id   uuid not null references public.customers(id) on delete cascade,
    invoice_date  date not null default current_date,
    amount        numeric(10, 2) not null default 0 check (amount >= 0),
    status        text not null default 'Unpaid' check (status in ('Unpaid', 'Partial', 'Paid', 'Overdue')),
    notes         text,
    created_at    timestamptz not null default now()
);

-- Helpful indexes so lookups by owner/customer stay fast as data grows.
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- This is what enforces "users can only see/edit/delete their own data" —
-- it happens at the database level, so even if the frontend code had a bug,
-- Supabase itself would refuse to leak or modify another user's rows.
-- -----------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.invoices  enable row level security;

-- Customers: an account can select/insert/update/delete only rows it owns.
create policy "Customers are visible to their owner"
    on public.customers for select
    using (auth.uid() = user_id);

create policy "Customers are insertable by their owner"
    on public.customers for insert
    with check (auth.uid() = user_id);

create policy "Customers are editable by their owner"
    on public.customers for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Customers are deletable by their owner"
    on public.customers for delete
    using (auth.uid() = user_id);

-- Invoices: same pattern.
create policy "Invoices are visible to their owner"
    on public.invoices for select
    using (auth.uid() = user_id);

create policy "Invoices are insertable by their owner"
    on public.invoices for insert
    with check (auth.uid() = user_id);

create policy "Invoices are editable by their owner"
    on public.invoices for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Invoices are deletable by their owner"
    on public.invoices for delete
    using (auth.uid() = user_id);
