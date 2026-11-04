/* Scherm: Gewicht — grafiek met dagmetingen en 7-daags gemiddelde, plus kerncijfers. */
(function () {
  'use strict';

  var range = '90'; // '30' | '90' | 'all'
  var chartBox = null;

  var RANGES = [
    { id: '30', label: '4 weken' },
    { id: '90', label: '3 maanden' },
    { id: 'all', label: 'Alles' }
  ];

  function stat(label, value, sub, cls) {
    return '<div class="stat ' + (cls || '') + '">' +
      '<span class="stat-label">' + label + '</span>' +
      '<span class="stat-value">' + value + '</span>' +
      (sub ? '<span class="stat-sub muted">' + sub + '</span>' : '') +
      '</div>';
  }

  function drawChart() {
    if (!chartBox) return;
    var s = Store.settings();
    var series = Logic.weightSeries(Store.load().days);
    var rolling = Logic.rollingAverage(series, 7);
    var from = range === 'all' ? '0000-00-00' : Logic.addDays(Logic.todayKey(), -(+range - 1));
    var points = series.filter(function (p) { return p.date >= from; })
      .map(function (p) { return { date: p.date, value: p.weight }; });
    var line = rolling.filter(function (p) { return p.date >= from; })
      .map(function (p) { return { date: p.date, value: p.avg }; });

    if (!points.length) {
      chartBox.innerHTML = '<p class="muted small chart-empty">Geen metingen in deze periode.</p>';
      return;
    }
    var goal = typeof s.goalWeight === 'number' ? s.goalWeight : null;
    // Doellijn alleen tonen als die niet alles platdrukt (binnen 3 kg van de data)
    var minV = Math.min.apply(null, points.map(function (p) { return p.value; }));
    Chart.draw(chartBox, {
      points: points, line: line, goal: goal, showGoal: goal !== null && minV - goal <= 3,
      unit: ' kg', decimals: 1, height: 230, label: 'Gewichtsgrafiek'
    });
  }

  function render(el) {
    var s = Store.settings();
    var series = Logic.weightSeries(Store.load().days);
    var sum = Logic.weightSummary(series, s, Logic.todayKey());

    if (!series.length) {
      el.innerHTML =
        '<section class="card empty">' +
          '<div class="empty-mark" aria-hidden="true">♡</div>' +
          '<h2>Nog geen metingen</h2>' +
          '<p class="muted">Vul je gewicht in op het scherm Vandaag. Na een paar dagen zie je hier je dagmetingen en het 7-daags gemiddelde.</p>' +
          '<button class="btn" data-go="vandaag">Naar Vandaag</button>' +
        '</section>' +
        tipCard();
      el.querySelector('[data-go]').addEventListener('click', function () { App.go('vandaag'); });
      chartBox = null;
      return;
    }

    var diffCls = sum.weekDiff === null ? '' : (sum.weekDiff < -0.05 ? 'is-down' : (sum.weekDiff > 0.05 ? 'is-up' : ''));
    var goalSet = typeof s.goalWeight === 'number';

    el.innerHTML =
      '<section class="stats">' +
        stat('Weekgemiddelde',
          sum.weekAvg !== null ? App.fmt(sum.weekAvg, 1) + ' kg' : '–',
          sum.weekAvg !== null ? sum.weekCount + (sum.weekCount === 1 ? ' meting' : ' metingen') + ', laatste 7 dagen' : 'geen meting in de laatste 7 dagen') +
        stat('T.o.v. vorige week',
          sum.weekDiff !== null ? App.fmtSigned(sum.weekDiff, 1) + ' kg' : '–',
          sum.weekDiff !== null ? 'vorige week ' + App.fmt(sum.prevWeekAvg, 1) + ' kg' : 'nog geen twee weken data', diffCls) +
        stat('Verloren sinds start',
          sum.lostSinceStart !== null ? App.fmt(sum.lostSinceStart, 1) + ' kg' : '–',
          'start ' + App.fmt(s.startWeight, 1) + ' kg') +
        stat('Nog te gaan',
          goalSet ? (sum.toGo !== null ? App.fmt(sum.toGo, 1) + ' kg' : '–') : '–',
          goalSet ? 'doel ' + App.fmt(s.goalWeight, 1) + ' kg' : 'stel een streefgewicht in') +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<h2>Verloop</h2>' +
          '<div class="chips" role="group" aria-label="Periode">' +
            RANGES.map(function (r) {
              return '<button class="chip' + (r.id === range ? ' on' : '') + '" data-range="' + r.id + '">' + r.label + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="chart-box" data-chart></div>' +
        '<div class="legend">' +
          '<span><i class="lg-dot"></i>dagmeting</span>' +
          '<span><i class="lg-line"></i>7-daags gemiddelde</span>' +
        '</div>' +
      '</section>' +
      tipCard();

    chartBox = el.querySelector('[data-chart]');
    drawChart();

    el.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () {
        range = b.getAttribute('data-range');
        el.querySelectorAll('[data-range]').forEach(function (x) { x.classList.toggle('on', x === b); });
        drawChart();
      });
    });
  }

  function tipCard() {
    return '<section class="card soft">' +
      '<p class="small"><strong>Tip</strong> · Weeg je \'s ochtends, na het plassen en voor het ontbijt. ' +
      'Dagwaarden schommelen door vocht en zout; kijk vooral naar de lijn.</p>' +
      '</section>';
  }

  App.views.gewicht = { title: 'Gewicht', render: render, onResize: drawChart };
})();
