/* Scherm: Bijsturing — de automatische regel elke 2 weken. Regels staan in js/logic.js. */
(function () {
  'use strict';

  var R = Logic.ADJUST_RULES;

  var TEXT = {
    on_track: {
      title: 'Op koers, niets veranderen',
      body: 'Je gemiddelde daalt in een rustig tempo. Zo houd je het vol en behoud je je spier.',
      cls: 'ok'
    },
    too_slow: {
      title: 'Gemiddelde daalt te langzaam, ga 150 tot 200 kcal omlaag',
      body: 'Kijk ook even of je kcal-schattingen kloppen, vooral op dagen dat je buiten hebt gegeten.',
      cls: 'warn'
    },
    bit_fast: {
      title: 'Iets sneller dan gepland',
      body: 'Dit zit tussen op koers en te snel in. Niets veranderen is prima, maar let op je eiwit en je kracht.',
      cls: 'ok'
    },
    too_fast: {
      title: 'Je gaat te snel, eet iets meer zodat je spier behoudt',
      body: 'Te snel afvallen kost spier. Een kleine verhoging is genoeg.',
      cls: 'warn'
    }
  };

  function kgWeek(rate) {
    if (rate === null) return '–';
    // rate positief = afvallen; tonen als verandering van het gewicht
    return App.fmtSigned(-rate, 2) + ' kg per week';
  }

  function adjust(delta, checkKey) {
    var s = Store.settings();
    var from = s.kcal, to = Math.max(1200, from + delta);
    Store.updateSettings({ kcal: to });
    var d = Store.load();
    d.lastAdjust = { date: Logic.todayKey(), checkKey: checkKey, from: from, to: to };
    Store.save();
    App.toast('Dagdoel is nu ' + App.fmt(to) + ' kcal');
    App.render();
  }

  function undo() {
    var d = Store.load();
    if (!d.lastAdjust) return;
    Store.updateSettings({ kcal: d.lastAdjust.from });
    d.lastAdjust = null;
    Store.save();
    App.toast('Teruggezet');
    App.render();
  }

  function render(el) {
    var t = Logic.todayKey();
    var series = Logic.weightSeries(Store.load().days);
    var check = Logic.checkDate(series, t);
    var next = Logic.nextCheckDate(series, t);
    var html = '';

    if (!check) {
      var n = series.filter(function (p) { return p.date <= t; }).length;
      var pct = Math.min(100, (n / R.minMeasurements) * 100);
      html += '<section class="card">' +
        '<h2>Nog niet genoeg data</h2>' +
        '<p class="muted">De regel kijkt pas na twee weken wegen en minstens ' + R.minMeasurements + ' metingen. ' +
        'Weeg je zo vaak als je kunt, bij voorkeur elke ochtend.</p>' +
        '<div class="progress-row spaced">' +
          '<div class="progress-top"><span class="progress-label">Metingen</span>' +
          '<span class="progress-value">' + Math.min(n, R.minMeasurements) + ' <span class="muted">/ ' + R.minMeasurements + '</span></span></div>' +
          '<div class="bar' + (n >= R.minMeasurements ? ' bar-done' : '') + '"><span style="width:' + pct + '%"></span></div>' +
        '</div>' +
        (next ? '<p class="small muted spaced">Eerste check op ' + App.longDate(next) + '.</p>' : '') +
        '</section>';
    } else {
      var a = Logic.adjustmentAdvice(series, check);
      var last = Store.load().lastAdjust;
      var adjustedNow = last && last.checkKey === check;

      if (a.status === 'insufficient') {
        html += '<section class="card advice">' +
          '<span class="advice-date">Check van ' + App.longDate(check) + '</span>' +
          '<h2>Nog niet genoeg data</h2>' +
          '<p class="muted">Voor deze check waren er te weinig metingen: ' + a.currentN + ' in de laatste week en ' +
          a.previousN + ' in de week ervoor. Er zijn er minstens ' + R.minPerWindow + ' per week nodig.</p>' +
          '</section>';
      } else {
        var tx = TEXT[a.status];
        html += '<section class="card advice advice-' + tx.cls + '">' +
          '<span class="advice-date">Check van ' + App.longDate(check) + '</span>' +
          '<h2>' + tx.title + '</h2>' +
          '<p class="advice-rate">' + kgWeek(a.rate) + '</p>' +
          '<p class="muted small">Gemiddelde ' + App.fmt(a.previous, 1) + ' kg in de week ervoor, ' +
          App.fmt(a.current, 1) + ' kg in de laatste 7 dagen.</p>' +
          '<p class="spaced">' + tx.body + '</p>';

        if (adjustedNow) {
          html += '<div class="note spaced">Dagdoel aangepast op ' + App.dayLabel(last.date).toLowerCase() + ': ' +
            App.fmt(last.from) + ' naar ' + App.fmt(last.to) + ' kcal. ' +
            '<button class="link-btn inline" data-undo>Ongedaan maken</button></div>';
        } else if (a.status === 'too_slow') {
          var k = Store.settings().kcal;
          html += '<div class="btn-row spaced">' +
            R.kcalDown.map(function (d) {
              return '<button class="btn" data-adjust="-' + d + '">Naar ' + App.fmt(k - d) + ' kcal</button>';
            }).join('') + '</div>';
        } else if (a.status === 'too_fast') {
          html += '<div class="btn-row spaced"><button class="btn" data-adjust="' + R.kcalUp + '">Naar ' +
            App.fmt(Store.settings().kcal + R.kcalUp) + ' kcal</button></div>';
        }
        html += '</section>';
      }
    }

    // Tussenstand: dezelfde berekening op vandaag, alleen ter info
    var live = Logic.adjustmentAdvice(series, t);
    if (check && check !== t && live.rate !== null) {
      html += '<section class="card soft">' +
        '<h2>Tussenstand</h2>' +
        '<p>' + kgWeek(live.rate) + ' <span class="muted small">(laatste 7 dagen tegenover de 7 daarvoor)</span></p>' +
        '<p class="small muted spaced">Alleen ter info. De regel kijkt op de checkdag, zodat je niet op losse schommelingen reageert.' +
        (next ? ' Volgende check: ' + App.longDate(next) + '.' : '') + '</p>' +
        '</section>';
    } else if (check && next) {
      html += '<p class="small muted center">Volgende check: ' + App.longDate(next) + '</p>';
    }

    // Krachtwaarschuwing hoort hier ook bij
    var warn = App.strengthWarning();
    if (warn.warn) {
      html += '<section class="card advice advice-warn">' +
        '<h2>Je kracht daalt</h2>' +
        '<p>Bij ' + warn.names.map(App.esc).join(', ') + ' gaat je kracht omlaag. Je tekort is misschien te groot.</p>' +
        '</section>';
    }

    html += '<section class="card">' +
      '<h2>Zo werkt de regel</h2>' +
      '<ul class="rules">' +
        '<li><span>' + App.fmt(R.onTrackMin, 1) + ' – ' + App.fmt(R.onTrackMax, 1) + ' kg per week omlaag</span><span>op koers</span></li>' +
        '<li><span>minder dan ' + App.fmt(R.onTrackMin, 1) + ' kg</span><span>' + R.kcalDown[0] + '–' + R.kcalDown[1] + ' kcal omlaag</span></li>' +
        '<li><span>' + App.fmt(R.onTrackMax, 1) + ' – ' + App.fmt(R.tooFast, 1) + ' kg</span><span>iets snel, prima</span></li>' +
        '<li><span>meer dan ' + App.fmt(R.tooFast, 1) + ' kg</span><span>iets meer eten</span></li>' +
      '</ul>' +
      '<p class="small muted spaced">Elke ' + R.intervalDays + ' dagen vergelijkt de app het gemiddelde van de laatste 7 dagen met de 7 dagen daarvoor.</p>' +
      '</section>';

    el.innerHTML = html;

    el.querySelectorAll('[data-adjust]').forEach(function (b) {
      b.addEventListener('click', function () { adjust(+b.getAttribute('data-adjust'), check); });
    });
    var u = el.querySelector('[data-undo]');
    if (u) u.addEventListener('click', undo);
  }

  App.views.bijsturing = { title: 'Bijsturing', render: render };
})();
