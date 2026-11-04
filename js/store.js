/*
 * Opslag in localStorage. Eén object onder één sleutel.
 * Begint leeg: alleen de startwaarden uit de instellingen.
 */
(function (root) {
  'use strict';

  var KEY = 'cut2027.data';
  var VERSION = 1;

  function defaults() {
    return {
      version: VERSION,
      settings: {
        heightCm: 168,
        startWeight: 70,
        goalWeight: null,
        kcal: 1800,
        protein: 120,
        fiberMin: 30,
        fiberMax: 35,
        stepsMin: 8000,
        stepsMax: 10000
      },
      // 'YYYY-MM-DD' -> { weight, kcal, protein, fiber, steps, trained, atFriend }
      days: {}
    };
  }

  // Vult ontbrekende velden aan met standaardwaarden (handig na updates/import).
  function normalize(data) {
    var d = defaults();
    if (!data || typeof data !== 'object') return d;
    var out = Object.assign({}, d, data);
    out.settings = Object.assign({}, d.settings, data.settings || {});
    out.days = (data.days && typeof data.days === 'object') ? data.days : {};
    out.version = VERSION;
    return out;
  }

  var cache = null;

  function load() {
    if (cache) return cache;
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* privémodus e.d. */ }
    try { cache = normalize(raw ? JSON.parse(raw) : null); }
    catch (e) { cache = defaults(); }
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); return true; }
    catch (e) { return false; }
  }

  function settings() { return load().settings; }

  function getDay(key) { return load().days[key] || {}; }

  // Zet velden voor een dag. undefined/null verwijdert een veld; lege dag verdwijnt.
  function updateDay(key, fields) {
    var data = load();
    var day = Object.assign({}, data.days[key] || {});
    Object.keys(fields).forEach(function (f) {
      var v = fields[f];
      if (v === null || v === undefined || (v === false && f === 'atFriend')) delete day[f];
      else day[f] = v;
    });
    if (Object.keys(day).length) data.days[key] = day;
    else delete data.days[key];
    return save();
  }

  root.Store = {
    load: load,
    save: save,
    settings: settings,
    getDay: getDay,
    updateDay: updateDay,
    defaults: defaults,
    normalize: normalize
  };
})(this);
