/* Scherm: Training — weekschema, oefeningen loggen met de vorige keer erbij, krachttrend. */
(function () {
  'use strict';

  var date = null;
  var session = null; // 'benen' | 'boven' — gekozen sessie voor de geselecteerde datum
  var sessionFor = null;

  var TREND = {
    up: { label: 'omhoog', cls: 'up', arrow: '↑' },
    same: { label: 'gelijk', cls: 'same', arrow: '→' },
    down: { label: 'omlaag', cls: 'down', arrow: '↓' },
    new: { label: 'nieuw', cls: 'new', arrow: '' }
  };

  function entryText(e) {
    if (!e) return '';
    var parts = [];
    if (typeof e.weight === 'number') parts.push(App.fmt(e.weight, e.weight % 1 ? 1 : 0) + ' kg');
    if (typeof e.reps === 'number') parts.push(e.reps + ' herh');
    if (typeof e.sets === 'number') parts.push(e.sets + ' sets');
    return parts.join(' × ');
  }

  function previousEntry(exId, before) {
    var h = Store.history(exId).filter(function (e) { return e.date < before; });
    return h.length ? h[h.length - 1] : null;
  }

  // Vergelijking van wat je nu invult met de vorige keer
  function compareText(cur, prev) {
    var a = Logic.setScore(cur), b = Logic.setScore(prev);
    if (a === null || b === null) return '';
    var pct = (a - b) / b * 100;
    if (pct > 0.5) return '<span class="cmp up">hoger dan vorige keer</span>';
    if (pct < -0.5) return '<span class="cmp down">lager dan vorige keer</span>';
    return '<span class="cmp same">gelijk aan vorige keer</span>';
  }

  function exerciseCard(e, trends) {
    var cur = Store.getLog(date, e.id) || {};
    var prev = previousEntry(e.id, date);
    var tr = trends[e.id] || { trend: 'new' };
    var T = TREND[tr.trend];
    function inp(k, ph, mode) {
      var v = typeof cur[k] === 'number' ? (k === 'weight' ? App.fmt(cur[k], cur[k] % 1 ? 1 : 0) : String(cur[k])) : '';
      return '<label class="mini-field"><span class="mini-label">' + ph + '</span>' +
        '<span class="input-wrap"><input type="text" inputmode="' + mode + '" autocomplete="off" data-ex="' + e.id +
        '" data-k="' + k + '" value="' + v + '" placeholder="' + (prev && typeof prev[k] === 'number' ? (k === 'weight' ? App.fmt(prev[k], prev[k] % 1 ? 1 : 0) : prev[k]) : '–') + '"></span></label>';
    }
    return '<div class="ex" data-card="' + e.id + '">' +
      '<div class="ex-head">' +
        '<span class="ex-name">' + App.esc(e.name) + '</span>' +
        (tr.trend !== 'new' ? '<span class="trend trend-' + T.cls + '">' + T.arrow + ' ' + T.label + '</span>' : '') +
      '</div>' +
      '<div class="ex-prev small">' +
        (prev ? '<span class="muted">Vorige keer (' + Chart.shortDate(prev.date) + '):</span> <strong>' + entryText(prev) + '</strong>'
              : '<span class="muted">Nog geen eerdere keer</span>') +
        '<span class="ex-spark" data-spark="' + e.id + '"></span>' +
      '</div>' +
      '<div class="mini-grid">' + inp('weight', 'kg', 'decimal') + inp('reps', 'herh', 'numeric') + inp('sets', 'sets', 'numeric') + '</div>' +
      '<div class="ex-cmp small" data-cmp="' + e.id + '">' + compareText(cur, prev) + '</div>' +
      '</div>';
  }

  function manageHTML() {
    var ex = Store.load().exercises;
    return '<details class="card manage">' +
      '<summary><h2>Oefeningen beheren</h2></summary>' +
      Store.GROUPS.map(function (g) {
        var items = ex.filter(function (e) { return e.group === g.id; });
        return '<div class="manage-group"><h3>' + g.label + '</h3>' +
          (items.length ? items.map(function (e) {
            return '<div class="manage-row">' +
              '<span class="input-wrap"><input type="text" data-rename="' + e.id + '" value="' + App.esc(e.name) + '" aria-label="Naam"></span>' +
              '<button class="icon-btn small-x" data-move="' + e.id + '" data-dir="-1" aria-label="Omhoog">↑</button>' +
              '<button class="icon-btn small-x" data-move="' + e.id + '" data-dir="1" aria-label="Omlaag">↓</button>' +
              '<button class="icon-btn small-x" data-remove="' + e.id + '" aria-label="Verwijderen">×</button>' +
              '</div>';
          }).join('') : '<p class="small muted">Nog geen oefeningen.</p>') +
          '</div>';
      }).join('') +
      '<div class="manage-add">' +
        '<h3>Toevoegen</h3>' +
        '<span class="input-wrap"><input type="text" data-newname placeholder="Naam van de oefening"></span>' +
        '<div class="add-row">' +
          '<select data-newgroup class="select">' +
            Store.GROUPS.map(function (g) { return '<option value="' + g.id + '">' + g.label + '</option>'; }).join('') +
          '</select>' +
          '<button class="btn" data-add>Toevoegen</button>' +
        '</div>' +
      '</div>' +
      '</details>';
  }

  function render(el) {
    var t = Logic.todayKey();
    if (!date || date > t) date = t;
    var s = Store.settings();
    var planned = s.schedule[App.weekdayIndex(date)];
    if (sessionFor !== date) { session = (planned === 'benen' || planned === 'boven') ? planned : null; sessionFor = date; }
    var trends = App.strengthTrends();
    var warn = App.strengthWarning();
    var wi = App.weekdayIndex(t);
    var html = '';

    // Weekschema
    html += '<section class="card">' +
      '<h2>Weekschema</h2>' +
      '<div class="week">' +
        s.schedule.map(function (type, i) {
          return '<div class="week-day type-' + type + (i === wi ? ' is-today' : '') + '">' +
            '<span class="week-name">' + App.WEEKDAYS[i] + '</span>' +
            '<span class="week-type">' + shortType(type) + '</span></div>';
        }).join('') +
      '</div>' +
      '<p class="small muted spaced">Dagen aanpassen kan bij Instellingen.</p>' +
      '</section>';

    if (warn.warn) {
      html += '<section class="card advice advice-warn">' +
        '<h2>Je kracht daalt bij meerdere oefeningen</h2>' +
        '<p>' + warn.names.map(App.esc).join(', ') + '. Je tekort is misschien te groot. ' +
        'Kijk naar je eiwit, je slaap en het scherm Bijsturing.</p>' +
        '</section>';
    }

    // Sessie
    html += '<section class="card">' +
      '<div class="date-line">' +
        '<span><span class="field-label">' + App.dayLabel(date) + '</span>' +
        '<span class="small muted">Op schema: ' + App.typeLabel(planned).toLowerCase() + '</span></span>' +
        '<label class="chip date-chip">Andere dag<input type="date" class="date-input" data-date max="' + t + '" value="' + date + '"></label>' +
      '</div>' +
      '<div class="segmented spaced">' +
        '<button data-session="benen" class="' + (session === 'benen' ? 'on' : '') + '">Benen</button>' +
        '<button data-session="boven" class="' + (session === 'boven' ? 'on' : '') + '">Bovenlichaam</button>' +
      '</div>';

    if (!session) {
      html += '<p class="muted small">' +
        (planned === 'kickboksen' ? 'Vandaag staat kickboksen op het schema. ' : planned === 'rust' ? 'Vandaag is een rustdag. ' : '') +
        'Kies hierboven een krachtsessie als je toch wilt loggen.</p>';
    } else {
      var ex = Store.load().exercises;
      ['houding', session].forEach(function (g) {
        var items = ex.filter(function (e) { return e.group === g; });
        if (!items.length) return;
        html += '<h3 class="group-title">' + (g === 'houding' ? 'Warming-up houding' : (g === 'benen' ? 'Benen' : 'Bovenlichaam')) + '</h3>' +
          items.map(function (e) { return exerciseCard(e, trends); }).join('');
      });
      html += '<p class="small muted spaced">Vul je zwaarste werkset in. Alles wordt automatisch bewaard. ' +
        'De grijze getallen in de vakjes zijn van de vorige keer.</p>';
    }
    html += '</section>';

    html += manageHTML();
    el.innerHTML = html;

    // grafiekjes
    el.querySelectorAll('[data-spark]').forEach(function (b) {
      var tr = trends[b.getAttribute('data-spark')];
      if (tr && tr.scores.length > 1) {
        Chart.spark(b, tr.scores.map(function (x) { return { date: x.date, value: x.score }; }), { width: 70, height: 26, minRange: 1 });
      }
    });

    el.querySelector('[data-date]').addEventListener('change', function (e) {
      if (e.target.value && e.target.value <= t) { date = e.target.value; App.render(); }
    });

    el.querySelectorAll('[data-session]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-session');
        session = session === v ? null : v;
        App.render();
      });
    });

    // Loggen
    el.querySelectorAll('[data-ex]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.getAttribute('data-ex');
        var entry = {}, bad = false;
        el.querySelectorAll('[data-ex="' + id + '"]').forEach(function (x) {
          var k = x.getAttribute('data-k');
          var v = Logic.parseNum(x.value, { integer: k !== 'weight' });
          var isBad = typeof v === 'number' && isNaN(v);
          x.closest('.input-wrap').classList.toggle('invalid', isBad);
          if (isBad) bad = true; else if (v !== null) entry[k] = v;
        });
        if (bad) return;
        Store.setLog(date, id, entry);
        if (Object.keys(entry).length && Store.getDay(date).trained === undefined) Store.updateDay(date, { trained: true });
        el.querySelector('[data-cmp="' + id + '"]').innerHTML = compareText(entry, previousEntry(id, date));
        App.toast('Opgeslagen');
      });
    });

    // Beheren
    el.querySelectorAll('[data-rename]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var name = inp.value.trim();
        if (!name) { App.toast('Naam mag niet leeg zijn'); App.render(); return; }
        Store.renameExercise(inp.getAttribute('data-rename'), name);
        App.toast('Hernoemd');
        reopen();
      });
    });
    el.querySelectorAll('[data-move]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.moveExercise(b.getAttribute('data-move'), +b.getAttribute('data-dir'));
        reopen();
      });
    });
    el.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        var e = Store.load().exercises.filter(function (x) { return x.id === b.getAttribute('data-remove'); })[0];
        if (!e || !confirm('"' + e.name + '" verwijderen? Je eerdere logs blijven in de backup staan.')) return;
        Store.deleteExercise(e.id);
        reopen();
      });
    });
    el.querySelector('[data-add]').addEventListener('click', function () {
      var name = el.querySelector('[data-newname]').value.trim();
      if (!name) { App.toast('Vul een naam in'); return; }
      Store.addExercise(name, el.querySelector('[data-newgroup]').value);
      App.toast('Toegevoegd');
      reopen();
    });
  }

  // Na een wijziging in "beheren" opnieuw tekenen en het blok open laten
  function reopen() {
    var y = window.scrollY;
    App.render();
    var d = document.querySelector('.manage');
    if (d) d.open = true;
    window.scrollTo(0, y);
  }

  function shortType(type) {
    return { benen: 'Benen', boven: 'Boven', kickboksen: 'Kick', rust: 'Rust' }[type] || type;
  }

  App.views.training = { title: 'Training', render: render };
})();
