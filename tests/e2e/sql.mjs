// duo-setup.sql / duo-lockdown.sql in einem echten Postgres (PGlite) prüfen – mit nachgebauten Supabase-Teilen
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { ROOT, check, failed } from './harness.mjs';

const DIR = ROOT + '/supabase/';
const setup = fs.readFileSync(DIR + 'duo-setup.sql', 'utf8');
const lockdown = fs.readFileSync(DIR + 'duo-lockdown.sql', 'utf8');
const db = new PGlite();

// Supabase nachbauen: Rollen, auth.users, auth.uid() aus den JWT-Claims, Realtime-Publication, alte Tabellen
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create publication supabase_realtime;
  create table public.sessions (id bigserial primary key, code text);
  create table public.players (id bigserial primary key, session_id bigint references public.sessions (id), slot int, team jsonb);
  grant all on public.sessions, public.players to anon, authenticated;
  alter publication supabase_realtime add table public.players;
  insert into public.sessions (code) values ('OLD123');
  insert into public.players (session_id, slot, team) values (1, 1, '{"team1":[{"name":"bulbasaur"}],"rev":"x"}'), (1, 2, '{}');
`);

const U = { A: 'aaaaaaaa-0000-0000-0000-000000000001', B: 'bbbbbbbb-0000-0000-0000-000000000002',
  C: 'cccccccc-0000-0000-0000-000000000003', D: 'dddddddd-0000-0000-0000-000000000004', E: 'eeeeeeee-0000-0000-0000-000000000005' };
await db.exec(`insert into auth.users (id) values ${Object.values(U).map(u => `('${u}')`).join(',')}`);

async function as(user, sql, params) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user || '']);
  await db.exec(user === 'anon' ? 'set role anon' : 'set role authenticated');
  try { return { rows: (await db.query(sql, params)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec('reset role'); }
}
const call = async (user, fn, args) => {
  const r = await as(user, `select public.${fn} as r`, args);
  return r.error ? { error: r.error } : { data: r.rows[0].r };
};

// 1. Setup läuft, auch zweimal
try { await db.exec(setup); await db.exec(setup); check('SQL: Setup läuft (auch zweimal)', true); }
catch (e) { check('SQL: Setup läuft (auch zweimal)', false, e.message); process.exit(1); }

const code = (await db.query(`select public.duo_new_code() as c`)).rows[0].c;
check('SQL: Code hat 6 Zeichen 0–9/A–Z', /^[0-9A-Z]{6}$/.test(code), code);

check('SQL: ohne Anmeldung kein Erstellen', /not_signed_in/.test((await call('', 'duo_create_session($1::jsonb)', ['{}'])).error || ''));
check('SQL: anon darf Funktionen nicht aufrufen', /permission denied/.test((await call('anon', 'duo_create_session($1::jsonb)', ['{}'])).error || ''));
check('SQL: ungültiger Stand abgelehnt', /bad_state/.test((await call(U.A, 'duo_create_session($1::jsonb)', ['[1]'])).error || ''));

const created = (await call(U.A, 'duo_create_session($1::jsonb)', [JSON.stringify({ team1: ['a'] })])).data;
check('SQL: A erstellt Session auf Platz 1', created && created.slot === 1 && created.rev === 1 && /^[0-9A-Z]{6}$/.test(created.code), JSON.stringify(created));

const jb = (await call(U.B, 'duo_join_session($1)', [created.code.toLowerCase()])).data;
check('SQL: B tritt mit Code bei → Platz 2, Stand kommt mit', jb && jb.slot === 2 && jb.state.team1[0] === 'a', JSON.stringify(jb));
const jb2 = (await call(U.B, 'duo_join_session($1)', [created.code])).data;
check('SQL: erneuter Beitritt von B → gleicher Platz', jb2 && jb2.slot === 2);

const jc = (await call(U.C, 'duo_join_session($1)', [created.code])).data;
check('SQL: C – beide aktiv → voll', jc && jc.full === true, JSON.stringify(jc));
await db.query(`update duo_members set last_seen = now() - interval '5 minutes' where user_id = $1`, [U.B]);
const jcNo = (await call(U.C, 'duo_join_session($1, $2, $3)', [created.code, null, false])).data;
check('SQL: ohne Übernahme-Erlaubnis bleibt es voll', jcNo && jcNo.full === true);
const jc2 = (await call(U.C, 'duo_join_session($1)', [created.code])).data;
check('SQL: C übernimmt Platz 2 von B (seit 5 min still)', jc2 && jc2.slot === 2, JSON.stringify(jc2));

// Lesen nur für Mitglieder
const rc = await as(U.C, 'select id, code from duo_sessions');
const rb = await as(U.B, 'select id from duo_sessions');
const rd = await as(U.D, 'select id from duo_sessions');
const ra = await as('anon', 'select id from duo_sessions');
check('SQL: Mitglied sieht seine Session', rc.rows?.length === 1);
check('SQL: Nicht-Mitglieder sehen nichts', rb.rows?.length === 0 && rd.rows?.length === 0, JSON.stringify([rb, rd]));
check('SQL: anon hat keinen Lesezugriff', /permission denied/.test(ra.error || ''));
check('SQL: direktes Ändern verboten', /permission denied/.test((await as(U.A, `update duo_sessions set state = '{}'`)).error || ''));
check('SQL: Mitgliederliste nicht direkt lesbar', /permission denied/.test((await as(U.A, 'select * from duo_members')).error || ''));

// Speichern mit Versionsprüfung
const s1 = (await call(U.A, 'duo_save_state($1, $2::jsonb, $3)', [created.id, '{"team1":["x"]}', 1])).data;
check('SQL: A speichert mit aktueller Version → rev 2', s1 && s1.ok === true && s1.rev === 2, JSON.stringify(s1));
const s2 = (await call(U.C, 'duo_save_state($1, $2::jsonb, $3)', [created.id, '{"team1":["y"]}', 1])).data;
check('SQL: C mit veralteter Version → Konflikt + aktueller Stand', s2 && s2.ok === false && s2.rev === 2 && s2.state.team1[0] === 'x', JSON.stringify(s2));
check('SQL: B (kein Mitglied mehr) darf nicht speichern', /not_member/.test((await call(U.B, 'duo_save_state($1, $2::jsonb, $3)', [created.id, '{}', 2])).error || ''));
check('SQL: Lebenszeichen – Mitglied true, Nicht-Mitglied false',
  (await call(U.A, 'duo_touch($1)', [created.id])).data === true && (await call(U.B, 'duo_touch($1)', [created.id])).data === false);

// Durchprobieren von Codes wird gebremst
for (let i = 0; i < 10; i++) await call(U.D, 'duo_join_session($1)', ['ZZZZZ' + i]);
check('SQL: nach 10 Fehlversuchen gesperrt', /too_many_attempts/.test((await call(U.D, 'duo_join_session($1)', [created.code])).error || ''));

// Alte Session wird beim Beitritt mit ihrem Code übernommen
const old = (await call(U.E, 'duo_join_session($1, $2, $3)', ['old123', 2, false])).data;
check('SQL: alte Session wird übernommen (Stand + Wunschplatz)', old && old.slot === 2 && old.state.team1[0].name === 'bulbasaur', JSON.stringify(old));
const old2 = (await call(U.A, 'duo_join_session($1, $2, $3)', ['OLD123', 1, false])).data;
check('SQL: zweiter Spieler landet in derselben übernommenen Session', old2 && old2.id === old.id && old2.slot === 1);

// Verlassen
await call(U.E, 'duo_leave_session($1)', [old.id]);
check('SQL: nach Verlassen nichts mehr lesbar', (await as(U.E, 'select id from duo_sessions')).rows.length === 0);

// Sperren der alten Tabellen
try { await db.exec(lockdown); await db.exec(lockdown); check('SQL: Lockdown läuft (auch zweimal)', true); }
catch (e) { check('SQL: Lockdown läuft', false, e.message); }
check('SQL: alte Tabellen für anon gesperrt', /permission denied/.test((await as('anon', 'select * from sessions')).error || ''));
check('SQL: alte Tabellen für angemeldete gesperrt', /permission denied/.test((await as(U.A, 'select * from players')).error || ''));
await db.exec(`insert into public.sessions (code) values ('OLD999'); insert into public.players (session_id, slot, team) values (2, 1, '{"team1":[]}')`);
const late = (await call(U.B, 'duo_join_session($1, $2, $3)', ['OLD999', 1, false])).data;
check('SQL: Übernahme alter Sessions klappt auch nach dem Sperren', late && late.slot === 1, JSON.stringify(late));
const pub = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows.map(r => r.tablename);
check('SQL: Realtime nur noch für duo_sessions', pub.join() === 'duo_sessions', pub.join());

console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
