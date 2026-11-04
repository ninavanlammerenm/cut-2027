/*
 * Rekenlogica — geen DOM, geen opslag.
 * Alles hier is los te testen met: node tests/logic.test.js
 * Pas drempels en regels hier aan, niet in de schermen.
 */
(function (root) {
  'use strict';

  // ---------- Datums (altijd lokale kalenderdagen, als 'YYYY-MM-DD') ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseKey(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function todayKey() { return dateKey(new Date()); }

  function addDays(key, n) {
    var d = parseKey(key);
    d.setDate(d.getDate() + n);
    return dateKey(d);
  }

  // Aantal dagen van a naar b (b later = positief). Rondt af ivm zomertijd.
  function daysBetween(a, b) {
    return Math.round((parseKey(b) - parseKey(a)) / 86400000);
  }

  // ---------- Invoer ----------

  /*
   * Leest een getal zoals je het op je telefoon typt.
   * - decimaal: "69,4" en "69.4" worden 69.4
   * - integer:  "8.000" en "8 000" worden 8000 (punt = duizendtal)
   * Leeg geeft null, onzin geeft NaN.
   */
  function parseNum(str, opts) {
    if (str === null || str === undefined) return null;
    var s = String(str).trim().replace(/\s+/g, '');
    if (s === '') return null;
    if (opts && opts.integer) {
      s = s.replace(/\./g, '');
      if (!/^\d+$/.test(s)) return NaN;
      return parseInt(s, 10);
    }
    s = s.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  // ---------- Gewicht ----------

  // Uit het dagenobject alle gewichtsmetingen, oud naar nieuw.
  function weightSeries(days) {
    var out = [];
    Object.keys(days || {}).forEach(function (k) {
      var w = days[k] && days[k].weight;
      if (typeof w === 'number' && isFinite(w)) out.push({ date: k, weight: w });
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  }

  function mean(arr) {
    if (!arr.length) return null;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  /*
   * Gemiddelde van de metingen in de kalenderdagen [endKey - (days-1), endKey].
   * Ontbrekende dagen tellen niet mee. Geen metingen → avg null.
   */
  function windowAverage(series, endKey, days) {
    days = days || 7;
    var startKey = addDays(endKey, -(days - 1));
    var vals = [];
    for (var i = 0; i < series.length; i++) {
      var d = series[i].date;
      if (d >= startKey && d <= endKey) vals.push(series[i].weight);
    }
    return { avg: mean(vals), n: vals.length, start: startKey, end: endKey };
  }

  /*
   * 7-daags voortschrijdend gemiddelde: voor elke meetdag het gemiddelde
   * van alle metingen in die dag en de 6 kalenderdagen ervoor.
   */
  function rollingAverage(series, days) {
    days = days || 7;
    return series.map(function (p) {
      var w = windowAverage(series, p.date, days);
      return { date: p.date, avg: w.avg, n: w.n };
    });
  }

  /*
   * Huidige week (laatste 7 dagen t/m refKey) tegenover de 7 dagen daarvoor.
   * diff < 0 betekent: gemiddelde is gedaald.
   */
  function weekComparison(series, refKey) {
    var cur = windowAverage(series, refKey, 7);
    var prev = windowAverage(series, addDays(refKey, -7), 7);
    var diff = (cur.avg !== null && prev.avg !== null) ? cur.avg - prev.avg : null;
    return { current: cur, previous: prev, diff: diff };
  }

  function weightSummary(series, settings, refKey) {
    var cmp = weekComparison(series, refKey);
    var latest = series.length ? series[series.length - 1] : null;
    // Voor "verloren" en "nog te gaan" het weekgemiddelde gebruiken (rustiger),
    // anders de laatste losse meting.
    var current = cmp.current.avg !== null ? cmp.current.avg : (latest ? latest.weight : null);
    var start = settings && typeof settings.startWeight === 'number' ? settings.startWeight : null;
    var goal = settings && typeof settings.goalWeight === 'number' ? settings.goalWeight : null;
    return {
      latest: latest,
      weekAvg: cmp.current.avg,
      weekCount: cmp.current.n,
      prevWeekAvg: cmp.previous.avg,
      weekDiff: cmp.diff,
      current: current,
      lostSinceStart: (current !== null && start !== null) ? start - current : null,
      toGo: (current !== null && goal !== null) ? Math.max(0, current - goal) : null
    };
  }

  // BMI ter info (niet als doel).
  function bmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    var m = heightCm / 100;
    return weightKg / (m * m);
  }

  // ---------- Dagdoelen ----------

  /*
   * Voortgang richting een doel.
   * - kind 'limit' (kcal): vol bij het doel, daarboven 'over'
   * - kind 'range' (vezels, stappen): vol bij min, 'done' tussen min en max, 'over' boven max
   * - kind 'min' (eiwit): vol bij min, 'done' daarboven
   */
  function goalProgress(value, goal) {
    if (value === null || value === undefined || !isFinite(value)) {
      return { pct: 0, status: 'empty' };
    }
    var target = goal.min;
    var pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
    var status = 'progress';
    if (goal.kind === 'limit') {
      if (value > goal.min) status = 'over';
      else if (value >= goal.min * 0.95) status = 'done';
    } else if (goal.kind === 'range') {
      if (value > goal.max) status = 'over';
      else if (value >= goal.min) status = 'done';
    } else {
      if (value >= goal.min) status = 'done';
    }
    return { pct: pct, status: status };
  }

  var Logic = {
    dateKey: dateKey,
    parseKey: parseKey,
    todayKey: todayKey,
    addDays: addDays,
    daysBetween: daysBetween,
    parseNum: parseNum,
    mean: mean,
    weightSeries: weightSeries,
    windowAverage: windowAverage,
    rollingAverage: rollingAverage,
    weekComparison: weekComparison,
    weightSummary: weightSummary,
    bmi: bmi,
    goalProgress: goalProgress
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else root.Logic = Logic;
})(this);
