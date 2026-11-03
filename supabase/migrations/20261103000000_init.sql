-- Trường Học Online — initial schema (segment B1).
-- Players sign in anonymously (Supabase Anonymous sign-ins) and only ever touch their own rows.
-- Staff (admin / moderator / teacher) are real accounts listed in public.staff and must use MFA (aal2).
-- Every table has RLS on; Supabase's default "grant all to anon, authenticated" is revoked and replaced by
-- explicit column grants, so a forgotten policy can never open a table.
-- Never store real names, phone numbers, e-mails or addresses of players here.

-- ============================================================ helpers

-- Staff check: listed in public.staff with one of the roles AND signed in with MFA.
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'teacher')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create function public.is_staff(variadic roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role = any (roles)
  ) and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- Audit trail of everything staff do. Written only by security definer functions / triggers.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  detail jsonb,
  at timestamptz not null default now()
);

create function public.audit(p_action text, p_target text, p_detail jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_log (actor, action, target, detail) values (auth.uid(), p_action, p_target, p_detail);
$$;

-- ============================================================ profiles + saves

-- Public-facing summary, derived from the save by a trigger (players never write it directly).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Học sinh',
  school text not null default '',
  school_key text not null default '',          -- lower(trim(school)) for grouping
  grade int not null default 6 check (grade between 6 and 9),
  section int not null default 1 check (section between 1 and 4),
  score int not null default 0,
  conduct int not null default 80,
  graduated boolean not null default false,
  hidden boolean not null default false,        -- staff can hide a bad name from the leaderboard
  updated_at timestamptz not null default now()
);

-- Whole game save (the same JSON as localStorage), one row per player.
create table public.saves (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 200000),
  v int not null check (v between 1 and 100),
  device text check (char_length(device) <= 60),
  updated_at timestamptz not null default now()
);

-- Words that hide a display name from the leaderboard (staff can extend the list).
create table public.banned_words (word text primary key);
insert into public.banned_words (word) values
  ('đm'), ('đmm'), ('dmm'), ('vcl'), ('vl'), ('đéo'), ('địt'), ('cặc'), ('lồn'), ('đĩ'), ('cmm'), ('clgt');

create function public.saves_to_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  d jsonb := new.data;
  nm text := left(coalesce(nullif(trim(d ->> 'name'), ''), 'Học sinh'), 24);
  sc text := left(coalesce(trim(d ->> 'school'), ''), 60);
  g int := least(9, greatest(6, coalesce((d ->> 'grade')::int, 6)));
  sec int := least(4, greatest(1, coalesce((d ->> 'section')::int, 1)));
  pts int := 0;
  bad boolean;
begin
  new.updated_at := now();
  -- score = finished grades * 60 + points in the current grade (12 subjects x 5)
  select coalesce(sum(least(5, greatest(0, (value)::int))), 0) into pts
    from jsonb_each_text(case when jsonb_typeof(d -> 'progress') = 'object' then d -> 'progress' else '{}'::jsonb end)
    where value ~ '^-?[0-9]+$';
  select exists (select 1 from public.banned_words w where position(w.word in lower(nm)) > 0) into bad;
  insert into public.profiles as p (user_id, display_name, school, school_key, grade, section, score, conduct, graduated, hidden, updated_at)
  values (new.user_id, nm, sc, lower(sc), g, sec,
          case when coalesce((d ->> 'graduated')::boolean, false) then 4 * 60 else (g - 6) * 60 + least(pts, 60) end,
          least(100, greatest(0, coalesce((d -> 'stats' ->> 'conduct')::int, 80))),
          coalesce((d ->> 'graduated')::boolean, false), bad, now())
  on conflict (user_id) do update set
    display_name = excluded.display_name, school = excluded.school, school_key = excluded.school_key,
    grade = excluded.grade, section = excluded.section, score = excluded.score, conduct = excluded.conduct,
    graduated = excluded.graduated, hidden = p.hidden or excluded.hidden, updated_at = now();
  return new;
end;
$$;

create trigger saves_profile before insert or update on public.saves
  for each row execute function public.saves_to_profile();

-- ============================================================ transfer code (move progress to another device)
-- iPhone: the installed app does not share storage with Safari, so a player moves progress with a short code.
-- Claiming MOVES the account data (save, coco, profile) to the claiming device; the old device starts fresh.

create table public.transfer_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);
create table public.transfer_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);

create function public.create_transfer_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I/L
  raw bytea;
  c text := '';
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.saves where user_id = auth.uid()) then raise exception 'no save to transfer'; end if;
  delete from public.transfer_codes where user_id = auth.uid() or expires_at < now();
  loop
    raw := uuid_send(gen_random_uuid()); -- 122 random bits from a CSPRNG
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, 1 + (get_byte(raw, i) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.transfer_codes where code = c);
  end loop;
  insert into public.transfer_codes (code, user_id, expires_at) values (c, auth.uid(), now() + interval '15 minutes');
  return c;
end;
$$;

create function public.claim_transfer_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  src uuid;
  sv record;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.transfer_attempts where user_id = me and at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts';
  end if;
  insert into public.transfer_attempts (user_id) values (me);
  delete from public.transfer_codes where expires_at < now();
  select user_id into src from public.transfer_codes where code = upper(trim(p_code));
  if src is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if src = me then return jsonb_build_object('ok', false, 'reason', 'same-device'); end if;
  delete from public.transfer_codes where user_id = src;

  -- the claiming device's own (usually empty) data is replaced
  delete from public.saves where user_id = me;
  delete from public.coco_ledger where user_id = me;
  delete from public.wallets where user_id = me;
  delete from public.profiles where user_id = me;

  update public.profiles set user_id = me where user_id = src;
  update public.wallets set user_id = me where user_id = src;
  update public.coco_ledger set user_id = me where user_id = src;
  update public.saves set user_id = me, updated_at = now() where user_id = src;
  update public.feedback set user_id = me where user_id = src;
  insert into public.coco_ledger (user_id, delta, reason, balance_after, source)
    select me, 0, 'chuyển máy', w.balance, 'transfer' from public.wallets w where w.user_id = me;

  select data, v, updated_at into sv from public.saves where user_id = me;
  return jsonb_build_object('ok', true, 'save', sv.data, 'v', sv.v, 'updated_at', sv.updated_at);
end;
$$;

-- ============================================================ feedback (bug reports, wrong questions, ideas)
-- Players: insert only (cannot read anything back). Staff review: new → approved (needs fixing) → fixed / rejected.

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('question', 'stuck', 'bug', 'idea')),
  text text not null default '' check (char_length(text) <= 500),
  version text check (char_length(version) <= 20),
  created_at timestamptz,                       -- client time (may be old: offline outbox)
  received_at timestamptz not null default now(),
  school text check (char_length(school) <= 60),
  grade int check (grade between 6 and 9),
  section int check (section between 1 and 4),
  phase text check (char_length(phase) <= 20),
  zone text check (char_length(zone) <= 60),
  x numeric, z numeric,
  question jsonb check (question is null or octet_length(question::text) < 4000),
  status text not null default 'new' check (status in ('new', 'approved', 'fixed', 'rejected', 'duplicate')),
  admin_note text check (char_length(admin_note) <= 1000),
  reviewed_by uuid,
  reviewed_at timestamptz
);
create index feedback_status_idx on public.feedback (status, received_at desc);

create function public.feedback_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and received_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many reports, try later';
  end if;
  new.user_id := auth.uid();
  new.status := 'new';
  new.admin_note := null; new.reviewed_by := null; new.reviewed_at := null;
  new.received_at := now();
  return new;
end;
$$;
create trigger feedback_insert before insert on public.feedback
  for each row execute function public.feedback_before_insert();

create function public.feedback_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
    perform public.audit('feedback.review', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status, 'note', new.admin_note));
  end if;
  return new;
end;
$$;
create trigger feedback_update before update on public.feedback
  for each row execute function public.feedback_before_update();

-- ============================================================ shop + coco wallet
-- Coco is only EARNED by studying (capped), only SPENT on cosmetic / fun items. No points, conduct or
-- promotion for sale, no gacha. Prices live here; the game only says "buy item X".

create table public.shop_items (
  id text primary key check (id ~ '^[a-z0-9-]+:[a-z0-9-]+$'),   -- <pack>:<id>, same as the game
  type text not null check (type in ('food', 'uniform', 'accessory', 'toy')),
  name text not null check (char_length(name) <= 60),
  price int not null check (price between 0 and 1000),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create function public.shop_items_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  perform public.audit('shop.update', new.id,
    jsonb_build_object('price', jsonb_build_array(old.price, new.price), 'enabled', jsonb_build_array(old.enabled, new.enabled)));
  return new;
end;
$$;
create trigger shop_items_update before update on public.shop_items
  for each row execute function public.shop_items_audit();

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance int not null default 20 check (balance >= 0),
  imported boolean not null default false,      -- local (pre-server) balance carried over once
  updated_at timestamptz not null default now()
);

create table public.coco_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  op_id uuid unique,                            -- client id: retrying the same op never applies it twice
  delta int not null,
  reason text not null check (char_length(reason) <= 80),
  item_id text,
  balance_after int not null,
  source text not null default 'game' check (source in ('game', 'admin', 'transfer', 'import')),
  created_at timestamptz not null default now()
);
create index coco_ledger_user_idx on public.coco_ledger (user_id, created_at desc);

-- Limits (also documented in .claude/rules/mods-and-economy.md)
--   earn: ≤ 40 coco per rolling 6 hours (one school session is 6 h), ≤ 10 per op
--   lose: ≤ 10 per op; spend on an item must pay the server price; import of the local balance: once, ≤ 200
create function public.coco_apply(ops jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  bal int;
  op jsonb;
  oid uuid;
  kind text;
  n int;
  room int;
  price int;
  results jsonb := '[]'::jsonb;
  applied int;
  ok boolean;
  why text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(ops) <> 'array' or jsonb_array_length(ops) > 100 then raise exception 'ops must be an array of ≤100'; end if;

  insert into public.wallets (user_id) values (me) on conflict do nothing;
  if not exists (select 1 from public.coco_ledger where user_id = me) then
    insert into public.coco_ledger (user_id, delta, reason, balance_after, source) values (me, 20, 'khởi đầu', 20, 'game');
  end if;
  select balance into bal from public.wallets where user_id = me for update;

  for op in select * from jsonb_array_elements(ops) loop
    oid := (op ->> 'op_id')::uuid;
    kind := op ->> 'kind';
    n := greatest(0, coalesce((op ->> 'n')::int, 0));
    applied := 0; ok := true; why := null;

    if oid is null then
      ok := false; why := 'missing op_id';
    elsif exists (select 1 from public.coco_ledger where op_id = oid) then
      ok := true; why := 'duplicate';
    elsif kind = 'earn' then
      select 40 - coalesce(sum(delta), 0) into room from public.coco_ledger
        where user_id = me and source = 'game' and delta > 0 and reason <> 'khởi đầu' and created_at > now() - interval '6 hours';
      applied := least(n, 10, greatest(room, 0));
      if applied = 0 then ok := false; why := 'cap'; end if;
    elsif kind = 'spend' then
      if op ? 'item_id' then
        select s.price into price from public.shop_items s where s.id = op ->> 'item_id' and s.enabled;
        if price is null then ok := false; why := 'item unavailable';
        elsif price <> n then ok := false; why := 'price changed';
        end if;
      elsif n > 20 then ok := false; why := 'too large';
      end if;
      if ok and bal < n then ok := false; why := 'insufficient'; end if;
      if ok then applied := -n; end if;
    elsif kind = 'lose' then
      applied := -least(n, 10, bal);
    elsif kind = 'import' then
      if (select imported from public.wallets where user_id = me) then ok := false; why := 'already imported';
      else
        applied := least(n, 200) - bal;     -- set the balance to the local one (capped)
        update public.wallets set imported = true where user_id = me;
      end if;
    else
      ok := false; why := 'unknown kind';
    end if;

    if ok and why is null and (applied <> 0 or kind in ('spend', 'import')) then
      bal := bal + applied;
      insert into public.coco_ledger (user_id, op_id, delta, reason, item_id, balance_after, source)
        values (me, oid, applied, left(coalesce(op ->> 'reason', kind), 80), op ->> 'item_id', bal,
                case when kind = 'import' then 'import' else 'game' end);
    end if;
    results := results || jsonb_build_object('op_id', oid, 'ok', ok, 'applied', applied, 'why', why);
  end loop;

  update public.wallets set balance = bal, updated_at = now() where user_id = me;
  return jsonb_build_object('balance', bal, 'results', results);
end;
$$;

-- Manual corrections need two different admins: one requests, another approves.
create table public.coco_adjustments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta between -1000 and 1000 and delta <> 0),
  reason text not null check (char_length(reason) between 5 and 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz
);

create function public.request_adjustment(p_user uuid, p_delta int, p_reason text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare new_id bigint;
begin
  if not public.is_staff('admin') then raise exception 'admin only'; end if;
  insert into public.coco_adjustments (user_id, delta, reason, requested_by)
    values (p_user, p_delta, p_reason, auth.uid()) returning id into new_id;
  perform public.audit('coco.adjust.request', p_user::text, jsonb_build_object('id', new_id, 'delta', p_delta, 'reason', p_reason));
  return new_id;
end;
$$;

create function public.decide_adjustment(p_id bigint, p_approve boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare a record; bal int;
begin
  if not public.is_staff('admin') then raise exception 'admin only'; end if;
  select * into a from public.coco_adjustments where id = p_id for update;
  if a is null or a.status <> 'pending' then raise exception 'not pending'; end if;
  if a.requested_by = auth.uid() then raise exception 'a second admin must decide'; end if;
  update public.coco_adjustments set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now() where id = p_id;
  if p_approve then
    insert into public.wallets (user_id) values (a.user_id) on conflict do nothing;
    update public.wallets set balance = greatest(0, balance + a.delta), updated_at = now()
      where user_id = a.user_id returning balance into bal;
    insert into public.coco_ledger (user_id, delta, reason, balance_after, source)
      values (a.user_id, a.delta, left('điều chỉnh: ' || a.reason, 80), bal, 'admin');
  end if;
  perform public.audit('coco.adjust.' || case when p_approve then 'approve' else 'reject' end, a.user_id::text,
    jsonb_build_object('id', p_id));
end;
$$;

-- ============================================================ leaderboard

create function public.leaderboard(p_school text default null, p_limit int default 20)
returns table (rank bigint, display_name text, school text, grade int, section int, score int, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  select * from (
    select rank() over (order by p.score desc, p.updated_at asc) as rank,
           p.display_name, p.school, p.grade, p.section, p.score, p.user_id = auth.uid() as is_me
    from public.profiles p
    where not p.hidden and (p_school is null or p.school_key = lower(trim(p_school)))
  ) r
  where r.rank <= least(greatest(p_limit, 1), 100) or r.is_me
  order by r.rank;
$$;

-- ============================================================ mod reviews (packs arrive as GitHub PRs)

create table public.mod_reviews (
  id bigint generated always as identity primary key,
  pack_id text not null check (pack_id ~ '^[a-z0-9-]+$'),
  version int not null default 1,
  source_url text check (source_url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text check (char_length(notes) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.mod_reviews_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
  perform public.audit('mod.' || lower(tg_op), new.pack_id, jsonb_build_object('status', new.status, 'version', new.version));
  return new;
end;
$$;
create trigger mod_reviews_audit before insert or update on public.mod_reviews
  for each row execute function public.mod_reviews_audit();

-- ============================================================ privileges + RLS

alter table public.staff enable row level security;
alter table public.audit_log enable row level security;
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.banned_words enable row level security;
alter table public.transfer_codes enable row level security;
alter table public.transfer_attempts enable row level security;
alter table public.feedback enable row level security;
alter table public.shop_items enable row level security;
alter table public.wallets enable row level security;
alter table public.coco_ledger enable row level security;
alter table public.coco_adjustments enable row level security;
alter table public.mod_reviews enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- players (anonymous sign-in = role authenticated)
grant select, insert, update, delete on public.saves to authenticated;
create policy saves_own on public.saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.profiles to authenticated;
create policy profiles_own on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_staff('admin', 'moderator'));
grant update (hidden) on public.profiles to authenticated;
create policy profiles_staff_hide on public.profiles for update to authenticated
  using (public.is_staff('admin', 'moderator')) with check (public.is_staff('admin', 'moderator'));

grant insert (kind, text, version, created_at, school, grade, section, phase, zone, x, z, question)
  on public.feedback to authenticated;
create policy feedback_insert on public.feedback for insert to authenticated
  with check (auth.uid() is not null);
grant select on public.feedback to authenticated;
create policy feedback_staff_read on public.feedback for select to authenticated
  using (public.is_staff('admin', 'moderator') or (kind = 'question' and public.is_staff('teacher')));
grant update (status, admin_note) on public.feedback to authenticated;
create policy feedback_staff_update on public.feedback for update to authenticated
  using (public.is_staff('admin', 'moderator') or (kind = 'question' and public.is_staff('teacher')))
  with check (public.is_staff('admin', 'moderator') or (kind = 'question' and public.is_staff('teacher')));

grant select on public.shop_items to anon, authenticated;
create policy shop_read on public.shop_items for select to anon, authenticated using (true);
grant update (price, enabled) on public.shop_items to authenticated;
create policy shop_admin_update on public.shop_items for update to authenticated
  using (public.is_staff('admin')) with check (public.is_staff('admin'));

grant select on public.wallets, public.coco_ledger to authenticated;
create policy wallets_read on public.wallets for select to authenticated
  using (user_id = auth.uid() or public.is_staff('admin'));
create policy ledger_read on public.coco_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_staff('admin'));

grant select on public.coco_adjustments to authenticated;
create policy adjustments_read on public.coco_adjustments for select to authenticated using (public.is_staff('admin'));

grant select on public.staff to authenticated;
create policy staff_read on public.staff for select to authenticated
  using (user_id = auth.uid() or public.is_staff('admin'));

grant select on public.audit_log to authenticated;
create policy audit_read on public.audit_log for select to authenticated using (public.is_staff('admin'));

grant select, insert on public.banned_words to authenticated;
grant delete on public.banned_words to authenticated;
create policy banned_words_staff on public.banned_words for all to authenticated
  using (public.is_staff('admin', 'moderator')) with check (public.is_staff('admin', 'moderator'));

grant select, insert, update (status, notes) on public.mod_reviews to authenticated;
create policy mod_reviews_staff on public.mod_reviews for all to authenticated
  using (public.is_staff('admin', 'moderator')) with check (public.is_staff('admin', 'moderator'));

-- transfer_codes / transfer_attempts: no grants at all (functions only)

grant execute on function public.is_staff(text[]) to authenticated;
grant execute on function public.create_transfer_code() to authenticated;
grant execute on function public.claim_transfer_code(text) to authenticated;
grant execute on function public.coco_apply(jsonb) to authenticated;
grant execute on function public.request_adjustment(uuid, int, text) to authenticated;
grant execute on function public.decide_adjustment(bigint, boolean) to authenticated;
grant execute on function public.leaderboard(text, int) to anon, authenticated;
