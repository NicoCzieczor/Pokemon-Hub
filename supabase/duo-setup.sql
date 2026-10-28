-- ════════════════════════════════════════════════════════════════════════════
-- PokéHub Duo – geschützte Sessions (Prüfbericht F01, F05, F14)
--
-- Einmal im Supabase-Dashboard unter „SQL Editor“ ausführen. Vorher unter Authentication die anonyme
-- Anmeldung einschalten. Die bisherigen Tabellen sessions/players bleiben unverändert – die laufende App
-- merkt davon nichts. Kann gefahrlos mehrmals ausgeführt werden.
--
--   duo_sessions   Session: Code, gemeinsamer Spielstand, Versionsnummer (rev)
--   duo_members    wer zu welcher Session gehört (anonymer Supabase-Nutzer je Gerät, Platz 1 oder 2)
--
-- Lesen dürfen nur Mitglieder (Row Level Security). Geschrieben wird ausschließlich über die Funktionen
-- unten; die prüfen Mitgliedschaft, vergeben Plätze atomar und speichern nur, wenn die Versionsnummer passt
-- (sonst bekommt der Client den aktuellen Stand zum Zusammenführen zurück).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.duo_sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  state       jsonb not null default '{}'::jsonb,
  rev         bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.duo_members (
  session_id  uuid not null references public.duo_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  slot        smallint not null check (slot in (1, 2)),
  last_seen   timestamptz not null default now(),
  primary key (session_id, user_id),
  unique (session_id, slot)
);

-- Fehlgeschlagene Beitrittsversuche (gegen Durchprobieren von Codes)
create table if not exists public.duo_join_attempts (
  user_id  uuid not null,
  at       timestamptz not null default now()
);
create index if not exists duo_join_attempts_user_at on public.duo_join_attempts (user_id, at);

alter table public.duo_sessions      enable row level security;
alter table public.duo_members       enable row level security;
alter table public.duo_join_attempts enable row level security;

-- Direkter Zugriff: nur Lesen der eigenen Sessions. Alles andere läuft über die Funktionen.
revoke all on public.duo_sessions, public.duo_members, public.duo_join_attempts from anon, authenticated;
grant select on public.duo_sessions to authenticated;


-- ── Hilfsfunktionen ─────────────────────────────────────────────────────────

-- Gehört der angemeldete Nutzer zur Session? (security definer: duo_members ist selbst nicht lesbar)
create or replace function public.duo_is_member(p_session uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from duo_members where session_id = p_session and user_id = auth.uid());
$$;

-- 6 Zeichen aus 0–9/A–Z, Zufall aus gen_random_uuid()
create or replace function public.duo_new_code()
returns text
language sql volatile set search_path = public
as $$
  select string_agg(substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (get_byte(r.b, i) % 36) + 1, 1), '' order by i)
  from (select decode(replace(gen_random_uuid()::text, '-', ''), 'hex') as b) r, generate_series(0, 5) as i;
$$;

drop policy if exists "Mitglieder lesen ihre Session" on public.duo_sessions;
create policy "Mitglieder lesen ihre Session" on public.duo_sessions
  for select to authenticated
  using (public.duo_is_member(id));


-- ── Session erstellen: Code wird auf dem Server vergeben, Ersteller bekommt Platz 1 ──
create or replace function public.duo_create_session(p_state jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_code text;
  sid uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 300000 then
    raise exception 'bad_state';
  end if;
  -- Aufräumen: Sessions, die ein halbes Jahr nicht benutzt wurden
  delete from duo_sessions where updated_at < now() - interval '180 days';
  loop
    new_code := duo_new_code();
    begin
      insert into duo_sessions (code, state, rev) values (new_code, p_state, 1) returning id into sid;
      exit;
    exception when unique_violation then
      -- Code schon vergeben → neuer Versuch
    end;
  end loop;
  insert into duo_members (session_id, user_id, slot) values (sid, uid, 1);
  return jsonb_build_object('id', sid, 'code', new_code, 'slot', 1, 'rev', 1);
end;
$$;


-- ── Beitreten mit Code ──────────────────────────────────────────────────────
-- Schon Mitglied → eigener Platz. Sonst ein freier Platz (Wunschplatz p_slot zuerst). Sind beide belegt und
-- p_takeover = true, darf ein Platz übernommen werden, dessen Gerät seit 2 Minuten kein Lebenszeichen gab
-- (z. B. nach Browserwechsel). Ergebnis: null = Code unbekannt, {"full": true} = voll, sonst Session-Daten.
-- Sessions aus den alten Tabellen (sessions/players) werden beim ersten Beitritt mit ihrem Code übernommen.
create or replace function public.duo_join_session(p_code text, p_slot int default null, p_takeover boolean default true)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wanted text := upper(trim(coalesce(p_code, '')));
  s duo_sessions%rowtype;
  my_slot int;
  free_slot int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  -- Höchstens 10 Fehlversuche pro Stunde und Gerät
  if (select count(*) from duo_join_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select * into s from duo_sessions where code = wanted for update;
  if not found then
    -- Einmalige Übernahme aus den alten Tabellen, solange es sie gibt
    begin
      insert into duo_sessions (code, state, rev)
        select upper(o.code), coalesce(p.team::jsonb, '{}'::jsonb), 1
        from sessions o join players p on p.session_id = o.id and p.slot = 1
        where upper(o.code) = wanted
        limit 1
      on conflict (code) do nothing;
    exception when undefined_table then
      null;
    end;
    select * into s from duo_sessions where code = wanted for update;
  end if;
  if not found then
    insert into duo_join_attempts (user_id) values (uid);
    delete from duo_join_attempts where at < now() - interval '1 day';
    return null;
  end if;

  select slot into my_slot from duo_members where session_id = s.id and user_id = uid;
  if my_slot is null then
    select x.slot into free_slot
      from (values (1), (2)) as x(slot)
      where not exists (select 1 from duo_members m where m.session_id = s.id and m.slot = x.slot)
      order by (x.slot = p_slot) desc nulls last, x.slot desc
      limit 1;
    if free_slot is null then
      if not p_takeover then return jsonb_build_object('full', true); end if;
      select m.slot into free_slot
        from duo_members m
        where m.session_id = s.id and m.last_seen < now() - interval '2 minutes'
        order by (m.slot = p_slot) desc nulls last, m.last_seen
        limit 1;
      if free_slot is null then return jsonb_build_object('full', true); end if;
      delete from duo_members where session_id = s.id and slot = free_slot;
    end if;
    insert into duo_members (session_id, user_id, slot) values (s.id, uid, free_slot);
    my_slot := free_slot;
  else
    update duo_members set last_seen = now() where session_id = s.id and user_id = uid;
  end if;

  return jsonb_build_object('id', s.id, 'code', s.code, 'slot', my_slot, 'state', s.state, 'rev', s.rev);
end;
$$;


-- ── Spielstand speichern – nur wenn p_rev noch aktuell ist ──────────────────
-- {"ok": true, "rev": neu} oder {"ok": false, "rev": aktuell, "state": aktueller Stand} zum Zusammenführen
create or replace function public.duo_save_state(p_session uuid, p_state jsonb, p_rev bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_rev bigint;
  cur duo_sessions%rowtype;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from duo_members where session_id = p_session and user_id = uid) then
    raise exception 'not_member';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 300000 then
    raise exception 'bad_state';
  end if;
  update duo_sessions set state = p_state, rev = rev + 1, updated_at = now()
    where id = p_session and rev = p_rev
    returning rev into new_rev;
  update duo_members set last_seen = now() where session_id = p_session and user_id = uid;
  if new_rev is not null then
    return jsonb_build_object('ok', true, 'rev', new_rev);
  end if;
  select * into cur from duo_sessions where id = p_session;
  return jsonb_build_object('ok', false, 'rev', cur.rev, 'state', cur.state);
end;
$$;


-- ── Lebenszeichen (alle ~45 s, solange die App offen ist); false = nicht mehr Mitglied ──
create or replace function public.duo_touch(p_session uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update duo_members set last_seen = now() where session_id = p_session and user_id = auth.uid();
  return found;
end;
$$;


-- ── Session verlassen (Spielstand bleibt, Beitritt mit Code bleibt möglich) ──
create or replace function public.duo_leave_session(p_session uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from duo_members where session_id = p_session and user_id = auth.uid();
$$;


-- ── Wer darf welche Funktion aufrufen ───────────────────────────────────────
revoke all on function public.duo_is_member(uuid)                      from public, anon;
revoke all on function public.duo_new_code()                           from public, anon, authenticated;
revoke all on function public.duo_create_session(jsonb)                from public, anon;
revoke all on function public.duo_join_session(text, int, boolean)     from public, anon;
revoke all on function public.duo_save_state(uuid, jsonb, bigint)      from public, anon;
revoke all on function public.duo_touch(uuid)                          from public, anon;
revoke all on function public.duo_leave_session(uuid)                  from public, anon;
grant execute on function public.duo_is_member(uuid)                   to authenticated;
grant execute on function public.duo_create_session(jsonb)             to authenticated;
grant execute on function public.duo_join_session(text, int, boolean)  to authenticated;
grant execute on function public.duo_save_state(uuid, jsonb, bigint)   to authenticated;
grant execute on function public.duo_touch(uuid)                       to authenticated;
grant execute on function public.duo_leave_session(uuid)               to authenticated;


-- ── Echtzeit-Updates für den gemeinsamen Spielstand ─────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'duo_sessions') then
    alter publication supabase_realtime add table public.duo_sessions;
  end if;
end;
$$;
