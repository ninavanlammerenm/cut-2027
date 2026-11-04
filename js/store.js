/*
 * Opslag in localStorage. Eén object onder één sleutel.
 * Begint leeg: alleen de startwaarden uit de instellingen.
 */
(function (root) {
  'use strict';

  var KEY = 'cut2027.data';
  var VERSION = 1;

  // Soorten dagen in het weekschema
  var DAY_TYPES = [
    { id: 'benen', label: 'Benen (zwaar)' },
    { id: 'boven', label: 'Bovenlichaam' },
    { id: 'kickboksen', label: 'Kickboksen' },
    { id: 'rust', label: 'Rust' }
  ];

  var GROUPS = [
    { id: 'houding', label: 'Houding (warming-up)' },
    { id: 'benen', label: 'Benen' },
    { id: 'boven', label: 'Bovenlichaam' }
  ];

  function defaultExercises() {
    return [
      { id: 'ex_bandpull', name: 'Band pull-aparts', group: 'houding' },
      { id: 'ex_chintuck', name: 'Chin tucks', group: 'houding' },
      { id: 'ex_hipthrust', name: 'Hip thrust', group: 'benen' },
      { id: 'ex_rdl', name: 'Roemeense deadlift', group: 'benen' },
      { id: 'ex_split', name: 'Split squat', group: 'benen' },
      { id: 'ex_squat', name: 'Squat', group: 'benen' },
      { id: 'ex_row', name: 'Roeien', group: 'boven' },
      { id: 'ex_lat', name: 'Lat pulldown', group: 'boven' },
      { id: 'ex_ohp', name: 'Schouderpress', group: 'boven' },
      { id: 'ex_facepull', name: 'Face pulls', group: 'boven' },
      { id: 'ex_lateral', name: 'Lateral raises', group: 'boven' }
    ];
  }

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
        stepsMax: 10000,
        // maandag t/m zondag
        schedule: ['benen', 'kickboksen', 'boven', 'rust', 'benen', 'kickboksen', 'rust']
      },
      // 'YYYY-MM-DD' -> { weight, kcal, protein, fiber, steps, trained, atFriend }
      days: {},
      // [{ id, date, waist, hips, thigh, arm, chest }]
      measurements: [],
      exercises: defaultExercises(),
      // 'YYYY-MM-DD' -> { exId: { weight, reps, sets } }
      logs: {},
      // laatste aanpassing van het kcal-doel via Bijsturing
      lastAdjust: null
    };
  }

  // Vult ontbrekende velden aan met standaardwaarden (handig na updates/import).
  function normalize(data) {
    var d = defaults();
    if (!data || typeof data !== 'object') return d;
    var out = Object.assign({}, d, data);
    out.settings = Object.assign({}, d.settings, data.settings || {});
    if (!Array.isArray(out.settings.schedule) || out.settings.schedule.length !== 7) out.settings.schedule = d.settings.schedule;
    out.days = isObj(data.days) ? data.days : {};
    out.logs = isObj(data.logs) ? data.logs : {};
    out.measurements = Array.isArray(data.measurements) ? data.measurements : [];
    out.exercises = Array.isArray(data.exercises) ? data.exercises : d.exercises;
    out.version = VERSION;
    return out;
  }

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

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

  function updateSettings(fields) {
    Object.assign(load().settings, fields);
    return save();
  }

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

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---------- Metingen ----------

  function measurementOn(date) {
    return load().measurements.filter(function (m) { return m.date === date; })[0] || null;
  }

  // Eén meting per datum: bestaande wordt overschreven.
  function saveMeasurement(date, values) {
    var list = load().measurements;
    var m = measurementOn(date);
    if (!m) { m = { id: uid('m'), date: date }; list.push(m); }
    Object.keys(values).forEach(function (k) {
      if (values[k] === null || values[k] === undefined) delete m[k]; else m[k] = values[k];
    });
    return save();
  }

  function deleteMeasurement(id) {
    var d = load();
    d.measurements = d.measurements.filter(function (m) { return m.id !== id; });
    return save();
  }

  // ---------- Oefeningen en logboek ----------

  function addExercise(name, group) {
    load().exercises.push({ id: uid('ex'), name: name, group: group });
    return save();
  }

  function renameExercise(id, name) {
    load().exercises.forEach(function (e) { if (e.id === id) e.name = name; });
    return save();
  }

  // Verwijdert de oefening uit de lijst. Oude logregels blijven in de backup staan.
  function deleteExercise(id) {
    var d = load();
    d.exercises = d.exercises.filter(function (e) { return e.id !== id; });
    return save();
  }

  function moveExercise(id, dir) {
    var list = load().exercises;
    var i = list.findIndex(function (e) { return e.id === id; });
    if (i < 0) return;
    var group = list[i].group;
    // zoek de buur in dezelfde groep
    for (var j = i + dir; j >= 0 && j < list.length; j += dir) {
      if (list[j].group === group) {
        var t = list[i]; list[i] = list[j]; list[j] = t;
        break;
      }
    }
    return save();
  }

  function getLog(date, exId) {
    var l = load().logs[date];
    return (l && l[exId]) || null;
  }

  function setLog(date, exId, entry) {
    var logs = load().logs;
    var day = logs[date] || {};
    var clean = {};
    ['weight', 'reps', 'sets'].forEach(function (k) {
      if (typeof entry[k] === 'number' && isFinite(entry[k])) clean[k] = entry[k];
    });
    if (Object.keys(clean).length) day[exId] = clean; else delete day[exId];
    if (Object.keys(day).length) logs[date] = day; else delete logs[date];
    return save();
  }

  // Alle sessies van een oefening: [{date, weight, reps, sets}]
  function history(exId) {
    var logs = load().logs;
    return Object.keys(logs).sort().filter(function (d) { return logs[d][exId]; })
      .map(function (d) { return Object.assign({ date: d }, logs[d][exId]); });
  }

  // ---------- Backup ----------

  function exportJSON() {
    var d = load();
    return JSON.stringify(Object.assign({ app: 'cut-2027', exportedAt: new Date().toISOString() }, d), null, 2);
  }

  // Geeft een foutmelding terug, of null als het gelukt is.
  function importJSON(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return 'Dit bestand is geen geldige JSON.'; }
    if (!isObj(obj) || !isObj(obj.settings) || !isObj(obj.days)) return 'Dit lijkt geen backup van Cut 2027.';
    delete obj.app; delete obj.exportedAt;
    cache = normalize(obj);
    return save() ? null : 'Opslaan is niet gelukt.';
  }

  function reset() {
    cache = defaults();
    return save();
  }

  root.Store = {
    DAY_TYPES: DAY_TYPES,
    GROUPS: GROUPS,
    load: load,
    save: save,
    settings: settings,
    updateSettings: updateSettings,
    getDay: getDay,
    updateDay: updateDay,
    measurementOn: measurementOn,
    saveMeasurement: saveMeasurement,
    deleteMeasurement: deleteMeasurement,
    addExercise: addExercise,
    renameExercise: renameExercise,
    deleteExercise: deleteExercise,
    moveExercise: moveExercise,
    getLog: getLog,
    setLog: setLog,
    history: history,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset,
    defaults: defaults,
    normalize: normalize
  };
})(this);
