// In-memory stand-in for supabase-js – bildet supabase/duo-setup.sql nach (anonyme Anmeldung, RPCs, RLS-Lesen,
// Echtzeit nur für Mitglieder). Zustand in window.__FAKE, vom Test vorbelegt.
(function () {
  const S = window.__FAKE || (window.__FAKE = {});
  S.db = S.db || { sessions: [], members: [], old: {} };
  S.db.old = S.db.old || {};
  S.presence = S.presence || {};
  S.channels = [];
  S.log = [];
  S.fail = !!S.fail;
  S.n = S.n || 0;
  const copy = o => JSON.parse(JSON.stringify(o));
  const OFF = { message: 'FetchError: Failed to fetch' };
  const uid = () => localStorage.getItem('fake-auth-uid');
  const member = (sid, u = uid()) => S.db.members.find(m => m.session_id === sid && m.user_id === u);

  function emit(row) {
    for (const ch of S.channels) for (const b of ch.binds) {
      const m = /^id=eq\.(.+)$/.exec(b.filter.filter || '');
      if (b.filter.table === 'duo_sessions' && (!m || m[1] === row.id) && member(row.id)) setTimeout(() => b.cb({ new: copy(row) }), 5);
    }
  }

  const RPC = {
    duo_create_session({ p_state }) {
      const s = { id: 'sid-' + (++S.n), code: 'NEW' + String(S.n).padStart(3, '0'), state: copy(p_state), rev: 1 };
      S.db.sessions.push(s);
      S.db.members.push({ session_id: s.id, user_id: uid(), slot: 1, last_seen: Date.now() });
      return { id: s.id, code: s.code, slot: 1, rev: 1 };
    },
    duo_join_session({ p_code, p_slot, p_takeover }) {
      const code = String(p_code || '').trim().toUpperCase();
      let s = S.db.sessions.find(x => x.code === code);
      if (!s && S.db.old[code]) { s = { id: 'sid-' + (++S.n), code, state: copy(S.db.old[code]), rev: 1 }; S.db.sessions.push(s); }
      if (!s) return null;
      const me = member(s.id);
      if (me) { me.last_seen = Date.now(); return { id: s.id, code: s.code, slot: me.slot, state: copy(s.state), rev: s.rev }; }
      const taken = new Set(S.db.members.filter(m => m.session_id === s.id).map(m => m.slot));
      let slot = [1, 2].filter(x => !taken.has(x)).sort((a, b) => (b === p_slot) - (a === p_slot) || b - a)[0];
      if (!slot) {
        if (!p_takeover) return { full: true };
        const stale = S.db.members.filter(m => m.session_id === s.id && m.last_seen < Date.now() - 120000)
          .sort((a, b) => (b.slot === p_slot) - (a.slot === p_slot) || a.last_seen - b.last_seen)[0];
        if (!stale) return { full: true };
        slot = stale.slot;
        S.db.members = S.db.members.filter(m => m !== stale);
      }
      S.db.members.push({ session_id: s.id, user_id: uid(), slot, last_seen: Date.now() });
      return { id: s.id, code: s.code, slot, state: copy(s.state), rev: s.rev };
    },
    duo_save_state({ p_session, p_state, p_rev }) {
      if (!member(p_session)) throw { message: 'not_member' };
      const s = S.db.sessions.find(x => x.id === p_session);
      member(p_session).last_seen = Date.now();
      if (s.rev !== p_rev) return { ok: false, rev: s.rev, state: copy(s.state) };
      s.state = copy(p_state); s.rev++;
      emit(s);
      return { ok: true, rev: s.rev };
    },
    duo_touch({ p_session }) { const m = member(p_session); if (m) m.last_seen = Date.now(); return !!m; },
    duo_leave_session({ p_session }) { S.db.members = S.db.members.filter(m => !(m.session_id === p_session && m.user_id === uid())); return null; },
  };

  class Q {
    constructor(t) { this.t = t; this.filters = []; }
    select() { return this; }
    eq(k, v) { this.filters.push([k, v]); return this; }
    exec() {
      S.log.push({ t: this.t, op: 'select', filters: this.filters });
      if (S.fail) return { data: null, error: OFF };
      if (this.t !== 'duo_sessions') return { data: null, error: { message: 'permission denied for table ' + this.t } };
      const rows = S.db.sessions.filter(r => member(r.id) && this.filters.every(([k, v]) => r[k] === v));
      return { data: copy(rows), error: null };
    }
    maybeSingle() { const r = this.exec(); return Promise.resolve(r.error ? r : { data: r.data[0] || null, error: null }); }
    then(res, rej) { return Promise.resolve(this.exec()).then(res, rej); }
  }

  function channel(name) {
    const ch = {
      name, binds: [], presenceCb: null, statusCb: null, tracked: null,
      on(type, filter, cb) { if (type === 'presence') ch.presenceCb = cb; else ch.binds.push({ filter, cb }); return ch; },
      subscribe(cb) {
        ch.statusCb = cb; S.channels.push(ch);
        setTimeout(() => { cb(S.fail ? 'CHANNEL_ERROR' : 'SUBSCRIBED'); if (!S.fail) setTimeout(() => ch.presenceCb && ch.presenceCb(), 20); }, 10);
        return ch;
      },
      track(meta) { ch.tracked = meta; return Promise.resolve('ok'); },
      presenceState() { return copy(S.presence[name] || {}); },
    };
    return ch;
  }

  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: uid() ? { user: { id: uid() } } : null }, error: null }),
        signInAnonymously: async () => {
          if (S.fail) return { data: null, error: OFF };
          localStorage.setItem('fake-auth-uid', 'user-' + Math.random().toString(36).slice(2, 8));
          return { data: { user: { id: uid() } }, error: null };
        },
      },
      rpc: async (name, args) => {
        S.log.push({ rpc: name, args: copy(args) });
        if (S.fail) return { data: null, error: OFF };
        try { return { data: RPC[name](args), error: null }; } catch (e) { return { data: null, error: e }; }
      },
      from: t => new Q(t),
      channel,
      removeChannel: ch => { S.channels = S.channels.filter(c => c !== ch); return Promise.resolve('ok'); },
    }),
  };
  S.emit = emit;
  S.drop = () => S.channels.forEach(c => c.statusCb && c.statusCb('CHANNEL_ERROR'));
  S.reconnect = () => S.channels.forEach(c => c.statusCb && c.statusCb('SUBSCRIBED'));
})();
