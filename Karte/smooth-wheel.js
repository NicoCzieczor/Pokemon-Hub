/*
 * Stufenloses Zoomen mit Mausrad und Touchpad für alle Karten (Leaflet 1.9).
 *
 * Leaflets eigener Mausrad-Zoom springt je Rastung um eine feste Stufe und verwirft weitere Rastungen, solange die
 * 250-ms-Animation läuft – zügiges Drehen kam deshalb nur zum Teil an (gemessen: 2 von 5 Rastungen), das Zoomen wirkte
 * zäh. Hier sammelt jede Rastung ein Zoom-Ziel; die Karte gleitet Bild für Bild dorthin, wie beim Fingerzoom (Pinch):
 * map._move(…, { pinch: true }) – Kachelebenen verschieben sich dabei nur per Transform, gebaut wird erst am Ende.
 * Der Punkt unter dem Mauszeiger bleibt stehen. Am Schluss rastet der Zoom auf zoomSnap ein (wie beim Pinch).
 * Gemessen (2560×1440, 144 Hz, je 5 Läufe): Leaflet 113 Bilder/s, so 129 Bilder/s – und alle Rastungen kommen an.
 * Eine Variante, die das Ziel per CSS-Übergang (zoomanim) umlenkt, war mit 98 Bilder/s langsamer und wurde verworfen.
 *
 * Einschalten: L.map(…, { scrollWheelZoom: false, smoothWheelZoom: true })
 */
(function () {
  'use strict';
  if (!window.L) return;

  var PX_PER_LEVEL = 180;  // Pixel Mausrad je Zoomstufe: eine Rastung (100 px) ≈ eine halbe Stufe
  var EASE_MS = 70;        // Zeitkonstante des Nachgleitens (95 % nach ~210 ms, unabhängig von der Bildrate)
  var IDLE_MS = 140;       // so lange ohne Mausrad gilt die Geste als beendet

  L.Map.mergeOptions({ smoothWheelZoom: false });

  L.Map.SmoothWheelZoom = L.Handler.extend({
    addHooks: function () {
      var self = this, map = this._map;
      L.DomEvent.on(map.getContainer(), 'wheel', this._onWheel, this);
      // Andere Bewegungen (Ziehen, flyTo, setView …) beenden das Gleiten sauber
      this._origStop = map._stop;
      map._stop = function () { self._finish(); return self._origStop.apply(this, arguments); };
      map.on('dragstart', this._finish, this);
    },
    removeHooks: function () {
      var map = this._map;
      L.DomEvent.off(map.getContainer(), 'wheel', this._onWheel, this);
      map.off('dragstart', this._finish, this);
      if (this._origStop) map._stop = this._origStop;
      this._finish();
    },

    _onWheel: function (e) {
      var map = this._map;
      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);
      // deltaMode 1 = Zeilen (Firefox), 2 = Seiten
      var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 500 : e.deltaY;
      if (!dy) return;
      if (!this._active) this._start();
      this._mouse = map.mouseEventToContainerPoint(e);
      this._goal = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), this._goal - dy / PX_PER_LEVEL));
      this._wheeling = true;
      clearTimeout(this._idle);
      this._idle = setTimeout(L.Util.bind(this._release, this), IDLE_MS);
    },

    _start: function () {
      var map = this._map;
      this._origStop.call(map);   // laufende Animationen anhalten, ohne die eigene Geste zu beenden
      this._active = true;
      this._moved = false;
      this._zoom = map.getZoom();
      this._goal = this._zoom;
      this._last = performance.now();
      this._raf = requestAnimationFrame(L.Util.bind(this._frame, this));
    },

    // Mausrad losgelassen: auf die nächste Rasterstufe einrasten und dorthin weitergleiten
    _release: function () {
      var map = this._map, snap = map.options.zoomSnap;
      this._wheeling = false;
      if (snap) this._goal = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), Math.round(this._goal / snap) * snap));
    },

    _frame: function (now) {
      var map = this._map;
      this._raf = 0;
      if (!this._active) return;
      var dt = Math.min(64, now - this._last);
      this._last = now;
      var z = this._zoom + (this._goal - this._zoom) * (1 - Math.exp(-dt / EASE_MS));
      if (Math.abs(this._goal - z) < 0.003) z = this._goal;
      if (z !== this._zoom) {
        // Punkt unter dem Mauszeiger festhalten
        var size = map.getSize(), offset = this._mouse.subtract(size.divideBy(2));
        var anchor = map.containerPointToLatLng(this._mouse);
        var center = map.unproject(map.project(anchor, z).subtract(offset), z);
        if (!this._moved) { map._moveStart(true, false); this._moved = true; }
        map._move(center, z, { pinch: true, round: false });
        this._zoom = z;
      }
      if (this._wheeling || z !== this._goal) this._raf = requestAnimationFrame(L.Util.bind(this._frame, this));
      else this._finish();
    },

    // Geste abschließen: jetzt bauen alle Ebenen für die neue Zoomstufe (zoomend, moveend)
    _finish: function () {
      if (!this._active) return;
      this._active = false;
      this._wheeling = false;
      clearTimeout(this._idle);
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this._moved) { this._moved = false; this._map._moveEnd(true); }
    }
  });

  L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom);

  // Ortsnamen sind viele einzelne Marker: beim Zoomen würde Leaflet jeden in jedem Bild einzeln verschieben (Style-
  // Neuberechnung, eine Grafikebene je Name). In dieser Ebene sind sie für die Dauer des Zooms unsichtbar, bleiben aber
  // im Layout (kein Neu-Layout am Ende) und werden erst am Ende einmal an ihre neue Stelle gesetzt.
  // Aufruf: L.labelPane(map) → Name der Ebene für { pane: … } der Marker.
  L.labelPane = function (map, name) {
    name = name || 'labels';
    var pane = map.getPane(name);
    if (pane) return name;
    pane = map.createPane(name);
    pane.style.zIndex = 600;
    pane.style.pointerEvents = 'none';
    pane._lazyZoom = true;
    map.on('zoomstart', function () { pane.style.visibility = 'hidden'; });
    map.on('zoomend', function () { pane.style.visibility = ''; });
    return name;
  };
  var markerEvents = L.Marker.prototype.getEvents;
  L.Marker.include({
    getEvents: function () {
      var events = markerEvents.call(this);
      events.zoom = this._zoomLazy;
      events.zoomend = this._zoomEndLazy;
      return events;
    },
    _lazyPane: function () { var p = this._map && this._map.getPane(this.options.pane); return !!(p && p._lazyZoom); },
    _zoomLazy: function (e) { if (!(e && e.pinch && this._lazyPane())) this.update(); },
    _zoomEndLazy: function () { if (this._lazyPane()) this.update(); }
  });

  // Bewegt sich die Karte gerade (Schieben, Zoomen, Fliegen)? Für Szenen drumherum, die dann Arbeit sparen –
  // bewusst ohne Klasse am <body>: deren Wechsel ließe die ganze Seite ihren Style neu berechnen.
  // (Die Animationen der Szene per Klasse anzuhalten wurde gemessen und verworfen: das Fortsetzen von ~400 Animationen
  // kostete am Ende jeder Bewegung mehr, als das Anhalten während der Bewegung sparte.)
  L.Map.addInitHook(function () {
    var map = this, timer = 0;
    this.on('movestart zoomstart', function () { clearTimeout(timer); window.PokeHubMapBusy = true; });
    this.on('moveend zoomend', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { window.PokeHubMapBusy = false; }, 250);
    });
    this.on('unload', function () { clearTimeout(timer); window.PokeHubMapBusy = false; map = null; });
  });

  // Bildebenen (Kartenblätter, Innenkarten-SVG) während des Gleitens nur per Transform skalieren: Leaflet setzt sonst
  // in jedem Bild Breite und Höhe neu, und der Browser malt jedes große Blatt neu. Die echte Größe gibt es am Ende.
  var proto = L.ImageOverlay.prototype, baseEvents = proto.getEvents, baseReset = proto._reset;
  proto.getEvents = function () {
    var events = baseEvents.call(this);
    events.zoom = this._onZoomPinch;
    events.zoomend = this._reset;
    return events;
  };
  proto._reset = function () {
    baseReset.call(this);
    if (this._map) this._resetZoom = this._map.getZoom();
  };
  proto._onZoomPinch = function (e) {
    if (!(e && e.pinch) || this._resetZoom == null || !this._image) return this._reset();
    var map = this._map;
    L.DomUtil.setTransform(this._image, map.latLngToLayerPoint(this._bounds.getNorthWest()), map.getZoomScale(map.getZoom(), this._resetZoom));
  };
})();
