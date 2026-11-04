/*
 * Testgevallen voor de rekenlogica.
 * Draaien: node tests/logic.test.js
 */
'use strict';
var assert = require('assert');
var L = require('../js/logic.js');

var passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}
function near(a, b, msg) { assert.ok(Math.abs(a - b) < 1e-9, (msg || '') + ' verwacht ' + b + ', kreeg ' + a); }

// Hulp: dagenobject uit [datum, gewicht]-paren
function days(pairs) {
  var o = {};
  pairs.forEach(function (p) { o[p[0]] = { weight: p[1] }; });
  return o;
}

console.log('Datums');
test('addDays over maandgrens en schrikkeljaar', function () {
  assert.strictEqual(L.addDays('2027-02-27', 2), '2027-03-01');
  assert.strictEqual(L.addDays('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(L.addDays('2027-01-01', -1), '2026-12-31');
});
test('daysBetween over zomertijd', function () {
  assert.strictEqual(L.daysBetween('2027-03-27', '2027-03-29'), 2);
  assert.strictEqual(L.daysBetween('2026-10-24', '2026-10-26'), 2);
});

console.log('Invoer');
test('parseNum met komma en punt', function () {
  assert.strictEqual(L.parseNum('69,4'), 69.4);
  assert.strictEqual(L.parseNum('69.4'), 69.4);
  assert.strictEqual(L.parseNum(' 70 '), 70);
  assert.strictEqual(L.parseNum(''), null);
  assert.ok(isNaN(L.parseNum('abc')));
});
test('parseNum integer: punt is duizendtal', function () {
  assert.strictEqual(L.parseNum('8.000', { integer: true }), 8000);
  assert.strictEqual(L.parseNum('10 500', { integer: true }), 10500);
  assert.ok(isNaN(L.parseNum('12,5', { integer: true })));
});

console.log('Voortschrijdend gemiddelde');
test('lege reeks geeft lege uitkomst', function () {
  assert.deepStrictEqual(L.rollingAverage(L.weightSeries({}), 7), []);
  assert.deepStrictEqual(L.weightSeries(undefined), []);
});
test('dagen zonder gewicht worden genegeerd en reeks is gesorteerd', function () {
  var s = L.weightSeries({ '2027-01-03': { weight: 70 }, '2027-01-01': { weight: 71 }, '2027-01-02': { kcal: 1800 } });
  assert.deepStrictEqual(s.map(function (p) { return p.date; }), ['2027-01-01', '2027-01-03']);
});
test('7 opeenvolgende dagen: laatste punt = gemiddelde van alle 7', function () {
  var s = L.weightSeries(days([
    ['2027-01-01', 70], ['2027-01-02', 69.8], ['2027-01-03', 70.2], ['2027-01-04', 69.6],
    ['2027-01-05', 69.4], ['2027-01-06', 69.6], ['2027-01-07', 69.4]
  ]));
  var r = L.rollingAverage(s, 7);
  near(r[6].avg, (70 + 69.8 + 70.2 + 69.6 + 69.4 + 69.6 + 69.4) / 7);
  assert.strictEqual(r[6].n, 7);
  near(r[0].avg, 70); // eerste dag: alleen zichzelf
  near(r[1].avg, 69.9);
});
test('venster schuift: meting van 7 dagen eerder valt eruit', function () {
  var s = L.weightSeries(days([['2027-01-01', 80], ['2027-01-08', 70]]));
  var r = L.rollingAverage(s, 7);
  near(r[1].avg, 70);
  assert.strictEqual(r[1].n, 1);
});
test('gaten: gemiddelde over aanwezige metingen in het venster', function () {
  var s = L.weightSeries(days([['2027-01-01', 70], ['2027-01-04', 69], ['2027-01-07', 68]]));
  var r = L.rollingAverage(s, 7);
  near(r[2].avg, 69);
  assert.strictEqual(r[2].n, 3);
});

console.log('Weekverschil');
test('twee volle weken: daling van 0,4 kg', function () {
  var pairs = [];
  for (var i = 0; i < 7; i++) pairs.push([L.addDays('2027-01-01', i), 70]);
  for (var j = 0; j < 7; j++) pairs.push([L.addDays('2027-01-08', j), 69.6]);
  var c = L.weekComparison(L.weightSeries(days(pairs)), '2027-01-14');
  near(c.current.avg, 69.6);
  near(c.previous.avg, 70);
  near(c.diff, -0.4);
});
test('geen data vorige week geeft diff null', function () {
  var c = L.weekComparison(L.weightSeries(days([['2027-01-14', 69]])), '2027-01-14');
  assert.strictEqual(c.diff, null);
  near(c.current.avg, 69);
});
test('geen data deze week geeft weekAvg null maar valt terug op laatste meting', function () {
  var sum = L.weightSummary(L.weightSeries(days([['2027-01-01', 69]])), { startWeight: 70, goalWeight: 65 }, '2027-01-20');
  assert.strictEqual(sum.weekAvg, null);
  near(sum.current, 69);
  near(sum.lostSinceStart, 1);
  near(sum.toGo, 4);
});
test('samenvatting zonder streefgewicht en zonder data', function () {
  var sum = L.weightSummary([], { startWeight: 70, goalWeight: null }, '2027-01-20');
  assert.strictEqual(sum.current, null);
  assert.strictEqual(sum.lostSinceStart, null);
  assert.strictEqual(sum.toGo, null);
});

console.log('Dagdoel');
test('kcal is een limiet', function () {
  assert.strictEqual(L.goalProgress(1000, { kind: 'limit', min: 1800 }).status, 'progress');
  assert.strictEqual(L.goalProgress(1800, { kind: 'limit', min: 1800 }).status, 'done');
  assert.strictEqual(L.goalProgress(2000, { kind: 'limit', min: 1800 }).status, 'over');
  assert.strictEqual(L.goalProgress(2000, { kind: 'limit', min: 1800 }).pct, 100);
});
test('vezels als bereik 30–35', function () {
  var g = { kind: 'range', min: 30, max: 35 };
  assert.strictEqual(L.goalProgress(15, g).pct, 50);
  assert.strictEqual(L.goalProgress(32, g).status, 'done');
  assert.strictEqual(L.goalProgress(40, g).status, 'over');
  assert.strictEqual(L.goalProgress(undefined, g).status, 'empty');
});

console.log('\n' + passed + ' tests geslaagd' + (process.exitCode ? ', maar er zijn fouten' : ''));
