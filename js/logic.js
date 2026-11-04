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

  // ---------- Bijsturing ----------

  /*
   * Alle drempels voor de bijsturingsregel op één plek.
   * Snelheden in kg per week (positief = afvallen).
   */
  var ADJUST_RULES = {
    minMeasurements: 10,   // minder dan dit: nog niet genoeg data
    minPerWindow: 3,       // minimaal aantal metingen per 7-dagenvenster
    intervalDays: 14,      // elke 2 weken een check
    onTrackMin: 0.3,       // 0,3 – 0,5: op koers
    onTrackMax: 0.5,
    tooFast: 0.7,          // meer dan 0,7: te snel
    kcalDown: [150, 200],  // voorgestelde verlaging
    kcalUp: 150            // voorgestelde verhoging bij te snel
  };

  /*
   * Datum van de meest recente check op of voor refKey, of null.
   * De eerste check valt op de dag dat er 10 metingen zijn, maar niet
   * eerder dan 13 dagen na de eerste meting (dan zijn er twee volle weken).
   * Daarna elke 14 dagen.
   */
  function checkDate(series, refKey, rules) {
    rules = rules || ADJUST_RULES;
    var upto = series.filter(function (p) { return p.date <= refKey; });
    if (upto.length < rules.minMeasurements) return null;
    var tenth = upto[rules.minMeasurements - 1].date;
    var twoWeeks = addDays(upto[0].date, 13);
    var first = tenth > twoWeeks ? tenth : twoWeeks;
    if (first > refKey) return null;
    var k = Math.floor(daysBetween(first, refKey) / rules.intervalDays);
    return addDays(first, k * rules.intervalDays);
  }

  function nextCheckDate(series, refKey, rules) {
    rules = rules || ADJUST_RULES;
    var last = checkDate(series, refKey, rules);
    if (last) return addDays(last, rules.intervalDays);
    var upto = series.filter(function (p) { return p.date <= refKey; });
    if (!upto.length) return null;
    var twoWeeks = addDays(upto[0].date, 13);
    return twoWeeks > refKey ? twoWeeks : null; // null: wacht op meer metingen
  }

  /*
   * De regel zelf: gemiddelde laatste 7 dagen t/m checkKey tegenover de 7 dagen daarvoor.
   * status: 'insufficient' | 'too_slow' | 'on_track' | 'bit_fast' | 'too_fast'
   * 'bit_fast' (0,5 – 0,7 kg/week) zit tussen de opgegeven regels in: prima, wel in de gaten houden.
   */
  function adjustmentAdvice(series, checkKey, rules) {
    rules = rules || ADJUST_RULES;
    var upto = series.filter(function (p) { return p.date <= checkKey; });
    var cmp = weekComparison(upto, checkKey);
    var res = {
      status: 'insufficient', count: upto.length, rate: null,
      current: cmp.current.avg, previous: cmp.previous.avg,
      currentN: cmp.current.n, previousN: cmp.previous.n, checkKey: checkKey
    };
    if (upto.length < rules.minMeasurements) return res;
    if (cmp.current.n < rules.minPerWindow || cmp.previous.n < rules.minPerWindow) return res;
    // afronden op 2 decimalen zodat 0,3 niet door floating point 0,29999 wordt
    var rate = Math.round((cmp.previous.avg - cmp.current.avg) * 100) / 100;
    res.rate = rate;
    if (rate > rules.tooFast) res.status = 'too_fast';
    else if (rate > rules.onTrackMax) res.status = 'bit_fast';
    else if (rate >= rules.onTrackMin) res.status = 'on_track';
    else res.status = 'too_slow';
    return res;
  }

  // ---------- Metingen ----------

  /*
   * Voor één meetpunt (bijv. 'waist'): laatste waarde, verschil met eerste en vorige.
   * list: [{date, waist, hips, ...}] in willekeurige volgorde.
   */
  function measurementStats(list, field) {
    var pts = (list || []).filter(function (m) { return typeof m[field] === 'number'; })
      .map(function (m) { return { date: m.date, value: m[field] }; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var n = pts.length;
    var latest = n ? pts[n - 1] : null;
    return {
      series: pts,
      latest: latest,
      sinceFirst: n > 1 ? latest.value - pts[0].value : null,
      sincePrev: n > 1 ? latest.value - pts[n - 2].value : null
    };
  }

  // Dagen sinds de laatste meting, of null als er nog geen is.
  function daysSinceLast(list, refKey) {
    if (!list || !list.length) return null;
    var last = list.reduce(function (m, x) { return x.date > m ? x.date : m; }, list[0].date);
    return daysBetween(last, refKey);
  }

  // ---------- Kracht ----------

  var STRENGTH_RULES = {
    compareWith: 3,    // laatste sessie vergelijken met gemiddelde van max. 3 sessies ervoor
    upPct: 1,          // meer dan +1% = omhoog
    downPct: -3,       // meer dan 3% lager = omlaag
    warnCount: 2,      // waarschuwing bij zoveel oefeningen die dalen
    recentDays: 42     // alleen oefeningen meetellen die in de laatste 6 weken gedaan zijn
  };

  /*
   * Eén getal per sessie om te vergelijken: geschatte 1RM (Epley),
   * gewicht × (1 + herhalingen/30). Zonder gewicht (band, lichaamsgewicht): herhalingen.
   * Aantal sets telt niet mee; dat is volume, geen kracht.
   */
  function setScore(e) {
    if (!e) return null;
    var w = typeof e.weight === 'number' ? e.weight : 0;
    var r = typeof e.reps === 'number' ? e.reps : 0;
    if (w > 0 && r > 0) return w * (1 + r / 30);
    if (w > 0) return w;
    if (r > 0) return r;
    return null;
  }

  /*
   * history: [{date, weight, reps, sets}] (willekeurige volgorde)
   * trend: 'up' | 'same' | 'down' | 'new'
   */
  function strengthTrend(history, rules) {
    rules = rules || STRENGTH_RULES;
    var h = (history || []).map(function (e) { return { date: e.date, score: setScore(e) }; })
      .filter(function (e) { return e.score !== null; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    if (h.length < 2) return { trend: 'new', pct: null, scores: h };
    var last = h[h.length - 1].score;
    var prev = h.slice(Math.max(0, h.length - 1 - rules.compareWith), h.length - 1)
      .map(function (e) { return e.score; });
    var base = mean(prev);
    var pct = Math.round(((last - base) / base) * 1000) / 10;
    var trend = pct > rules.upPct ? 'up' : (pct < rules.downPct ? 'down' : 'same');
    return { trend: trend, pct: pct, scores: h, lastDate: h[h.length - 1].date };
  }

  /*
   * trends: { exId: strengthTrend(...) }
   * Geeft { warn, down: [exId...] } — warn als meerdere recente oefeningen dalen.
   */
  function strengthWarning(trends, refKey, rules) {
    rules = rules || STRENGTH_RULES;
    var down = Object.keys(trends || {}).filter(function (id) {
      var t = trends[id];
      return t.trend === 'down' && (!refKey || daysBetween(t.lastDate, refKey) <= rules.recentDays);
    });
    return { warn: down.length >= rules.warnCount, down: down };
  }

  var Logic = {
    ADJUST_RULES: ADJUST_RULES,
    STRENGTH_RULES: STRENGTH_RULES,
    checkDate: checkDate,
    nextCheckDate: nextCheckDate,
    adjustmentAdvice: adjustmentAdvice,
    measurementStats: measurementStats,
    daysSinceLast: daysSinceLast,
    setScore: setScore,
    strengthTrend: strengthTrend,
    strengthWarning: strengthWarning,
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
