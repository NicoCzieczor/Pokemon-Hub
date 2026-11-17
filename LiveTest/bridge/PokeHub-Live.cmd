@echo off
rem PokeHub Live-Bruecke: liest den Arbeitsspeicher des laufenden Emulators (nur lesen) und gibt ihn an die
rem Live-Test-Seite des Pokemon Hub weiter. Doppelklick genuegt; das Fenster offen lassen, solange du spielst.
rem Aufruf mit Zusaetzen:  PokeHub-Live.cmd [-Origin https://meine-seite] [-Process name] [-ProcessId 1234] [-Port 47815]
title PokeHub Live-Bruecke
set "PHL_ARGS=%*"
set "PHL_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = [IO.File]::ReadAllText($env:PHL_SELF, [Text.Encoding]::UTF8); Invoke-Expression $s.Substring($s.IndexOf('#PS-' + 'START#'))"
if errorlevel 1 pause
exit /b
#PS-START#
# ── Ab hier PowerShell ─────────────────────────────────────────────────────────────────────────────────────
# Kleiner Webserver nur auf diesem Rechner (127.0.0.1). Er kann genau drei Dinge:
#   /status  – läuft ein Emulator?
#   /scan    – wo im Speicher des Emulators stehen diese Bytefolgen? (die Seite sucht damit dein Team;
#              mit lo/hi nur in einem Adressbereich – für das schnelle Nachsehen zwischendurch)
#   /read    – Bytes ab einer Adresse lesen
# Gelesen wird nur aus dem Emulator-Prozess, geschrieben wird nie. Antworten bekommen nur der Pokémon Hub
# (diese Adressen unten) und Seiten, die auf diesem Rechner selbst laufen.
$ErrorActionPreference = 'Stop'
$port = 47815
$origins = @('https://nicoczieczor.github.io')
$names = @('azahar', 'citra-qt', 'citra', 'lime3ds', 'melonDS', 'DeSmuME', 'DeSmuME_0.9.13_x64', 'EmuHawk', 'mGBA', 'retroarch')
$onlyPid = 0
$a = @(); if ($env:PHL_ARGS) { $a = $env:PHL_ARGS -split '\s+' | Where-Object { $_ } }
for ($i = 0; $i -lt $a.Count; $i++) {
  switch -Regex ($a[$i]) {
    '^-Origin$' { $origins += $a[++$i].TrimEnd('/') }
    '^-Process$' { $names += $a[++$i] }
    '^-ProcessId$' { $onlyPid = [int]$a[++$i] }
    '^-Port$' { $port = [int]$a[++$i] }
  }
}

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace PokeHubLive {
  public static class Bridge {
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);
    [DllImport("kernel32.dll")] static extern IntPtr VirtualQueryEx(IntPtr h, IntPtr addr, out MBI mbi, IntPtr len);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [StructLayout(LayoutKind.Sequential)]
    struct MBI { public IntPtr BaseAddress; public IntPtr AllocationBase; public uint AllocationProtect; public IntPtr RegionSize; public uint State; public uint Protect; public uint Type; }

    const uint QUERY = 0x0400, VM_READ = 0x0010;       // nur ansehen und lesen – kein Schreibrecht
    const int MAX_READ = 4 * 1024 * 1024, MAX_HITS = 400, SCAN_MS = 25000;

    static string[] names, origins;
    static int onlyPid;
    static IntPtr handle = IntPtr.Zero;
    static int handlePid = 0;
    static string emuName = "", emuTitle = "";
    static readonly object gate = new object();

    public static void Run(int port, string[] allowOrigins, string[] procNames, int pid) {
      names = procNames; origins = allowOrigins; onlyPid = pid;
      TcpListener l = new TcpListener(IPAddress.Loopback, port);
      l.Start();
      Console.WriteLine("PokeHub Live-Bruecke laeuft auf http://127.0.0.1:" + port + "  (Fenster offen lassen, Strg+C beendet)");
      if (!Find()) Console.WriteLine("Noch kein Emulator offen - ich warte.");
      while (true) {
        TcpClient c = l.AcceptTcpClient();
        ThreadPool.QueueUserWorkItem(delegate { try { Handle(c); } catch (Exception) { } finally { try { c.Close(); } catch (Exception) { } } });
      }
    }

    // Emulator-Prozess suchen (und merken, solange er lebt)
    static bool Find() {
      lock (gate) {
        if (handle != IntPtr.Zero) {
          try { Process p = Process.GetProcessById(handlePid); if (!p.HasExited) return true; } catch (Exception) { }
          CloseHandle(handle); handle = IntPtr.Zero; handlePid = 0;
          Console.WriteLine("Emulator geschlossen.");
        }
        Process best = null;
        foreach (Process p in Process.GetProcesses()) {
          try {
            if (onlyPid != 0) { if (p.Id != onlyPid) continue; }
            else if (Array.FindIndex(names, delegate(string n) { return string.Equals(n, p.ProcessName, StringComparison.OrdinalIgnoreCase); }) < 0) continue;
            if (best == null || p.WorkingSet64 > best.WorkingSet64) best = p;
          } catch (Exception) { }
        }
        if (best == null) return false;
        IntPtr h = OpenProcess(QUERY | VM_READ, false, best.Id);
        if (h == IntPtr.Zero) return false;
        handle = h; handlePid = best.Id; emuName = best.ProcessName;
        try { emuTitle = best.MainWindowTitle ?? ""; } catch (Exception) { emuTitle = ""; }
        Console.WriteLine("Emulator gefunden: " + emuName + " (" + handlePid + ")");
        return true;
      }
    }

    static bool OriginOk(string o) {
      if (o == null || o == "") return true;                  // kein Browser (oder eigene Adresszeile)
      Uri u;
      if (!Uri.TryCreate(o, UriKind.Absolute, out u)) return false;
      if (u.Host == "localhost" || u.Host == "127.0.0.1" || u.Host == "[::1]") return true;
      foreach (string a in origins) if (string.Equals(a, o, StringComparison.OrdinalIgnoreCase)) return true;
      return false;
    }

    static void Handle(TcpClient c) {
      c.ReceiveTimeout = 5000; c.SendTimeout = 15000;
      NetworkStream s = c.GetStream();
      // Kopfzeilen lesen (bis Leerzeile)
      MemoryStream head = new MemoryStream();
      int b, state = 0;
      while (head.Length < 16384 && (b = s.ReadByte()) >= 0) {
        head.WriteByte((byte)b);
        if (b == '\n') { if (state >= 1) break; state = 1; } else if (b != '\r') state = 0;
      }
      string[] lines = Encoding.ASCII.GetString(head.ToArray()).Split('\n');
      string[] req = lines[0].Trim().Split(' ');
      if (req.Length < 2) return;
      string origin = null;
      for (int i = 1; i < lines.Length; i++) if (lines[i].StartsWith("Origin:", StringComparison.OrdinalIgnoreCase)) origin = lines[i].Substring(7).Trim();
      string cors = "Access-Control-Allow-Origin: " + (string.IsNullOrEmpty(origin) ? "*" : origin) + "\r\nVary: Origin\r\nAccess-Control-Allow-Private-Network: true\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nAccess-Control-Expose-Headers: X-Read-Ok\r\nCache-Control: no-store\r\n";
      if (!OriginOk(origin)) { Send(s, "403 Forbidden", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"origin\"}")); Console.WriteLine("Abgelehnt (fremde Seite): " + origin); return; }
      if (req[0] == "OPTIONS") { Send(s, "204 No Content", cors, null, new byte[0]); return; }
      if (req[0] != "GET") { Send(s, "405 Method Not Allowed", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"method\"}")); return; }

      string path = req[1], query = "";
      int q = path.IndexOf('?');
      if (q >= 0) { query = path.Substring(q + 1); path = path.Substring(0, q); }
      Dictionary<string, string> arg = new Dictionary<string, string>();
      foreach (string kv in query.Split('&')) { int e = kv.IndexOf('='); if (e > 0) arg[kv.Substring(0, e)] = Uri.UnescapeDataString(kv.Substring(e + 1)); }

      if (path == "/status") {
        bool ok = Find();
        string emu = ok ? "{\"name\":" + Json(emuName) + ",\"pid\":" + handlePid + ",\"title\":" + Json(emuTitle) + "}" : "null";
        Send(s, "200 OK", cors, "application/json", Encoding.UTF8.GetBytes("{\"app\":\"pokehub-live\",\"v\":1,\"emu\":" + emu + "}"));
      } else if (path == "/scan") {
        if (!Find()) { Send(s, "200 OK", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"noemu\"}")); return; }
        string p; arg.TryGetValue("p", out p);
        List<byte[]> pats = new List<byte[]>();
        foreach (string hex in (p ?? "").Split(',')) { byte[] x = Hex(hex); if (x != null && x.Length >= 4 && x.Length <= 32) pats.Add(x); }
        if (pats.Count == 0 || pats.Count > 1200) { Send(s, "400 Bad Request", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"patterns\"}")); return; }
        Stopwatch sw = Stopwatch.StartNew();
        long bytes; bool cut;
        long lo = 0x10000, hi = 0x7FFFFFFE0000L, v; string t;
        if (arg.TryGetValue("lo", out t) && long.TryParse(t, System.Globalization.NumberStyles.HexNumber, null, out v) && v > lo) lo = v;
        if (arg.TryGetValue("hi", out t) && long.TryParse(t, System.Globalization.NumberStyles.HexNumber, null, out v) && v < hi) hi = v;
        List<KeyValuePair<int, long>> hits = Scan(pats, lo, hi, out bytes, out cut);
        StringBuilder sb = new StringBuilder("{\"ms\":" + sw.ElapsedMilliseconds + ",\"mb\":" + (bytes >> 20) + ",\"cut\":" + (cut ? "true" : "false") + ",\"hits\":[");
        for (int i = 0; i < hits.Count; i++) sb.Append(i > 0 ? "," : "").Append("[").Append(hits[i].Key).Append(",\"").Append(hits[i].Value.ToString("x")).Append("\"]");
        sb.Append("]}");
        Console.WriteLine("Suche: " + hits.Count + " Treffer in " + (bytes >> 20) + " MB, " + sw.ElapsedMilliseconds + " ms");
        Send(s, "200 OK", cors, "application/json", Encoding.UTF8.GetBytes(sb.ToString()));
      } else if (path == "/read") {
        if (!Find()) { Send(s, "200 OK", cors + "X-Read-Ok: \r\n", "application/octet-stream", new byte[0]); return; }
        string al, nl; arg.TryGetValue("a", out al); arg.TryGetValue("n", out nl);
        int n; if (!int.TryParse(nl, out n) || n <= 0) n = 0;
        string[] addrs = (al ?? "").Split(',');
        if (n == 0 || al == null || (long)n * addrs.Length > MAX_READ) { Send(s, "400 Bad Request", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"size\"}")); return; }
        byte[] outp = new byte[n * addrs.Length], one = new byte[n];
        StringBuilder okList = new StringBuilder();
        for (int i = 0; i < addrs.Length; i++) {
          long addr; IntPtr got;
          bool ok = long.TryParse(addrs[i], System.Globalization.NumberStyles.HexNumber, null, out addr) && addr > 0
            && ReadProcessMemory(handle, (IntPtr)addr, one, (IntPtr)n, out got) && (long)got == n;
          if (ok) Buffer.BlockCopy(one, 0, outp, i * n, n);       // sonst bleiben Nullen stehen
          okList.Append(ok ? '1' : '0');
        }
        Send(s, "200 OK", cors + "X-Read-Ok: " + okList + "\r\n", "application/octet-stream", outp);
      } else Send(s, "404 Not Found", cors, "application/json", Encoding.UTF8.GetBytes("{\"error\":\"path\"}"));
    }

    // Alle beschreibbaren, belegten Speicherbereiche des Emulators (zwischen lo und hi) nach den Bytefolgen durchsuchen.
    // Die Bereiche werden in Stücke geteilt und auf mehrere Kerne verteilt – aber nicht auf alle, der Emulator läuft ja.
    static List<KeyValuePair<int, long>> Scan(List<byte[]> pats, long lo, long hi, out long total, out bool cut) {
      List<KeyValuePair<int, long>> hits = new List<KeyValuePair<int, long>>();
      // Vorfilter über die ersten zwei Bytes
      List<int>[] tbl = new List<int>[65536];
      int maxLen = 0;
      for (int i = 0; i < pats.Count; i++) {
        int k = pats[i][0] | (pats[i][1] << 8);
        if (tbl[k] == null) tbl[k] = new List<int>();
        tbl[k].Add(i);
        if (pats[i].Length > maxLen) maxLen = pats[i].Length;
      }
      const int CHUNK = 8 * 1024 * 1024;
      // Stücke sammeln: [Adresse, Länge, Bytes bis zum Ende des Bereichs]
      List<long[]> jobs = new List<long[]>();
      long addr = lo;
      int mbiSize = Marshal.SizeOf(typeof(MBI));
      while (addr < hi) {
        MBI m;
        if (VirtualQueryEx(handle, (IntPtr)addr, out m, (IntPtr)mbiSize) == IntPtr.Zero) break;
        long rb = (long)m.BaseAddress, rs = (long)m.RegionSize;
        if (rs <= 0) break;
        // belegt, lesen+schreiben (Spiel-RAM), keine Schutzseite; kleine Bereiche sind nie der Spiel-RAM
        if (m.State == 0x1000 && (m.Protect & 0x04) != 0 && (m.Protect & 0x100) == 0 && rs >= 256 * 1024) {
          long from = Math.Max(rb, lo), to = Math.Min(rb + rs, hi);
          for (long at = from; at < to; at += CHUNK) jobs.Add(new long[] { at, Math.Min(CHUNK, to - at), rb + rs - at });
        }
        addr = rb + rs;
      }
      Stopwatch sw = Stopwatch.StartNew();
      long sum = 0; int stop = 0;
      ParallelOptions po = new ParallelOptions();
      po.MaxDegreeOfParallelism = Math.Max(1, Math.Min(4, Environment.ProcessorCount - 2));
      Parallel.ForEach(jobs, po, delegate { return new byte[CHUNK + 64]; }, delegate(long[] job, ParallelLoopState loop, byte[] buf) {
        if (stop != 0) return buf;
        int len = (int)job[1];
        int want = (int)Math.Min(len + maxLen, job[2]);        // etwas über das Stück hinaus, für Folgen an der Grenze
        IntPtr got;
        if (!ReadProcessMemory(handle, (IntPtr)job[0], buf, (IntPtr)want, out got)) {
          want = len;
          if (!ReadProcessMemory(handle, (IntPtr)job[0], buf, (IntPtr)want, out got)) return buf;
        }
        int have = (int)(long)got, last = Math.Min(len, have - 1);
        Interlocked.Add(ref sum, Math.Min(have, len));
        for (int i = 0; i < last; i++) {
          List<int> cand = tbl[buf[i] | (buf[i + 1] << 8)];
          if (cand == null) continue;
          for (int c = 0; c < cand.Count; c++) {
            byte[] p = pats[cand[c]];
            if (i + p.Length > have) continue;
            int j = 2;
            while (j < p.Length && buf[i + j] == p[j]) j++;
            if (j == p.Length) lock (hits) { hits.Add(new KeyValuePair<int, long>(cand[c], job[0] + i)); if (hits.Count >= MAX_HITS) stop = 1; }
          }
        }
        if (sw.ElapsedMilliseconds > SCAN_MS) stop = 1;
        return buf;
      }, delegate(byte[] buf) { });
      total = sum; cut = stop != 0;
      hits.Sort(delegate(KeyValuePair<int, long> x, KeyValuePair<int, long> y) { return x.Value.CompareTo(y.Value); });
      return hits;
    }

    static byte[] Hex(string h) {
      if (h == null || h.Length == 0 || h.Length % 2 != 0) return null;
      byte[] o = new byte[h.Length / 2];
      for (int i = 0; i < o.Length; i++) { byte v; if (!byte.TryParse(h.Substring(i * 2, 2), System.Globalization.NumberStyles.HexNumber, null, out v)) return null; o[i] = v; }
      return o;
    }
    static string Json(string t) {
      StringBuilder sb = new StringBuilder("\"");
      foreach (char ch in t) { if (ch == '"' || ch == '\\') sb.Append('\\').Append(ch); else if (ch < 32) sb.Append(' '); else sb.Append(ch); }
      return sb.Append('"').ToString();
    }
    static void Send(Stream s, string status, string extra, string type, byte[] body) {
      string h = "HTTP/1.1 " + status + "\r\n" + extra + (type != null ? "Content-Type: " + type + "\r\n" : "") + "Content-Length: " + body.Length + "\r\nConnection: close\r\n\r\n";
      byte[] hb = Encoding.UTF8.GetBytes(h);
      s.Write(hb, 0, hb.Length);
      if (body.Length > 0) s.Write(body, 0, body.Length);
      s.Flush();
    }
  }
}
'@

try { [PokeHubLive.Bridge]::Run($port, [string[]]$origins, [string[]]$names, $onlyPid) }
catch { Write-Host ('Fehler: ' + $_.Exception.InnerException.Message + $_.Exception.Message) -ForegroundColor Red; exit 1 }
