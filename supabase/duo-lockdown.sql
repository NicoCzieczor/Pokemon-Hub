-- ════════════════════════════════════════════════════════════════════════════
-- PokéHub Duo – alte Tabellen sperren (Prüfbericht F01, letzter Schritt)
--
-- Erst ausführen, wenn beide Spieler die neue App-Version geöffnet haben und Duo wieder verbunden ist.
-- Danach kann die alte App-Version Duo nicht mehr benutzen. Die Daten bleiben erhalten (nur gesperrt);
-- duo_join_session kann alte Sessions weiterhin über ihren Code übernehmen.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.sessions, public.players from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players') then
    alter publication supabase_realtime drop table public.players;
  end if;
end;
$$;

-- Später (nach ein paar Wochen) dürfen die alten Tabellen ganz weg:
--   drop table public.players;
--   drop table public.sessions;
