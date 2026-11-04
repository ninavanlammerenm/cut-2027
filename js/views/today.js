/* Scherm: Vandaag — dagelijkse invoer en voortgang t.o.v. het dagdoel. */
(function () {
  'use strict';

  var selected = null; // 'YYYY-MM-DD'

  var FIELDS = [
    { key: 'weight', label: 'Gewicht', unit: 'kg', decimal: true, placeholder: '0,0', optional: true },
    { key: 'kcal', label: 'Kcal', unit: 'kcal', placeholder: '0' },
    { key: 'protein', label: 'Eiwit', unit: 'g', placeholder: '0' },
    { key: 'fiber', label: 'Vezels', unit: 'g', placeholder: '0' },
    { key: 'steps', label: 'Stappen', unit: '', placeholder: '0' }
  ];

  function goals(s) {
    return {
      kcal: { kind: 'limit', min: s.kcal, label: 'Kcal', unit: 'kcal' },
      protein: { kind: 'min', min: s.protein, label: 'Eiwit', unit: 'g' },
      fiber: { kind: 'range', min: s.fiberMin, max: s.fiberMax, label: 'Vezels', unit: 'g' },
      steps: { kind: 'range', min: s.stepsMin, max: s.stepsMax, label: 'Stappen', unit: '' }
    };
  }

  function inputValue(f, v) {
    if (v === undefined || v === null) return '';
    return f.decimal ? App.fmt(v, 1) : String(v);
  }

  function targetText(g) {
    var u = g.unit ? ' ' + g.unit : '';
    if (g.kind === 'range') return App.fmt(g.min) + '–' + App.fmt(g.max) + u;
    return App.fmt(g.min) + u;
  }

  function statusText(value, g, p) {
    var u = g.unit ? ' ' + g.unit : '';
    if (p.status === 'empty') return 'nog niets ingevuld';
    if (g.kind === 'limit') {
      if (value > g.min) return App.fmt(value - g.min) + u + ' boven doel';
      return 'nog ' + App.fmt(g.min - value) + u + ' ruimte';
    }
    if (p.status === 'done') return 'doel gehaald';
    if (p.status === 'over') return 'boven bereik';
    return 'nog ' + App.fmt(g.min - value) + u;
  }

  function renderProgress(box) {
    var s = Store.settings();
    var day = Store.getDay(selected);
    var gs = goals(s);
    box.innerHTML = Object.keys(gs).map(function (k) {
      var g = gs[k];
      var v = day[k];
      var p = Logic.goalProgress(v, g);
      return '<div class="progress-row">' +
        '<div class="progress-top"><span class="progress-label">' + g.label + '</span>' +
        '<span class="progress-value">' + (v === undefined ? '–' : App.fmt(v)) +
        ' <span class="muted">/ ' + targetText(g) + '</span></span></div>' +
        '<div class="bar bar-' + p.status + '"><span style="width:' + p.pct.toFixed(1) + '%"></span></div>' +
        '<div class="progress-status muted">' + statusText(v, g, p) + '</div>' +
        '</div>';
    }).join('');
  }

  function renderRecent(box) {
    var days = Store.load().days;
    var t = Logic.todayKey();
    var keys = Object.keys(days).filter(function (k) { return k <= t; }).sort().reverse().slice(0, 10);
    if (!keys.length) {
      box.innerHTML = '<p class="muted small">Hier verschijnen de dagen die je invult. Tik op een dag om hem aan te passen.</p>';
      return;
    }
    box.innerHTML = keys.map(function (k) {
      var d = days[k];
      var bits = [];
      if (d.weight !== undefined) bits.push(App.fmt(d.weight, 1) + ' kg');
      if (d.kcal !== undefined) bits.push(App.fmt(d.kcal) + ' kcal');
      if (d.protein !== undefined) bits.push(App.fmt(d.protein) + ' g eiwit');
      var tags = '';
      if (d.trained === true) tags += '<span class="tag tag-train">training</span>';
      if (d.ateOut) tags += '<span class="tag tag-out">buiten gegeten</span>';
      return '<button class="recent-row' + (k === selected ? ' is-selected' : '') + '" data-day="' + k + '">' +
        '<span class="recent-date">' + App.dayLabel(k) + '</span>' +
        '<span class="recent-info">' + (bits.join(' · ') || '<span class="muted">alleen vlaggen</span>') + '</span>' +
        (tags ? '<span class="recent-tags">' + tags + '</span>' : '') +
        '</button>';
    }).join('');
    box.querySelectorAll('[data-day]').forEach(function (b) {
      b.addEventListener('click', function () {
        selected = b.getAttribute('data-day');
        App.render();
      });
    });
  }

  function render(el) {
    var t = Logic.todayKey();
    if (!selected || selected > t) selected = t;
    var day = Store.getDay(selected);
    var isToday = selected === t;

    el.innerHTML =
      '<section class="card datebar">' +
        '<button class="icon-btn" data-shift="-1" aria-label="Vorige dag">' + chevron('left') + '</button>' +
        '<label class="date-center">' +
          '<span class="date-main">' + App.dayLabel(selected) + '</span>' +
          '<span class="date-sub muted">' + (isToday ? App.longDate(selected) : 'tik om een datum te kiezen') + '</span>' +
          '<input type="date" class="date-input" max="' + t + '" value="' + selected + '" aria-label="Kies datum">' +
        '</label>' +
        '<button class="icon-btn" data-shift="1" aria-label="Volgende dag"' + (isToday ? ' disabled' : '') + '>' + chevron('right') + '</button>' +
      '</section>' +
      (!isToday ? '<button class="link-btn back-today" data-today>Terug naar vandaag</button>' : '') +

      '<section class="card">' +
        '<h2>Invullen</h2>' +
        '<div class="field-grid">' +
          FIELDS.map(function (f) {
            return '<label class="field' + (f.key === 'weight' ? ' field-wide' : '') + '">' +
              '<span class="field-label">' + f.label + (f.optional ? ' <span class="muted">(optioneel)</span>' : '') + '</span>' +
              '<span class="input-wrap">' +
                '<input type="text" inputmode="' + (f.decimal ? 'decimal' : 'numeric') + '" autocomplete="off" ' +
                'data-field="' + f.key + '" placeholder="' + f.placeholder + '" value="' + inputValue(f, day[f.key]) + '">' +
                (f.unit ? '<span class="unit">' + f.unit + '</span>' : '') +
              '</span>' +
            '</label>';
          }).join('') +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Training gedaan <span class="muted">· schema: ' +
            App.typeLabel(Store.settings().schedule[App.weekdayIndex(selected)]).toLowerCase() + '</span></span>' +
          '<div class="segmented" role="group" aria-label="Training gedaan">' +
            '<button data-trained="yes" class="' + (day.trained === true ? 'on' : '') + '" aria-pressed="' + (day.trained === true) + '">Ja</button>' +
            '<button data-trained="no" class="' + (day.trained === false ? 'on' : '') + '" aria-pressed="' + (day.trained === false) + '">Nee</button>' +
          '</div>' +
        '</div>' +

        '<label class="switch-row">' +
          '<span><span class="field-label">Buiten gegeten</span>' +
          '<span class="muted small">Kcal is die dag een schatting</span></span>' +
          '<input type="checkbox" class="switch" data-out' + (day.ateOut ? ' checked' : '') + '>' +
        '</label>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Dagdoel</h2>' +
        '<div data-progress></div>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Afgelopen dagen</h2>' +
        '<div class="recent" data-recent></div>' +
      '</section>';

    var progressBox = el.querySelector('[data-progress]');
    var recentBox = el.querySelector('[data-recent]');
    renderProgress(progressBox);
    renderRecent(recentBox);

    // Datum wisselen
    el.querySelectorAll('[data-shift]').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = Logic.addDays(selected, +b.getAttribute('data-shift'));
        if (next <= t) { selected = next; App.render(); }
      });
    });
    var di = el.querySelector('.date-input');
    di.addEventListener('change', function () {
      if (di.value && di.value <= t) { selected = di.value; App.render(); }
    });
    var bt = el.querySelector('[data-today]');
    if (bt) bt.addEventListener('click', function () { selected = t; App.render(); });

    // Getallen: opslaan tijdens typen
    el.querySelectorAll('[data-field]').forEach(function (inp) {
      var f = FIELDS.filter(function (x) { return x.key === inp.getAttribute('data-field'); })[0];
      function commit(final) {
        var v = Logic.parseNum(inp.value, { integer: !f.decimal });
        var bad = typeof v === 'number' && (isNaN(v) || (f.key === 'weight' && (v < 20 || v > 300)));
        // Tijdens het typen van een gewicht (bijv. "6") nog niet als fout markeren
        var typingWeight = !final && f.key === 'weight' && typeof v === 'number' && !isNaN(v) && v < 20;
        inp.closest('.input-wrap').classList.toggle('invalid', bad && !typingWeight);
        if (bad) return;
        var upd = {}; upd[f.key] = v;
        Store.updateDay(selected, upd);
        renderProgress(progressBox);
        if (final) { renderRecent(recentBox); App.toast('Opgeslagen'); }
      }
      inp.addEventListener('input', function () { commit(false); });
      inp.addEventListener('change', function () { commit(true); });
    });

    // Training ja/nee — nogmaals tikken wist de keuze
    el.querySelectorAll('[data-trained]').forEach(function (b) {
      b.addEventListener('click', function () {
        var want = b.getAttribute('data-trained') === 'yes';
        var cur = Store.getDay(selected).trained;
        Store.updateDay(selected, { trained: cur === want ? null : want });
        el.querySelectorAll('[data-trained]').forEach(function (x) {
          var on = Store.getDay(selected).trained === (x.getAttribute('data-trained') === 'yes');
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', on);
        });
        renderRecent(recentBox);
        App.toast('Opgeslagen');
      });
    });

    el.querySelector('[data-out]').addEventListener('change', function (e) {
      Store.updateDay(selected, { ateOut: e.target.checked });
      renderRecent(recentBox);
      App.toast('Opgeslagen');
    });
  }

  function chevron(dir) {
    var d = dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7';
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + d +
      '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  App.views.vandaag = { title: 'Vandaag', render: render };
})();
