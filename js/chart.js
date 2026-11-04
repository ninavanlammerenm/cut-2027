/*
 * Eenvoudige SVG-lijngrafiek, zonder externe library.
 * Chart.weight(container, { points, line, goal, height })
 *   points: [{date, value}]  losse metingen (stippen)
 *   line:   [{date, value}]  voortschrijdend gemiddelde (lijn)
 *   goal:   getal of null    stippellijn
 */
(function (root) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function fmt(v, dec) {
    return v.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function shortDate(key) {
    var d = Logic.parseKey(key);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  // Mooie stapgrootte voor de y-as.
  function niceStep(range, maxTicks) {
    var steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (var i = 0; i < steps.length; i++) {
      if (range / steps[i] <= maxTicks) return steps[i];
    }
    return steps[steps.length - 1];
  }

  function draw(container, opts) {
    container.innerHTML = '';
    var all = (opts.points || []).concat(opts.line || []);
    if (!all.length) return;

    var W = Math.max(260, container.clientWidth || 320);
    var H = opts.height || 220;
    var pad = { l: 38, r: 10, t: 12, b: 26 };
    var unit = opts.unit || '';
    var dec = opts.decimals === undefined ? 1 : opts.decimals;

    // x-domein in dagen
    var dates = all.map(function (p) { return p.date; }).sort();
    var x0 = dates[0], x1 = dates[dates.length - 1];
    var span = Logic.daysBetween(x0, x1);
    var padDays = span < 6 ? Math.ceil((6 - span) / 2) : 0;
    x0 = Logic.addDays(x0, -padDays);
    x1 = Logic.addDays(x1, padDays);
    span = Math.max(1, Logic.daysBetween(x0, x1));

    // y-domein
    var vals = all.map(function (p) { return p.value; });
    if (typeof opts.goal === 'number' && opts.showGoal) vals.push(opts.goal);
    var yMin = Math.min.apply(null, vals), yMax = Math.max.apply(null, vals);
    var minRange = opts.minRange || 2;
    if (yMax - yMin < minRange) {
      var mid = (yMax + yMin) / 2;
      yMin = mid - minRange / 2; yMax = mid + minRange / 2;
    }
    var step = niceStep(yMax - yMin, 4);
    yMin = Math.floor(yMin / step) * step;
    yMax = Math.ceil(yMax / step) * step;
    if (yMax === yMin) yMax = yMin + step;

    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    function X(key) { return pad.l + (Logic.daysBetween(x0, key) / span) * iw; }
    function Y(v) { return pad.t + (1 - (v - yMin) / (yMax - yMin)) * ih; }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H,
      role: 'img', 'aria-label': opts.label || 'grafiek', class: 'chart'
    }, container);

    // rasterlijnen + y-labels
    var g = el('g', { class: 'chart-grid' }, svg);
    var ydec = step < 1 ? 1 : 0;
    for (var v = yMin; v <= yMax + 1e-9; v += step) {
      var y = Y(v);
      el('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y }, g);
      var t = el('text', { x: pad.l - 6, y: y + 4, 'text-anchor': 'end', class: 'chart-label' }, g);
      t.textContent = fmt(v, ydec);
    }

    // x-labels: maximaal 4
    var nLabels = Math.min(4, span + 1);
    for (var i = 0; i < nLabels; i++) {
      var key = Logic.addDays(x0, Math.round((span * i) / Math.max(1, nLabels - 1)));
      var tx = el('text', {
        x: X(key), y: H - 6, class: 'chart-label',
        'text-anchor': i === 0 ? 'start' : (i === nLabels - 1 ? 'end' : 'middle')
      }, g);
      tx.textContent = shortDate(key);
    }

    // streeflijn
    if (typeof opts.goal === 'number' && opts.showGoal) {
      var gy = Y(opts.goal);
      el('line', { x1: pad.l, x2: W - pad.r, y1: gy, y2: gy, class: 'chart-goal' }, svg);
      var gt = el('text', { x: W - pad.r, y: gy - 5, 'text-anchor': 'end', class: 'chart-label chart-goal-label' }, svg);
      gt.textContent = 'doel ' + fmt(opts.goal, dec) + unit;
    }

    // stippen
    var dots = el('g', { class: 'chart-dots' }, svg);
    (opts.points || []).forEach(function (p) {
      var c = el('circle', { cx: X(p.date), cy: Y(p.value), r: 3.5 }, dots);
      var title = el('title', {}, c);
      title.textContent = shortDate(p.date) + ': ' + fmt(p.value, dec) + unit;
    });

    // lijn
    var line = opts.line || [];
    if (line.length > 1) {
      var d = line.map(function (p, i) {
        return (i ? 'L' : 'M') + X(p.date).toFixed(1) + ' ' + Y(p.value).toFixed(1);
      }).join(' ');
      el('path', { d: d, class: 'chart-line' }, svg);
    }
    if (line.length) {
      var last = line[line.length - 1];
      el('circle', { cx: X(last.date), cy: Y(last.value), r: 4.5, class: 'chart-line-end' }, svg);
    }
  }

  root.Chart = { draw: draw, shortDate: shortDate };
})(this);
