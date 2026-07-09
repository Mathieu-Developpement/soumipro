-- ============================================
-- SoumiPro - Schéma Supabase
-- À exécuter dans SQL Editor de ton projet Supabase
-- ============================================

-- Extension pour uuid
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLE: profiles (profil de l'artisan)
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text not null default '',
  trade text default '',
  logo_url text,
  primary_color text default '#0f2942',
  secondary_color text default '#3fa34d',
  hourly_rate numeric(10,2) default 50,
  address text default '',
  phone text default '',
  contact_email text default '',
  gst_number text default '',
  qst_number text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Un utilisateur voit son propre profil"
  on profiles for select using (auth.uid() = id);
create policy "Un utilisateur modifie son propre profil"
  on profiles for update using (auth.uid() = id);
create policy "Un utilisateur crée son propre profil"
  on profiles for insert with check (auth.uid() = id);

-- ============================================
-- TABLE: pdf_templates (options de personnalisation du PDF)
-- ============================================
create table pdf_templates (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade unique,
  show_logo boolean default true,
  accent_color text default '#3fa34d',
  font_style text default 'moderne',
  show_tax_details boolean default true,
  footer_text text default '',
  terms_conditions text default 'Cette soumission est valide pour 30 jours. Tout changement à la portée du travail décrit ci-dessus peut entraîner des frais additionnels.',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table pdf_templates enable row level security;

create policy "Un utilisateur voit son propre gabarit"
  on pdf_templates for select using (auth.uid() = profile_id);
create policy "Un utilisateur modifie son propre gabarit"
  on pdf_templates for update using (auth.uid() = profile_id);
create policy "Un utilisateur crée son propre gabarit"
  on pdf_templates for insert with check (auth.uid() = profile_id);

-- ============================================
-- TABLE: quotes (soumissions)
-- ============================================
create table quotes (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  client_name text not null default '',
  client_email text default '',
  client_phone text default '',
  client_address text default '',
  project_title text default '',
  project_description text default '',
  status text default 'brouillon' check (status in ('brouillon', 'envoyee', 'acceptee', 'refusee')),
  subtotal numeric(10,2) default 0,
  gst_amount numeric(10,2) default 0,
  qst_amount numeric(10,2) default 0,
  total numeric(10,2) default 0,
  notes text default '',
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table quotes enable row level security;

create policy "Un utilisateur voit ses propres soumissions"
  on quotes for select using (auth.uid() = profile_id);
create policy "Un utilisateur modifie ses propres soumissions"
  on quotes for update using (auth.uid() = profile_id);
create policy "Un utilisateur crée ses propres soumissions"
  on quotes for insert with check (auth.uid() = profile_id);
create policy "Un utilisateur supprime ses propres soumissions"
  on quotes for delete using (auth.uid() = profile_id);

-- ============================================
-- TABLE: quote_items (lignes détaillées d'une soumission)
-- ============================================
create table quote_items (
  id uuid default uuid_generate_v4() primary key,
  quote_id uuid references quotes(id) on delete cascade not null,
  description text not null default '',
  quantity numeric(10,2) default 1,
  unit text default 'unité',
  unit_price numeric(10,2) default 0,
  position int default 0,
  created_at timestamptz default now()
);

alter table quote_items enable row level security;

create policy "Un utilisateur voit les items de ses soumissions"
  on quote_items for select using (
    exists (select 1 from quotes where quotes.id = quote_items.quote_id and quotes.profile_id = auth.uid())
  );
create policy "Un utilisateur modifie les items de ses soumissions"
  on quote_items for update using (
    exists (select 1 from quotes where quotes.id = quote_items.quote_id and quotes.profile_id = auth.uid())
  );
create policy "Un utilisateur crée des items sur ses soumissions"
  on quote_items for insert with check (
    exists (select 1 from quotes where quotes.id = quote_items.quote_id and quotes.profile_id = auth.uid())
  );
create policy "Un utilisateur supprime les items de ses soumissions"
  on quote_items for delete using (
    exists (select 1 from quotes where quotes.id = quote_items.quote_id and quotes.profile_id = auth.uid())
  );

-- ============================================
-- TABLE: subscriptions (stub pour Stripe, branché plus tard)
-- ============================================
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Un utilisateur voit son propre abonnement"
  on subscriptions for select using (auth.uid() = profile_id);

-- ============================================
-- LIMITE D'ESSAI GRATUIT : 3 soumissions, appliquée en base de données
-- ============================================
alter table public.profiles
  add column if not exists quotes_created_total integer not null default 0;

create or replace function public.check_quote_limit()
returns trigger as $$
declare
  compte int;
  statut text;
begin
  select quotes_created_total into compte from public.profiles where id = new.profile_id;
  select status into statut from public.subscriptions where profile_id = new.profile_id;

  if coalesce(statut, 'inactive') <> 'active' and coalesce(compte, 0) >= 3 then
    raise exception 'LIMITE_ESSAI_ATTEINTE: Un abonnement est requis pour créer de nouvelles soumissions.';
  end if;

  update public.profiles
    set quotes_created_total = coalesce(compte, 0) + 1
    where id = new.profile_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_quote_created on public.quotes;
create trigger on_quote_created
  before insert on public.quotes
  for each row execute procedure public.check_quote_limit();

-- ============================================
-- STORAGE: bucket pour les logos des artisans
-- ============================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Les logos sont publiquement visibles"
  on storage.objects for select using (bucket_id = 'logos');
create policy "Un utilisateur upload son propre logo"
  on storage.objects for insert with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Un utilisateur remplace son propre logo"
  on storage.objects for update using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- TRIGGER : création automatique du profil à l'inscription
-- Contourne proprement la RLS via SECURITY DEFINER, peu importe
-- si l'email est confirmé ou non au moment de l'inscription.
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, business_name, contact_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.pdf_templates (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
