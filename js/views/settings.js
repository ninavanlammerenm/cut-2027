/* Scherm: Instellingen — doelen, streefgewicht, weekschema, backup. */
(function () {
  'use strict';

  var GROUPS = [
    {
      title: 'Lichaam', fields: [
        { key: 'heightCm', label: 'Lengte', unit: 'cm', min: 120, max: 220 },
        { key: 'startWeight', label: 'Startgewicht', unit: 'kg', decimal: true, min: 30, max: 250 },
        { key: 'goalWeight', label: 'Streefgewicht', unit: 'kg', decimal: true, min: 30, max: 250, optional: true }
      ]
    },
    {
      title: 'Dagdoel', fields: [
        { key: 'kcal', label: 'Kcal', unit: 'kcal', min: 1000, max: 4000, wide: true },
        { key: 'protein', label: 'Eiwit', unit: 'g', min: 20, max: 300, wide: true },
        { key: 'fiberMin', label: 'Vezels vanaf', unit: 'g', min: 0, max: 100 },
        { key: 'fiberMax', label: 'Vezels tot', unit: 'g', min: 0, max: 100 },
        { key: 'stepsMin', label: 'Stappen vanaf', unit: '', min: 0, max: 50000 },
        { key: 'stepsMax', label: 'Stappen tot', unit: '', min: 0, max: 50000 }
      ]
    }
  ];
  var ALL = GROUPS[0].fields.concat(GROUPS[1].fields);
  var DAYNAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

  function val(f, v) {
    if (typeof v !== 'number') return '';
    return f.decimal ? App.fmt(v, 1) : String(v);
  }

  function render(el) {
    var s = Store.settings();
    var counts = schedCounts(s.schedule);
    var html = GROUPS.map(function (g) {
      return '<section class="card"><h2>' + g.title + '</h2><div class="field-grid">' +
        g.fields.map(function (f) {
          return '<label class="field' + (f.wide ? ' field-wide' : '') + '">' +
            '<span class="field-label">' + f.label + (f.optional ? ' <span class="muted">(optioneel)</span>' : '') + '</span>' +
            '<span class="input-wrap"><input type="text" inputmode="' + (f.decimal ? 'decimal' : 'numeric') + '" autocomplete="off" data-set="' + f.key +
            '" value="' + val(f, s[f.key]) + '" placeholder="' + (f.optional ? 'nog niet ingesteld' : '') + '">' +
            (f.unit ? '<span class="unit">' + f.unit + '</span>' : '') + '</span>' +
          '</label>';
        }).join('') + '</div>' +
        (g.title === 'Lichaam' ? bmiLine(s) : '') +
        '</section>';
    }).join('');

    html += '<section class="card"><h2>Weekschema</h2>' +
      '<div class="sched">' +
        DAYNAMES.map(function (d, i) {
          return '<label class="sched-row"><span>' + d + '</span>' +
            '<select class="select" data-day="' + i + '">' +
              Store.DAY_TYPES.map(function (t) {
                return '<option value="' + t.id + '"' + (s.schedule[i] === t.id ? ' selected' : '') + '>' + t.label + '</option>';
              }).join('') +
            '</select></label>';
        }).join('') +
      '</div>' +
      '<p class="small muted spaced">Nu: ' + counts + '.</p>' +
      '</section>';

    var lastExport = s.lastExport ? App.longDate(s.lastExport) : 'nog nooit';
    html += '<section class="card"><h2>Backup</h2>' +
      '<p class="small muted">Je gegevens staan alleen in deze browser. Maak af en toe een backup en bewaar het bestand ergens veilig, bijvoorbeeld in iCloud of Google Drive.</p>' +
      '<p class="small spaced">Laatste backup: <strong>' + lastExport + '</strong></p>' +
      '<div class="btn-col spaced">' +
        '<button class="btn btn-block" data-export>Exporteren als JSON</button>' +
        '<label class="btn btn-block btn-soft">Importeren uit JSON<input type="file" accept=".json,application/json" data-import hidden></label>' +
      '</div>' +
      '</section>';

    html += '<section class="card soft"><h2>Alles wissen</h2>' +
      '<p class="small muted">Verwijdert alle dagen, metingen en trainingen uit deze browser. Maak eerst een backup.</p>' +
      '<button class="link-btn danger" data-reset>Alles wissen</button>' +
      '</section>';

    el.innerHTML = html;

    el.querySelectorAll('[data-set]').forEach(function (inp) {
      var f = ALL.filter(function (x) { return x.key === inp.getAttribute('data-set'); })[0];
      inp.addEventListener('change', function () {
        var v = Logic.parseNum(inp.value, { integer: !f.decimal });
        var wrap = inp.closest('.input-wrap');
        if (v === null) {
          if (!f.optional) { wrap.classList.add('invalid'); App.toast('Dit veld is nodig'); return; }
        } else if (isNaN(v) || v < f.min || v > f.max) {
          wrap.classList.add('invalid'); App.toast('Kies een waarde tussen ' + App.fmt(f.min) + ' en ' + App.fmt(f.max)); return;
        }
        wrap.classList.remove('invalid');
        var upd = {}; upd[f.key] = v;
        Store.updateSettings(upd);
        // min/max van een bereik in de goede volgorde houden
        var st = Store.settings();
        if (st.fiberMin > st.fiberMax) Store.updateSettings({ fiberMax: st.fiberMin });
        if (st.stepsMin > st.stepsMax) Store.updateSettings({ stepsMax: st.stepsMin });
        App.toast('Opgeslagen');
        if (/fiber|steps|heightCm|goalWeight|startWeight/.test(f.key)) keepScroll();
      });
    });

    el.querySelectorAll('[data-day]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var sch = Store.settings().schedule.slice();
        sch[+sel.getAttribute('data-day')] = sel.value;
        Store.updateSettings({ schedule: sch });
        App.toast('Schema bijgewerkt');
        keepScroll();
      });
    });

    el.querySelector('[data-export]').addEventListener('click', function () {
      var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cut2027-backup-' + Logic.todayKey() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      Store.updateSettings({ lastExport: Logic.todayKey() });
      keepScroll();
    });

    el.querySelector('[data-import]').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!confirm('Importeren vervangt alles wat nu in de app staat. Doorgaan?')) { e.target.value = ''; return; }
      var r = new FileReader();
      r.onload = function () {
        var err = Store.importJSON(r.result);
        if (err) { alert(err); e.target.value = ''; return; }
        App.toast('Backup teruggezet');
        App.render();
      };
      r.readAsText(file);
    });

    el.querySelector('[data-reset]').addEventListener('click', function () {
      if (!confirm('Weet je het zeker? Alle gegevens in deze browser worden gewist.')) return;
      if (!confirm('Echt alles wissen? Dit kan niet ongedaan worden gemaakt.')) return;
      Store.reset();
      App.toast('Alles gewist');
      App.go('vandaag');
    });
  }

  function bmiLine(s) {
    var b = Logic.bmi(s.startWeight, s.heightCm);
    var g = typeof s.goalWeight === 'number' ? Logic.bmi(s.goalWeight, s.heightCm) : null;
    if (!b) return '';
    return '<p class="small muted spaced">Ter info: BMI bij start ' + App.fmt(b, 1) +
      (g ? ', bij streefgewicht ' + App.fmt(g, 1) : '') + '.</p>';
  }

  function schedCounts(sch) {
    var c = {};
    sch.forEach(function (t) { c[t] = (c[t] || 0) + 1; });
    return Store.DAY_TYPES.filter(function (t) { return c[t.id]; })
      .map(function (t) { return c[t.id] + '× ' + t.label.toLowerCase(); }).join(', ');
  }

  function keepScroll() {
    var y = window.scrollY;
    App.render();
    window.scrollTo(0, y);
  }

  App.views.instellingen = { title: 'Instellingen', render: render };
})();
