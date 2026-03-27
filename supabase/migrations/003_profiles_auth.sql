-- ─── PROFILES TABLE ───
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome_completo text not null,
  username text not null,
  is_admin boolean default false,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── RLS ───
alter table public.profiles enable row level security;

create policy "Users can read any profile"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_meta jsonb;
  v_nome text;
  v_username text;
  v_email text;
  v_is_admin boolean;
begin
  raw_meta := new.raw_user_meta_data;
  v_nome := coalesce(raw_meta->>'nome_completo', '');
  v_username := coalesce(raw_meta->>'username', '');
  v_email := new.email;

  -- Admin detection by email domain or specific emails
  v_is_admin := v_email in (
    'admin@allos.org.br',
    'coordenacao@allos.org.br',
    'diogo@allos.org.br',
    'flavia@allos.org.br',
    'alice@allos.org.br'
  ) or v_email like '%@admin.allos.org.br';

  insert into public.profiles (id, email, nome_completo, username, is_admin)
  values (new.id, v_email, v_nome, v_username, v_is_admin);

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid conflicts
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
