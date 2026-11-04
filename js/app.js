/*
 * Navigatie en gedeelde hulpjes voor de schermen.
 * Elk scherm registreert zich via App.views[naam] = { title, render(el) }.
 */
(function (root) {
  'use strict';

  var DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  var App = {
    views: {},
    current: null,

    fmt: function (n, dec) {
      if (n === null || n === undefined || !isFinite(n)) return '–';
      dec = dec === undefined ? 0 : dec;
      return n.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    },

    // Met teken, en een echt minteken.
    fmtSigned: function (n, dec) {
      if (n === null || n === undefined || !isFinite(n)) return '–';
      var r = Math.abs(n) < Math.pow(10, -(dec || 0)) / 2 ? 0 : n;
      var s = App.fmt(Math.abs(r), dec);
      return (r > 0 ? '+' : r < 0 ? '−' : '±') + s;
    },

    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    // "Vandaag", "Gisteren" of "ma 2 nov"
    dayLabel: function (key) {
      var t = Logic.todayKey();
      if (key === t) return 'Vandaag';
      if (key === Logic.addDays(t, -1)) return 'Gisteren';
      var d = Logic.parseKey(key);
      return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    },

    longDate: function (key) {
      var d = Logic.parseKey(key);
      return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    },

    go: function (name) {
      if (location.hash !== '#' + name) location.hash = name;
      else App.render();
    },

    render: function () {
      var name = (location.hash || '').replace('#', '') || 'vandaag';
      if (!App.views[name]) name = 'vandaag';
      App.current = name;
      var view = App.views[name];
      var main = document.getElementById('view');
      main.innerHTML = '';
      view.render(main);
      document.querySelectorAll('[data-route]').forEach(function (b) {
        var on = b.getAttribute('data-route') === name;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      });
      window.scrollTo(0, 0);
    },

    // Klein bericht onderin ("Opgeslagen")
    toast: function (msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(App._toastTimer);
      App._toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1400);
    }
  };

  // Placeholder voor schermen die nog komen
  function soon(title) {
    return {
      title: title,
      render: function (el) {
        el.innerHTML = '<section class="card empty"><h2>' + title + '</h2>' +
          '<p class="muted">Dit scherm komt in de volgende stap.</p></section>';
      }
    };
  }
  App.views.bijsturing = soon('Bijsturing');
  App.views.metingen = soon('Metingen');
  App.views.training = soon('Training');
  App.views.instellingen = soon('Instellingen');

  window.addEventListener('hashchange', function () { App.render(); });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var v = App.views[App.current];
      if (v && v.onResize) v.onResize();
    }, 150);
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-route]').forEach(function (b) {
      b.addEventListener('click', function () { App.go(b.getAttribute('data-route')); });
    });
    App.render();
  });

  root.App = App;
})(this);
