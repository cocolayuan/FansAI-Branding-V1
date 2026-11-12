(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.FANSAI_DATA;
  const calc = window.FansAIData;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = { organic: '#00B99E', apple: '#4A7EE8', meta: '#C4F56D', tiktok: '#C8DDFF' };
  const channelNames = { all: '全部渠道', organic: '自然渠道', apple: 'Apple Ads', meta: 'Meta', tiktok: 'TikTok' };
  const periodNames = { today: '今天', week: '近 7 天', month: '本月可用', custom: '自定义' };
  let state = { period: 'week', channel: 'all', start: data.meta.start, end: data.meta.end, metric: 'roi', selected: null };
  let hidden = new Set();
  let timer = null;
  let animationId = 0;
  let renderId = 0;
  const previous = new Map();
  const fmt = (value, digits = 2) => Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const money = (value, signed = false) => Number.isFinite(value) ? `${value < 0 ? '−' : signed ? '+' : ''}$${fmt(Math.abs(value))}` : '—';
  const percent = value => Number.isFinite(value) ? `${fmt(value)}%` : '—';
  const compact = value => !Number.isFinite(value) ? '—' : Math.abs(value) >= 1000 ? `$${fmt(value / 1000)}k` : `$${fmt(value)}`;
  const dateLabel = date => date ? date.slice(5).replace('-', '/') : '—';
  const escape = value => String(value).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  function rows() { return data.days.filter(day => day.date >= state.start && day.date <= state.end); }
  function selectedRows() { return state.selected ? rows().filter(day => day.date === state.selected) : rows(); }
  function unitMoney(value, signed) { return Number.isFinite(value) ? `<span class="unit">${value < 0 ? '−' : signed ? '+' : ''}$</span><span>${fmt(Math.abs(value))}</span>` : '—'; }
  function metricText(value, metric) { return metric === 'roi' ? percent(value) : money(value, true); }
  function summaryLabel() { return state.selected ? dateLabel(state.selected) + (state.selected === data.meta.partialDate ? ' · 累计中' : '') : '区间整体'; }
  function rangeLabel() { return state.start === state.end ? dateLabel(state.start) : `${dateLabel(state.start)}—${dateLabel(state.end)}`; }
  function setMoney(id, value, signed = false, animate = true) {
    const el = $(id);
    el.setAttribute('aria-label', money(value, signed));
    el.innerHTML = unitMoney(value, signed);
    const number = el.querySelector('span:last-child');
    if (!number || !animate || motion.matches) { previous.set(id, value); return; }
    const from = previous.has(id) ? previous.get(id) : 0;
    previous.set(id, value);
    const start = performance.now();
    const token = animationId;
    const step = now => {
      if (token !== animationId) return;
      const t = Math.min(1, (now - start) / 650);
      const current = from + (value - from) * (1 - Math.pow(1 - t, 3));
      number.textContent = fmt(Math.abs(current));
      if (t < 1) requestAnimationFrame(step);
      else number.textContent = fmt(Math.abs(value));
    };
    requestAnimationFrame(step);
  }
  function smoothPath(points) {
    if (points.length < 2) return '';
    const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
    const tangents = points.map((p, i) => {
      if (i === 0) return slopes[0];
      if (i === points.length - 1) return slopes[slopes.length - 1];
      if (slopes[i - 1] * slopes[i] <= 0) return 0;
      const avg = (slopes[i - 1] + slopes[i]) / 2;
      return Math.sign(avg) * Math.min(Math.abs(avg), 3 * Math.min(Math.abs(slopes[i - 1]), Math.abs(slopes[i])));
    });
    return points.slice(1).reduce((path, p, i) => {
      const prev = points[i], dx = (p.x - prev.x) / 3;
      return `${path} C${prev.x + dx},${prev.y + tangents[i] * dx} ${p.x - dx},${p.y - tangents[i + 1] * dx} ${p.x},${p.y}`;
    }, `M${points[0].x},${points[0].y}`);
  }
  function svgOpen(width, height, label) { return `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${escape(label)}" xmlns="http://www.w3.org/2000/svg">`; }
  function setOverview(animate = true) {
    const summary = calc.summarize(selectedRows(), state.channel);
    setMoney('profitValue', summary.profit, true, animate);
    setMoney('revenueValue', summary.revenue, false, animate);
    setMoney('costValue', summary.cost, false, animate);
    $('profitValue').style.color = summary.profit < 0 ? 'var(--loss)' : 'var(--gain)';
    $('roiValue').innerHTML = Number.isFinite(summary.roi) ? `${fmt(summary.roi)}<small>%</small>` : '—';
    const status = $('returnStatus');
    status.textContent = summary.roi === null ? '无支出' : summary.profit === 0 ? '持平' : summary.profit > 0 ? '已回本' : '未回本';
    status.classList.toggle('loss', summary.profit < 0);
    $('selectionLabel').textContent = summaryLabel();
    $('resetDay').hidden = !state.selected;
    const max = Math.max(summary.revenue, summary.cost, 1);
    const height = 116;
    ['cost', 'revenue'].forEach(key => {
      const column = $(key + 'Column');
      const h = summary[key] / max * height;
      column.style.height = `${h}px`;
      column.style.opacity = summary[key] === 0 ? '0.2' : '1';
      const cap = column.querySelector('.column-cap');
      const hasCap = key === 'revenue' ? summary.profit > 0 : summary.profit < 0;
      cap.style.height = hasCap ? `${Math.abs(summary.profit) / max * height}px` : '0px';
      cap.classList.toggle('negative', key === 'cost');
    });
    document.querySelector('.glass-columns').setAttribute('aria-label', `成本 ${money(summary.cost)}，收入 ${money(summary.revenue)}，利润 ${money(summary.profit, true)}`);
  }
  function bindChart(el, series, positions) {
    el.chartData = { series, positions };
    el.querySelectorAll('[data-day]').forEach(node => {
      node.addEventListener('click', event => {
        event.stopPropagation();
        if (el.dragged) { el.dragged = false; return; }
        chooseDay(node.dataset.day);
      });
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); chooseDay(node.dataset.day);
          el.querySelector(`[data-day="${node.dataset.day}"]`)?.focus();
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const ix = series.findIndex(day => day.date === node.dataset.day);
          const next = Math.max(0, Math.min(series.length - 1, ix + (event.key === 'ArrowRight' ? 1 : -1)));
          chooseDay(series[next].date, false);
          el.querySelector(`[data-day="${series[next].date}"]`)?.focus();
        }
      });
    });
    if (el.chartBound) return;
    el.chartBound = true;
    let pointer = false, startY = 0, startX = 0;
    el.addEventListener('pointerdown', event => { pointer = true; startY = event.clientY; startX = event.clientX; el.dragged = false; });
    el.addEventListener('pointermove', event => {
      if (!pointer || Math.abs(startY - event.clientY) > 28 || event.buttons !== 1) return;
      if (Math.abs(startX - event.clientX) < 4) return;
      if (event.pointerType !== 'mouse') { event.preventDefault(); el.setPointerCapture(event.pointerId); }
      const svg = el.querySelector('svg');
      const { series, positions } = el.chartData;
      if (!svg || !series.length) return;
      el.dragged = true;
      const box = svg.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width * svg.viewBox.baseVal.width;
      const closest = positions.reduce((best, p, i) => Math.abs(p - x) < Math.abs(positions[best] - x) ? i : best, 0);
      if (series[closest].date !== state.selected) chooseDay(series[closest].date, false);
    });
    el.addEventListener('pointerup', () => { pointer = false; });
    el.addEventListener('pointercancel', () => { pointer = false; });
    el.addEventListener('pointerleave', () => { pointer = false; });
  }
  function renderROI(animate) {
    const series = calc.series(rows(), state.channel);
    const width = 520, height = 218, left = 48, right = 500, top = 22, bottom = 190;
    const xs = series.map((_, i) => series.length === 1 ? (left + right) / 2 : left + (right - left) * i / (series.length - 1));
    const profit = state.metric === 'profit';
    const vals = series.map(d => profit ? d.profit : d.roi).filter(Number.isFinite);
    const min = profit ? Math.min(0, ...vals) * 1.18 : Math.min(80, Math.floor(Math.min(100, ...vals) / 20) * 20);
    const max = profit ? Math.max(1, ...vals) * 1.15 : Math.max(140, Math.ceil(Math.max(100, ...vals) / 20) * 20);
    const y = value => bottom - (value - min) / (max - min || 1) * (bottom - top);
    const baseline = y(profit ? 0 : 100);
    const uid = `roi-${++renderId}`;
    const lineColor = document.documentElement.dataset.theme === 'dark' ? '#94fffb' : '#078f98';
    let html = svgOpen(width, height, profit ? '每日经营利润，绿色盈利、橙色亏损' : '每日 ROI，青色已回本、橙色未回本');
    html += `<defs><clipPath id="${uid}-up"><rect x="0" y="0" width="520" height="${baseline}"/></clipPath><clipPath id="${uid}-down"><rect x="0" y="${baseline}" width="520" height="${height - baseline}"/></clipPath></defs>`;
    const ticks = profit ? [max, 0, min].filter((v, i, a) => a.indexOf(v) === i) : [max, 100, min].filter((v, i, a) => a.indexOf(v) === i);
    ticks.forEach(v => { const text = profit ? `${v < 0 ? '−' : ''}$${Math.abs(v) >= 1000 ? fmt(Math.abs(v) / 1000, 1) + 'k' : fmt(Math.abs(v), 0)}` : `${fmt(v, 0)}%`; html += `<text x="0" y="${y(v) + 4}" class="axis-label">${text}</text>`; });
    if (!vals.length) html += `<text x="282" y="111" text-anchor="middle" class="axis-label">暂无可计算 ROI</text>`;
    if (!profit) {
      let segment = [];
      const segments = [];
      series.forEach((d, i) => { if (d.roi === null) { if (segment.length) segments.push(segment); segment = []; } else segment.push({ x: xs[i], y: y(d.roi) }); });
      if (segment.length) segments.push(segment);
      segments.forEach(points => {
        const path = smoothPath(points);
        if (!path) return;
        html += `<g fill="none" stroke-width="3.2" stroke-linecap="round"><path d="${path}" stroke="${lineColor}" clip-path="url(#${uid}-up)" class="${animate ? 'data-line' : ''}"/><path d="${path}" stroke="#e38730" clip-path="url(#${uid}-down)" class="${animate ? 'data-line' : ''}"/></g>`;
      });
    }
    const barWidth = series.length === 1 ? 24 : Math.min(22, (right - left) / series.length * .36);
    series.forEach((d, i) => {
      const val = profit ? d.profit : d.roi;
      if (val === null) return;
      const yy = y(val), active = state.selected === d.date;
      const color = profit ? (val >= 0 ? '#97ffc1' : '#e38730') : val >= 100 ? lineColor : '#e38730';
      html += `<g role="button" tabindex="0" class="chart-target" data-day="${d.date}" aria-label="${dateLabel(d.date)}，${profit ? '利润' : 'ROI'} ${escape(metricText(val, state.metric))}"><title>${dateLabel(d.date)} · ${metricText(val, state.metric)}</title>`;
      if (profit && val !== 0) html += `<rect x="${xs[i] - barWidth / 2}" y="${Math.min(yy, baseline)}" width="${barWidth}" height="${Math.abs(baseline - yy)}" rx="2" fill="${color}" class="${animate ? 'enter-bar' : ''} ${val < 0 ? 'negative' : ''}" style="--delay:${i * 45}ms"/>`;
      if (!profit || active) html += `<circle cx="${xs[i]}" cy="${yy}" r="${active ? 7 : 4.5}" fill="${active ? color : 'var(--surface)'}" stroke="${color}" stroke-width="${active ? 3.5 : 2}" class="${active ? 'active-dot' : ''}"/>`;
      if (active) html += `<circle cx="${xs[i]}" cy="${yy}" r="2.5" fill="white"/>`;
      html += `<circle class="hit-circle" cx="${xs[i]}" cy="${yy}" r="17"/></g>`;
    });
    html += '</svg>';
    $('roiChart').innerHTML = html;
    bindChart($('roiChart'), series, xs);
    const focusDate = document.activeElement?.closest('#dayPicker button')?.dataset.date;
    $('dayPicker').innerHTML = series.map(d => `<button data-date="${d.date}" aria-pressed="${state.selected === d.date}" aria-label="${dateLabel(d.date)}，${d.partial ? '累计中' : d.roi === null ? '无支出' : d.profit === 0 ? '持平' : d.profit > 0 ? '盈利' : '亏损'}"><span>${d.partial ? '今天' : d.date.slice(8)}</span><i class="${d.profit < 0 ? 'loss' : d.profit === 0 ? 'neutral' : ''}"></i></button>`).join('');
    $('dayPicker').querySelectorAll('button').forEach(b => b.addEventListener('click', () => chooseDay(b.dataset.date)));
    if (focusDate) $('dayPicker').querySelector(`[data-date="${focusDate}"]`)?.focus();
    const selected = series.find(d => d.date === state.selected);
    $('trendCaption').textContent = selected ? `${dateLabel(selected.date)} · ${metricText(profit ? selected.profit : selected.roi, state.metric)}` : rangeLabel();
  }
  function renderStats() {
    const stats = calc.completedStats(rows(), state.channel);
    $('profitDays').textContent = stats.completedDays ? `${stats.profitableDays}/${stats.completedDays}` : '—';
    $('maxRoi').textContent = stats.highestROI ? fmt(stats.highestROI.value, 1) + '%' : '—';
    $('minRoi').textContent = stats.lowestROI ? fmt(stats.lowestROI.value, 1) + '%' : '—';
    $('maxDate').textContent = dateLabel(stats.highestROI?.date);
    $('minDate').textContent = dateLabel(stats.lowestROI?.date);
    $('averageMarketing').textContent = compact(stats.averageMarketing);
    $('highestMarketing').textContent = compact(stats.highestMarketing?.value);
    $('highestMarketingDate').textContent = dateLabel(stats.highestMarketing?.date);
  }
  function renderMarketing(animate) {
    const days = rows();
    const series = calc.series(days, state.channel);
    const aggregate = calc.summarize(days, state.channel);
    const activeChannels = data.channels.filter(c => state.channel === 'all' || c.id === state.channel);
    const shown = activeChannels.filter(c => !hidden.has(c.id));
    const width = 600, height = 276, left = 43, right = 554, top = 17, bottom = 235;
    const max = Math.max(100, Math.ceil(Math.max(0, ...series.map(d => d.marketing)) / 1000) * 1000);
    const maxCpi = Math.max(1, Math.ceil(Math.max(0, ...series.map(d => d.cpi || 0))));
    const y = value => bottom - value / max * (bottom - top);
    const ycpi = value => bottom - value / maxCpi * (bottom - top);
    const step = (right - left) / Math.max(1, days.length);
    const xs = days.map((_, i) => left + step * (i + .5));
    const bw = Math.min(25, step * .34);
    const uid = `mkt-${++renderId}`;
    let html = svgOpen(width, height, '每日渠道营销支出柱形图，白色点线表示右轴 CPI');
    html += `<defs><pattern id="${uid}-apple" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill="#4a7ee8"/><rect width="4" height="10" fill="#77a6ff"/></pattern></defs>`;
    [0, max / 2, max].forEach(v => { html += `<text x="0" y="${y(v) + 4}" class="axis-label">$${v >= 1000 ? fmt(v / 1000, v % 1000 ? 1 : 0) + 'k' : fmt(v, 0)}</text>`; });
    if (!hidden.has('cpi')) [0, maxCpi / 2, maxCpi].forEach(v => { html += `<text x="570" y="${ycpi(v) + 4}" class="axis-label">$${fmt(v, Number.isInteger(v) ? 0 : 1)}</text>`; });
    days.forEach((day, i) => {
      let sum = 0;
      const positive = shown.filter(c => day.channels[c.id].marketing > 0);
      positive.forEach((c, index) => {
        const value = day.channels[c.id].marketing;
        const base = sum; sum += value;
        const rawHeight = y(base) - y(sum);
        const gap = index < positive.length - 1 ? Math.min(2, rawHeight * .2) : 0;
        html += `<rect x="${xs[i] - bw / 2}" y="${y(sum) + gap}" width="${bw}" height="${Math.max(0, rawHeight - gap)}" rx="2" fill="${c.id === 'apple' ? `url(#${uid}-apple)` : colors[c.id]}" class="${animate ? 'enter-bar' : ''}" style="--delay:${i * 55}ms"/>`;
      });
      html += `<text x="${xs[i]}" y="261" class="axis-label date-tick ${i === 0 || i === Math.floor(days.length / 2) || i === days.length - 1 ? 'major' : ''}" text-anchor="middle" fill="${state.selected === day.date ? '#fff' : '#a9c0c9'}">${day.partial ? '今天' : dateLabel(day.date)}</text>`;
    });
    if (!hidden.has('cpi')) {
      let chain = [];
      function drawChain() {
        if (chain.length > 1) html += `<path d="${smoothPath(chain)}" fill="none" stroke="#edf4f2" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 7"/>`;
        chain = [];
      }
      series.forEach((d, i) => { if (d.cpi === null) drawChain(); else chain.push({ x: xs[i], y: ycpi(d.cpi) }); });
      drawChain();
      series.forEach((d, i) => { if (d.cpi !== null) html += `<circle cx="${xs[i]}" cy="${ycpi(d.cpi)}" r="${state.selected === d.date ? 6 : 4.5}" fill="#102126" stroke="#edf4f2" stroke-width="2"/>`; });
    }
    series.forEach((d, i) => { html += `<g role="button" tabindex="0" class="chart-target" data-day="${d.date}" aria-label="${dateLabel(d.date)}，营销 ${money(d.marketing)}，CPI ${d.cpi === null ? '不可用' : money(d.cpi)}"><title>${dateLabel(d.date)} · ${money(d.marketing)} · CPI ${d.cpi === null ? '—' : money(d.cpi)}</title><rect x="${xs[i] - step / 2 + 3}" y="0" width="${step - 6}" height="273" fill="transparent"/><circle class="hit-circle" cx="${xs[i]}" cy="${bottom + 22}" r="16"/></g>`; });
    html += '</svg>';
    $('marketingChart').innerHTML = html;
    bindChart($('marketingChart'), series, xs);
    $('marketingValue').innerHTML = `<span class="unit">$</span>${fmt(aggregate.marketing / 1000)}<span class="unit">k</span>`;
    $('marketingValue').setAttribute('aria-label', money(aggregate.marketing));
    $('marketingValue').title = money(aggregate.marketing);
    $('cpiValue').textContent = aggregate.cpi === null ? '—' : money(aggregate.cpi);
    $('downloadValue').textContent = fmt(aggregate.downloads, 0);
    const legendFocus = document.activeElement?.closest('#marketingLegend button')?.dataset.legend;
    $('marketingLegend').innerHTML = activeChannels.filter(c => c.id !== 'organic' || aggregate.marketing === 0).map(c => `<button data-legend="${c.id}" aria-pressed="${!hidden.has(c.id)}" aria-label="${hidden.has(c.id) ? '显示' : '隐藏'} ${c.label}"><i class="legend-key ${c.id === 'apple' ? 'apple' : ''}" style="${c.id === 'apple' ? '' : 'background:' + colors[c.id]}"></i>${c.id === 'apple' ? 'Apple' : c.label}</button>`).join('') + `<button data-legend="cpi" aria-pressed="${!hidden.has('cpi')}" aria-label="${hidden.has('cpi') ? '显示' : '隐藏'} CPI"><i class="legend-cpi"></i>CPI · 右轴</button>`;
    $('marketingLegend').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { const key = button.dataset.legend; hidden.has(key) ? hidden.delete(key) : hidden.add(key); renderMarketing(false); }));
    if (legendFocus) $('marketingLegend').querySelector(`[data-legend="${legendFocus}"]`)?.focus();
  }
  const glyphs = {
    '0':['01110','11011','11011','11011','11011','11011','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
    '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
    '$':['00100','01111','10100','01110','00101','11110','00100'], ',':['0','0','0','0','1','1','1'], '.':['0','0','0','0','0','1','1']
  };
  function renderDots(value, animate) {
    const text = '$' + fmt(value);
    let x = 1, dots = '';
    [...text].forEach((char, index) => {
      const shape = glyphs[char] || glyphs['0'];
      shape.forEach((row, rowIndex) => [...row].forEach((pixel, col) => { if (pixel === '1') dots += `<circle cx="${x + col * 4}" cy="${2 + rowIndex * 4}" r="1.35" fill="currentColor" class="${animate ? 'dot-pixel' : ''}" style="--delay:${index * 21 + rowIndex * 15}ms"/>`; }));
      x += (shape[0].length + 1.6) * 4;
    });
    $('dotNumber').innerHTML = `<svg viewBox="0 0 ${x} 30" aria-hidden="true">${dots}</svg>`;
    $('dotNumber').setAttribute('aria-label', `总收入 ${money(value)}`);
  }
  function renderRevenue(animate) {
    const aggregate = calc.summarize(selectedRows(), state.channel);
    renderDots(aggregate.revenue, animate);
    $('revenueSelectedDay').textContent = summaryLabel();
    const series = calc.series(rows(), state.channel);
    const max = Math.max(1, ...series.map(d => d.revenue));
    const width = 320, step = width / series.length, bw = Math.min(12, step * .42);
    let svg = svgOpen(width, 76, '每日收入缩略图');
    series.forEach((d, i) => { const h = d.revenue / max * 65; svg += `<rect x="${step * (i + .5) - bw / 2}" y="${70 - h}" width="${bw}" height="${h}" rx="1.5" fill="${state.selected === d.date ? '#078f98' : '#27bfd0'}" class="${animate ? 'enter-bar' : ''}" style="--delay:${i * 60}ms"/>`; });
    $('revenueMiniChart').innerHTML = svg + '</svg>';
    const channels = data.channels.filter(c => state.channel === 'all' || c.id === state.channel);
    $('channelList').innerHTML = channels.map(c => {
      const summary = calc.summarize(selectedRows(), c.id);
      const share = aggregate.revenue ? summary.revenue / aggregate.revenue * 100 : 0;
      return `<div class="channel-row"><i class="legend-key ${c.id === 'apple' ? 'apple' : ''}" style="${c.id === 'apple' ? '' : 'background:' + colors[c.id]}"></i><span>${c.label}</span><strong>${fmt(share, 1)}%</strong><div class="channel-track"><div class="channel-fill" style="width:${share}%;background:${colors[c.id]};${animate ? '' : 'animation:none;'}"></div></div></div>`;
    }).join('');
  }
  function renderTable() {
    $('dataRows').innerHTML = calc.series(rows(), state.channel).map(d => `<tr><td>${dateLabel(d.date)}${d.partial ? ' · 累计中' : ''}</td><td>${money(d.revenue)}</td><td>${money(d.cost)}</td><td>${money(d.profit, true)}</td><td>${percent(d.roi)}</td><td>${d.cpi === null ? '—' : money(d.cpi)}</td></tr>`).join('');
  }
  function render(animate = true) {
    animationId++;
    $('periodLabel').textContent = periodNames[state.period];
    $('rangeLabel').textContent = rangeLabel();
    $('channelLabel').textContent = channelNames[state.channel];
    $('marketingRange').textContent = periodNames[state.period];
    $('revenueRange').textContent = periodNames[state.period];
    setOverview(animate); renderROI(animate); renderStats(); renderMarketing(animate); renderRevenue(animate); renderTable();
  }
  function stopAuto() {
    clearInterval(timer); timer = null;
    $('autoButton').setAttribute('aria-pressed', 'false');
    $('autoButton').setAttribute('aria-label', '开启每5秒切换日期');
    $('autoButton').innerHTML = '自动轮播 <span aria-hidden="true">▷</span>';
  }
  function chooseDay(date, toggle = true, automatic = false) {
    if (!automatic) stopAuto();
    state.selected = toggle && state.selected === date ? null : date;
    animationId++;
    setOverview(true); renderROI(false); renderRevenue(false); renderMarketing(false);
    const summary = calc.summarize(selectedRows(), state.channel);
    $('chartAnnouncement').textContent = `${summaryLabel()}，经营利润 ${money(summary.profit, true)}，ROI ${percent(summary.roi)}`;
  }
  $('resetDay').addEventListener('click', () => chooseDay(state.selected));
  document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
    state.metric = button.dataset.metric;
    stopAuto();
    document.querySelectorAll('[data-metric]').forEach(b => b.setAttribute('aria-pressed', b === button ? 'true' : 'false'));
    renderROI(true);
  }));
  $('autoButton').addEventListener('click', () => {
    if (timer) { stopAuto(); return; }
    const days = rows();
    if (days.length < 2) { chooseDay(days[0].date, false); return; }
    if (motion.matches) { const index = days.findIndex(d => d.date === state.selected); chooseDay(days[(index + 1) % days.length].date, false); return; }
    $('autoButton').setAttribute('aria-pressed', 'true');
    $('autoButton').setAttribute('aria-label', '暂停日期轮播');
    $('autoButton').innerHTML = '暂停轮播 <span aria-hidden="true">Ⅱ</span>';
    timer = setInterval(() => {
      if (document.hidden) return;
      const index = days.findIndex(d => d.date === state.selected);
      chooseDay(days[(index + 1) % days.length].date, false, true);
    }, 5000);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); });
  window.addEventListener('fansai:filters', event => {
    stopAuto();
    state = { ...state, ...event.detail, selected: null };
    hidden.clear();
    render(true);
  });
  const themeIcons = {
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
  };
  function updateThemeButton() {
    const theme = document.documentElement.dataset.theme;
    $('themeButton').innerHTML = themeIcons[theme];
    $('themeButton').setAttribute('aria-label', `切换为${theme === 'light' ? '深' : '浅'}色模式`);
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#eaf2f3' : '#041015';
  }
  $('themeButton').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('fansai-chart-theme', theme); } catch (_) {}
    updateThemeButton(); renderROI(false);
  });
  $('replayButton').addEventListener('click', () => { stopAuto(); previous.clear(); render(true); });
  motion.addEventListener('change', () => { stopAuto(); render(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('filterDialog')?.open && state.selected) chooseDay(state.selected); });
  updateThemeButton(); render(true);
  window.FansAICharts = { getState: () => ({ ...state, autoplay: Boolean(timer) }), getSummary: () => calc.summarize(selectedRows(), state.channel), redraw: () => render(false) };
}());
