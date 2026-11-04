/* Scherm: Metingen — omtrekmaten in cm, met verschil en kleine grafiek per meetpunt. */
(function () {
  'use strict';

  var POINTS = [
    { key: 'waist', label: 'Taille', hint: 'smalste punt, of net boven de navel' },
    { key: 'hips', label: 'Heupen', hint: 'breedste punt van de billen' },
    { key: 'thigh', label: 'Bovenbeen', hint: 'dikste punt, altijd hetzelfde been' },
    { key: 'arm', label: 'Bovenarm', hint: 'midden tussen schouder en elleboog, ontspannen' },
    { key: 'chest', label: 'Borst', hint: 'over het breedste punt' }
  ];
  var REMIND_DAYS = 14;

  var date = null;

  function deltaText(v, label) {
    if (v === null) return '';
    var cls = v < -0.05 ? 'is-down' : (v > 0.05 ? 'is-up' : '');
    return '<span class="delta ' + cls + '">' + App.fmtSigned(v, 1) + ' cm</span> <span class="muted">' + label + '</span>';
  }

  function render(el) {
    var t = Logic.todayKey();
    if (!date || date > t) date = t;
    var list = Store.load().measurements;
    var existing = Store.measurementOn(date);
    var since = Logic.daysSinceLast(list, t);
    var html = '';

    if (since === null || since > REMIND_DAYS) {
      html += '<section class="card reminder">' +
        '<h2>' + (since === null ? 'Tijd voor je eerste meting' : 'Tijd om weer te meten') + '</h2>' +
        (since !== null ? '<p class="small muted">Je laatste meting was ' + since + ' dagen geleden.</p>' : '') +
        '<p class="spaced">Meet altijd op dezelfde plek en op hetzelfde moment, bijvoorbeeld \'s ochtends voor het ontbijt. ' +
        'Houd het lint strak maar duw niet in de huid.</p>' +
        '</section>';
    }

    html += '<section class="card">' +
      '<div class="card-head"><h2>' + (existing ? 'Meting aanpassen' : 'Nieuwe meting') + '</h2></div>' +
      '<label class="field spaced-b">' +
        '<span class="field-label">Datum</span>' +
        '<span class="input-wrap"><input type="date" data-date max="' + t + '" value="' + date + '"></span>' +
      '</label>' +
      '<div class="field-grid">' +
        POINTS.map(function (p) {
          var v = existing && typeof existing[p.key] === 'number' ? App.fmt(existing[p.key], 1) : '';
          return '<label class="field">' +
            '<span class="field-label">' + p.label + '</span>' +
            '<span class="input-wrap"><input type="text" inputmode="decimal" autocomplete="off" data-m="' + p.key +
            '" placeholder="0,0" value="' + v + '"><span class="unit">cm</span></span>' +
            '<span class="field-hint muted">' + p.hint + '</span>' +
          '</label>';
        }).join('') +
      '</div>' +
      '<button class="btn btn-block" data-save>' + (existing ? 'Bijwerken' : 'Opslaan') + '</button>' +
      '</section>';

    // Per meetpunt
    if (list.length) {
      html += '<section class="card"><h2>Per meetpunt</h2><div class="mlist">' +
        POINTS.map(function (p) {
          var st = Logic.measurementStats(list, p.key);
          if (!st.latest) return '';
          return '<div class="mrow">' +
            '<div class="mrow-main">' +
              '<span class="mrow-label">' + p.label + '</span>' +
              '<span class="mrow-value">' + App.fmt(st.latest.value, 1) + ' cm</span>' +
              '<span class="mrow-deltas small">' +
                (st.sinceFirst !== null ? deltaText(st.sinceFirst, 'sinds start') + '<br>' + deltaText(st.sincePrev, 'sinds vorige') : '<span class="muted">eerste meting</span>') +
              '</span>' +
            '</div>' +
            '<div class="mrow-spark" data-spark="' + p.key + '"></div>' +
          '</div>';
        }).join('') +
        '</div></section>';

      var sorted = list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      html += '<section class="card"><h2>Alle metingen</h2><div class="recent">' +
        sorted.map(function (m) {
          var bits = POINTS.filter(function (p) { return typeof m[p.key] === 'number'; })
            .map(function (p) { return p.label.toLowerCase() + ' ' + App.fmt(m[p.key], 1); });
          return '<div class="recent-row hist-row' + (m.date === date ? ' is-selected' : '') + '">' +
            '<button class="hist-open" data-open="' + m.date + '">' +
              '<span class="recent-date">' + App.longDate(m.date) + '</span>' +
              '<span class="recent-info">' + bits.join(' · ') + '</span>' +
            '</button>' +
            '<button class="icon-btn small-x" data-del="' + m.id + '" aria-label="Meting verwijderen">×</button>' +
          '</div>';
        }).join('') +
        '</div></section>';
    }

    el.innerHTML = html;

    el.querySelectorAll('[data-spark]').forEach(function (box) {
      Chart.spark(box, Logic.measurementStats(list, box.getAttribute('data-spark')).series, { minRange: 2 });
    });

    el.querySelector('[data-date]').addEventListener('change', function (e) {
      if (e.target.value && e.target.value <= t) { date = e.target.value; App.render(); }
    });

    el.querySelectorAll('[data-m]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var v = Logic.parseNum(inp.value);
        inp.closest('.input-wrap').classList.toggle('invalid', typeof v === 'number' && (isNaN(v) || v < 10 || v > 250) && inp.value.length > 1);
      });
    });

    el.querySelector('[data-save]').addEventListener('click', function () {
      var vals = {}, ok = true, any = false;
      el.querySelectorAll('[data-m]').forEach(function (inp) {
        var v = Logic.parseNum(inp.value);
        var bad = typeof v === 'number' && (isNaN(v) || v < 10 || v > 250);
        inp.closest('.input-wrap').classList.toggle('invalid', bad);
        if (bad) ok = false;
        vals[inp.getAttribute('data-m')] = bad ? undefined : v;
        if (typeof v === 'number' && !bad) any = true;
      });
      if (!ok) { App.toast('Controleer de gemarkeerde velden'); return; }
      if (!any) { App.toast('Vul minstens één maat in'); return; }
      Store.saveMeasurement(date, vals);
      App.toast('Meting opgeslagen');
      App.render();
    });

    el.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { date = b.getAttribute('data-open'); App.render(); });
    });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Deze meting verwijderen?')) return;
        Store.deleteMeasurement(b.getAttribute('data-del'));
        App.render();
      });
    });
  }

  App.views.metingen = { title: 'Metingen', render: render };
})();
