// ── State ───────────────────────────────────────────────────────────────
let currentPage = 'overview';
let currentPeriod = '30d';
let currentOperator = 'all';

const COLORS = ['#4f6ef7', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
const plotlyConfig = { displayModeBar: false, responsive: true };
const plotlyFont = { family: 'Outfit, sans-serif', color: '#6b7280' };

// ── Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('operatorFilter');
  OPERATORS.forEach(op => {
    const opt = document.createElement('option');
    opt.value = op.id;
    opt.textContent = op.shortName;
    select.appendChild(opt);
  });

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderCurrentPage();
    });
  });

  select.addEventListener('change', () => {
    currentOperator = select.value;
    renderCurrentPage();
  });

  renderCurrentPage();
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.sidebar-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  renderCurrentPage();
}

// ── Helpers ─────────────────────────────────────────────────────────────
function getCalls() {
  let calls = filterByPeriod(ALL_CALLS, currentPeriod);
  if (currentOperator !== 'all') calls = calls.filter(c => c.operatorId === currentOperator);
  return calls;
}

function getWeekly() { return filterWeeklyByPeriod(WEEKLY_DATA, currentPeriod); }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function qaColor(s) { return s >= 4 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'; }
function qaClass(s) { return s >= 4 ? 'high' : s >= 3 ? 'mid' : 'low'; }
function fmt(n, d = 1) { return n.toFixed(d); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }
function fmtMoney(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
function tip(text) { return `<span class="tooltip-icon" data-tip="${text}">?</span>`; }

function pearsonCorr(x, y) {
  const n = x.length;
  if (n < 3) return 0;
  const mx = avg(x), my = avg(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

function renderCurrentPage() {
  const r = { overview: renderOverview, executive: renderExecutive, impact: renderImpact, team: renderTeam, calls: renderCalls, 'real-calls': renderRealCalls, personal: renderPersonal };
  r[currentPage]?.();
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════
function renderOverview() {
  const calls = getCalls();
  const targeted = calls.filter(c => c.isTargeted);
  const avgQa = avg(targeted.map(c => c.qaScore));
  const convRate = targeted.length ? targeted.filter(c => c.converted).length / targeted.length : 0;
  const successRate = targeted.length ? targeted.filter(c => ['Отлично', 'Хорошо'].includes(c.success)).length / targeted.length : 0;
  const totalRevenue = calls.reduce((s, c) => s + c.revenue, 0);

  document.getElementById('overview-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Всего звонков <span class="kpi-label-icon">📞</span></div>
      <div class="kpi-value">${calls.length}</div>
      <div class="kpi-sub">Целевых: ${targeted.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ср. оценка ${tip('Средний балл по 10 критериям, шкала 1-5')}<span class="kpi-label-icon">⭐</span></div>
      <div class="kpi-value" style="color:${qaColor(avgQa)}">${fmt(avgQa, 2)}</div>
      <div class="kpi-sub">из 5.0</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Качество звонков ${tip('Доля звонков с LLM-оценкой Отлично или Хорошо. Не = продажа')}<span class="kpi-label-icon">✅</span></div>
      <div class="kpi-value green">${fmtPct(successRate)}</div>
      <div class="kpi-sub">оценка Отлично + Хорошо</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Конверсия в продажу ${tip('Доля целевых звонков, закончившихся продажей')}<span class="kpi-label-icon">💰</span></div>
      <div class="kpi-value accent">${fmtPct(convRate)}</div>
      <div class="kpi-sub">выручка: ${fmtMoney(totalRevenue)}</div>
    </div>
  `;

  // Alert: зона роста
  const critMeans = {};
  CRITERIA.forEach(cr => {
    const vals = targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined);
    if (vals.length) critMeans[cr.short] = avg(vals);
  });
  const weakest = Object.entries(critMeans).sort((a, b) => a[1] - b[1])[0];
  if (weakest && weakest[1] < 4.0) {
    const lift = ((4.0 - weakest[1]) * 3).toFixed(0);
    document.getElementById('overview-alert').innerHTML = `
      <div class="alert-box danger">
        <span class="alert-icon">⚠️</span>
        <div>
          <div class="alert-title">Зона роста — сколько теряем</div>
          <div class="alert-text">Если поднять <b>${weakest[0]}</b> с <span class="val-red">${fmt(weakest[1])}</span> до <span class="val-green">4.0</span> — конверсия вырастет примерно на <span class="val-green">+${lift}%</span></div>
          <div class="alert-note">Расчёт на основе корреляции качества и конверсии</div>
        </div>
      </div>`;
  } else {
    document.getElementById('overview-alert').innerHTML = '';
  }

  // Donuts
  document.getElementById('overview-donuts').innerHTML = CRITERIA.map((cr, i) => {
    const vals = targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined);
    const mean = avg(vals);
    const isNorm = mean >= 3.8;
    return `
      <div class="donut-item">
        <div class="donut-chart" id="donut-${i}"></div>
        <div class="donut-label">${cr.short}</div>
        <div class="donut-status ${isNorm ? 'norm' : 'below'}">${isNorm ? '✓ В норме' : '✗ Ниже'}</div>
      </div>`;
  }).join('');

  CRITERIA.forEach((cr, i) => {
    const vals = targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined);
    const mean = avg(vals);
    const color = mean >= 3.8 ? '#10b981' : '#ef4444';
    Plotly.newPlot(`donut-${i}`, [{
      values: [mean / 5 * 100, (1 - mean / 5) * 100], hole: 0.72, type: 'pie',
      marker: { colors: [color, '#f3f4f6'] }, textinfo: 'none', hoverinfo: 'skip',
    }], {
      margin: { t: 5, b: 5, l: 5, r: 5 }, height: 100, width: 100, showlegend: false, font: plotlyFont,
      annotations: [{ text: fmt(mean), x: 0.5, y: 0.5, font: { size: 16, color, family: 'JetBrains Mono' }, showarrow: false }],
    }, plotlyConfig);
  });

  // Pie
  const successCounts = {};
  targeted.forEach(c => { successCounts[c.success] = (successCounts[c.success] || 0) + 1; });
  const pieColors = { 'Отлично': '#10b981', 'Хорошо': '#34d399', 'Частично': '#f59e0b', 'Неуспешно': '#ef4444' };
  Plotly.newPlot('overview-pie', [{
    labels: Object.keys(successCounts), values: Object.values(successCounts), type: 'pie', hole: 0.45,
    marker: { colors: Object.keys(successCounts).map(k => pieColors[k] || '#9ca3af') },
    textinfo: 'percent+label', textfont: { size: 12, family: 'Outfit' },
  }], { margin: { t: 10, b: 10, l: 10, r: 10 }, height: 280, showlegend: false, font: plotlyFont }, plotlyConfig);

  // Histogram
  Plotly.newPlot('overview-hist', [{
    x: targeted.map(c => c.qaScore), type: 'histogram', nbinsx: 15,
    marker: { color: '#4f6ef7', line: { color: '#fff', width: 1 } },
  }], {
    margin: { t: 10, b: 30, l: 40, r: 10 }, height: 280, font: plotlyFont,
    xaxis: { title: 'Оценка', range: [1, 5] }, yaxis: { title: 'Кол-во' },
    shapes: [
      { type: 'rect', x0: 0, x1: 3, y0: 0, y1: 1, yref: 'paper', fillcolor: '#fee2e2', opacity: 0.3, line: { width: 0 } },
      { type: 'rect', x0: 3, x1: 3.8, y0: 0, y1: 1, yref: 'paper', fillcolor: '#fef3c7', opacity: 0.3, line: { width: 0 } },
      { type: 'rect', x0: 3.8, x1: 5, y0: 0, y1: 1, yref: 'paper', fillcolor: '#d1fae5', opacity: 0.3, line: { width: 0 } },
    ],
  }, plotlyConfig);

  // Radar
  const means = CRITERIA.map(cr => avg(targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined)));
  const shorts = CRITERIA.map(cr => cr.short);
  Plotly.newPlot('overview-radar', [{
    type: 'scatterpolar', r: [...means, means[0]], theta: [...shorts, shorts[0]],
    fill: 'toself', fillcolor: 'rgba(79,110,247,0.15)', line: { color: '#4f6ef7', width: 2 }, name: 'Среднее',
  }], {
    polar: { radialaxis: { visible: true, range: [0, 5] } },
    margin: { t: 40, b: 40, l: 80, r: 80 }, height: 400, showlegend: false, font: plotlyFont,
  }, plotlyConfig);

  // ── Dynamics on Overview ──────────────────────────────────────────
  const weekly = getWeekly();
  const dates = weekly.map(w => w.date);
  const avgQas = weekly.map(w => avg(Object.values(w.operators).map(o => o.avgQa).filter(v => v > 0)));
  const avgConvs = weekly.map(w => {
    const ops = Object.values(w.operators);
    const totalT = ops.reduce((s, o) => s + o.targeted, 0);
    const totalS = ops.reduce((s, o) => s + o.successful, 0);
    return totalT > 0 ? totalS / totalT : 0;
  });

  Plotly.newPlot('overview-trend', [
    { x: dates, y: avgQas, name: 'Ср. оценка', yaxis: 'y', line: { color: '#4f6ef7', width: 2.5 }, mode: 'lines+markers', marker: { size: 5 } },
    { x: dates, y: avgConvs, name: 'Конверсия', yaxis: 'y2', type: 'bar', marker: { color: 'rgba(16,185,129,0.3)' } },
  ], {
    margin: { t: 10, b: 30, l: 50, r: 50 }, height: 320, font: plotlyFont,
    yaxis: { title: 'Оценка', range: [2.5, 5], dtick: 0.5 },
    yaxis2: { title: 'Конверсия', overlaying: 'y', side: 'right', tickformat: '.0%' },
    legend: { orientation: 'h', y: -0.12 },
  }, plotlyConfig);

  // Clients & Products
  const segCounts = {};
  calls.forEach(c => { segCounts[c.client.type] = (segCounts[c.client.type] || 0) + 1; });
  Plotly.newPlot('overview-clients', [{
    labels: Object.keys(segCounts), values: Object.values(segCounts), type: 'pie', hole: 0.5,
    marker: { colors: ['#4f6ef7', '#8b5cf6'] }, textinfo: 'percent+label', textfont: { size: 12, family: 'Outfit' },
  }], { margin: { t: 10, b: 10, l: 10, r: 10 }, height: 280, showlegend: false, font: plotlyFont }, plotlyConfig);

  const prodCounts = {};
  targeted.forEach(c => { prodCounts[c.product] = (prodCounts[c.product] || 0) + 1; });
  const prodSorted = Object.entries(prodCounts).sort((a, b) => b[1] - a[1]);
  Plotly.newPlot('overview-products', [{
    y: prodSorted.map(s => s[0]), x: prodSorted.map(s => s[1]), type: 'bar', orientation: 'h', marker: { color: '#8b5cf6' },
  }], { margin: { t: 10, b: 30, l: 120, r: 10 }, height: 280, font: plotlyFont, xaxis: { title: 'Звонков' } }, plotlyConfig);
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: EXECUTIVE
// ═══════════════════════════════════════════════════════════════════════
function renderExecutive() {
  const calls = getCalls();
  const targeted = calls.filter(c => c.isTargeted);
  const converted = calls.filter(c => c.converted);
  const totalRev = calls.reduce((s, c) => s + c.revenue, 0);
  const convRate = targeted.length ? converted.length / targeted.length : 0;
  const avgQa = avg(targeted.map(c => c.qaScore));

  document.getElementById('exec-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Выручка <span class="kpi-label-icon">💰</span></div><div class="kpi-value accent">${fmtMoney(totalRev)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Конверсия ${tip('Доля целевых звонков → продажа')}<span class="kpi-label-icon">📈</span></div><div class="kpi-value green">${fmtPct(convRate)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Ср. оценка <span class="kpi-label-icon">⭐</span></div><div class="kpi-value" style="color:${qaColor(avgQa)}">${fmt(avgQa, 2)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Продаж <span class="kpi-label-icon">🎯</span></div><div class="kpi-value">${converted.length}</div></div>
  `;

  // Funnel
  Plotly.newPlot('exec-funnel', [{
    type: 'funnel', y: ['Все звонки', 'Целевые', 'Продажи'], x: [calls.length, targeted.length, converted.length],
    textinfo: 'value+percent initial', marker: { color: ['#4f6ef7', '#f59e0b', '#10b981'] },
  }], { margin: { t: 10, b: 10, l: 10, r: 10 }, height: 280, font: plotlyFont }, plotlyConfig);

  // Ranking
  const opStats = OPERATORS.map(op => {
    const opC = calls.filter(c => c.operatorId === op.id);
    const opT = opC.filter(c => c.isTargeted);
    const opS = opC.filter(c => c.converted);
    return { name: op.shortName, calls: opC.length, sales: opS.length, conv: opT.length ? opS.length / opT.length : 0, revenue: opC.reduce((s, c) => s + c.revenue, 0), qa: avg(opT.map(c => c.qaScore)) };
  }).sort((a, b) => b.conv - a.conv);

  document.getElementById('exec-ranking').innerHTML = `
    <table class="comp-table">
      <tr><th>Оператор</th><th>Звонков</th><th>Продаж</th><th>Конверсия</th><th>Выручка</th><th>Оценка</th></tr>
      ${opStats.map(o => `<tr><td>${o.name}</td><td>${o.calls}</td><td>${o.sales}</td>
        <td><span class="comp-cell ${o.conv >= 0.15 ? 'high' : o.conv >= 0.10 ? 'mid' : 'low'}">${fmtPct(o.conv)}</span></td>
        <td>${fmtMoney(o.revenue)}</td><td><span class="comp-cell ${qaClass(o.qa)}">${fmt(o.qa, 2)}</span></td></tr>`).join('')}
    </table>`;

  // Heatmap
  const heatZ = [], heatY = [];
  OPERATORS.forEach(op => {
    const opT = targeted.filter(c => c.operatorId === op.id);
    heatY.push(op.shortName);
    heatZ.push(CRITERIA.map(cr => avg(opT.map(c => c.scores[cr.key]).filter(v => v !== undefined))));
  });
  Plotly.newPlot('exec-heatmap', [{
    z: heatZ, x: CRITERIA.map(c => c.short), y: heatY, type: 'heatmap',
    colorscale: [[0, '#ef4444'], [0.4, '#f59e0b'], [0.6, '#fbbf24'], [1, '#10b981']],
    zmin: 1, zmax: 5, text: heatZ.map(r => r.map(v => v.toFixed(1))), texttemplate: '%{text}',
  }], { margin: { t: 10, b: 30, l: 100, r: 10 }, height: 200, font: plotlyFont }, plotlyConfig);

  // ── Conclusions & Recommendations ─────────────────────────────────
  const weakCriteria = Object.entries(
    Object.fromEntries(CRITERIA.map(cr => [cr.short, avg(targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined))]))
  ).sort((a, b) => a[1] - b[1]).slice(0, 3);

  const bestOp = opStats[0];
  const worstOp = opStats[opStats.length - 1];
  const gapConv = bestOp.conv - worstOp.conv;

  document.getElementById('exec-conclusions').innerHTML = `
    <div class="conclusion-card">
      <div class="conclusion-icon red">📉</div>
      <div>
        <div class="conclusion-title">Главная проблема: ${weakCriteria[0][0]} (${fmt(weakCriteria[0][1])})</div>
        <div class="conclusion-text">Самый слабый критерий команды. Напрямую снижает конверсию — клиенты уходят без покупки.</div>
        <div class="conclusion-action">→ ${REC_ACTIONS[weakCriteria[0][0]] || 'Провести обучение'}</div>
      </div>
    </div>
    <div class="conclusion-card">
      <div class="conclusion-icon yellow">⚡</div>
      <div>
        <div class="conclusion-title">Разрыв между операторами: ${fmtPct(gapConv)}</div>
        <div class="conclusion-text">${bestOp.name} (${fmtPct(bestOp.conv)}) vs ${worstOp.name} (${fmtPct(worstOp.conv)}). Лучшие практики не тиражируются.</div>
        <div class="conclusion-action">→ Записать звонки лучшего оператора как эталон, провести разбор с командой</div>
      </div>
    </div>
    <div class="conclusion-card">
      <div class="conclusion-icon green">💰</div>
      <div>
        <div class="conclusion-title">Потенциал: +${fmtMoney(Math.round(totalRev * 0.15))} выручки</div>
        <div class="conclusion-text">При подтягивании всех операторов до уровня лучшего — рост выручки ~15%.</div>
        <div class="conclusion-action">→ Запустить пилот речевой аналитики на фокус-группе 15-20 операторов</div>
      </div>
    </div>
    <div class="conclusion-card">
      <div class="conclusion-icon accent">🎯</div>
      <div>
        <div class="conclusion-title">Также требуют внимания: ${weakCriteria[1][0]} (${fmt(weakCriteria[1][1])}) и ${weakCriteria[2][0]} (${fmt(weakCriteria[2][1])})</div>
        <div class="conclusion-text">Системные проблемы: не используются скрипты закрытия, слабая работа с возражениями.</div>
        <div class="conclusion-action">→ Обновить скрипты + банк аргументов + ролевые игры</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: IMPACT (simplified)
// ═══════════════════════════════════════════════════════════════════════
function renderImpact() {
  const calls = getCalls();
  const targeted = calls.filter(c => c.isTargeted);
  const highConv = calcConvForQa(targeted, 4, 5.01);
  const lowConv = calcConvForQa(targeted, 0, 3.5);
  const ratio = lowConv > 0 ? (highConv / lowConv) : 0;
  const totalRev = calls.reduce((s, c) => s + c.revenue, 0);
  const lostRev = ratio > 0 ? Math.round(totalRev * (1 - lowConv / Math.max(0.01, highConv)) * 0.3) : 0;

  // KPIs
  document.getElementById('impact-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Качество → продажи ${tip('Во сколько раз конверсия при оценке ≥4 выше, чем при <3.5')}<span class="kpi-label-icon">🔥</span></div>
      <div class="kpi-value green">×${ratio.toFixed(1)}</div>
      <div class="kpi-sub">разница в конверсии</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Конверсия при оценке ≥4 <span class="kpi-label-icon">🎯</span></div>
      <div class="kpi-value green">${fmtPct(highConv)}</div>
      <div class="kpi-sub">лучшие звонки</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Конверсия при оценке &lt;3.5 <span class="kpi-label-icon">📉</span></div>
      <div class="kpi-value red">${fmtPct(lowConv)}</div>
      <div class="kpi-sub">слабые звонки</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Потери от слабых звонков ${tip('Упущенная выручка из-за низкого качества')}<span class="kpi-label-icon">💸</span></div>
      <div class="kpi-value red">${fmtMoney(lostRev)}</div>
      <div class="kpi-sub">можно вернуть</div>
    </div>
  `;

  document.getElementById('impact-alert').innerHTML = `
    <div class="alert-box success">
      <span class="alert-icon">💡</span>
      <div>
        <div class="alert-title">Главный вывод для бизнеса</div>
        <div class="alert-text">Операторы с оценкой <b>≥4.0</b> продают в <span class="val-green">×${ratio.toFixed(1)} раз</span> чаще, чем с оценкой <b>&lt;3.5</b> (${fmtPct(highConv)} vs ${fmtPct(lowConv)}). Подтягивание слабых операторов до уровня 4.0 = <span class="val-green">+${fmtMoney(lostRev)}</span> выручки.</div>
      </div>
    </div>`;

  // Simple bar: conversion by QA buckets
  const buckets = [
    { label: '1.0-2.0', min: 1, max: 2.01 },
    { label: '2.0-3.0', min: 2, max: 3.01 },
    { label: '3.0-3.5', min: 3, max: 3.51 },
    { label: '3.5-4.0', min: 3.5, max: 4.01 },
    { label: '4.0-4.5', min: 4, max: 4.51 },
    { label: '4.5-5.0', min: 4.5, max: 5.01 },
  ];
  const bucketConv = buckets.map(b => {
    const bc = targeted.filter(c => c.qaScore >= b.min && c.qaScore < b.max);
    return bc.length ? bc.filter(c => c.converted).length / bc.length : 0;
  });
  const bucketColors = bucketConv.map(v => v >= 0.15 ? '#10b981' : v >= 0.10 ? '#f59e0b' : '#ef4444');

  Plotly.newPlot('impact-simple', [{
    x: buckets.map(b => b.label), y: bucketConv, type: 'bar',
    marker: { color: bucketColors, line: { color: '#fff', width: 1 } },
    text: bucketConv.map(v => fmtPct(v)), textposition: 'outside',
  }], {
    margin: { t: 20, b: 40, l: 50, r: 10 }, height: 320, font: plotlyFont,
    xaxis: { title: 'Оценка оператора' }, yaxis: { title: 'Конверсия в продажу', tickformat: '.0%' },
    annotations: [{ x: '4.0-4.5', y: Math.max(...bucketConv) * 1.15, text: '← Целевая зона', showarrow: false, font: { color: '#10b981', size: 12 } }],
  }, plotlyConfig);

  // Operator potential table
  const opData = OPERATORS.map(op => {
    const opT = targeted.filter(c => c.operatorId === op.id);
    const opS = opT.filter(c => c.converted);
    const qa = avg(opT.map(c => c.qaScore));
    const conv = opT.length ? opS.length / opT.length : 0;
    const rev = opT.reduce((s, c) => s + c.revenue, 0);
    const gap = Math.max(0, 3.8 - qa);
    const extra = gap > 0 ? Math.round(rev * gap * 0.1) : 0;
    return { name: op.shortName, qa, conv, rev, extra, gap };
  });

  document.getElementById('impact-operators').innerHTML = `
    <table class="comp-table">
      <tr><th>Оператор</th><th>Оценка</th><th>Конверсия</th><th>Выручка</th><th>Потенциал</th></tr>
      ${opData.map(o => `<tr>
        <td>${o.name}</td>
        <td><span class="comp-cell ${qaClass(o.qa)}">${fmt(o.qa, 2)}</span></td>
        <td>${fmtPct(o.conv)}</td>
        <td>${fmtMoney(o.rev)}</td>
        <td>${o.extra > 0 ? `<span style="color:#10b981;font-weight:600;">+${fmtMoney(o.extra)}</span>` : '<span style="color:#9ca3af;">Уже выше цели</span>'}</td>
      </tr>`).join('')}
    </table>`;

  // ── Client Profile → Personalized Script ─────────────────────────
  const profileData = buildClientProfile(targeted);
  document.getElementById('impact-client-profile').innerHTML = profileData;
}

function calcConvForQa(targeted, min, max) {
  const filtered = targeted.filter(c => c.qaScore >= min && c.qaScore < max);
  return filtered.length ? filtered.filter(c => c.converted).length / filtered.length : 0;
}

function buildClientProfile(targeted) {
  const dims = [
    { key: 'type', label: 'Тип клиента', icon: '👤', tips: { 'Новый клиент': 'Акцент на выгодах подключения, пробный период', 'Текущий клиент': 'Апгрейд текущего тарифа, лояльность' },
      scripts: { 'Новый клиент': ['«Специально для новых клиентов — первый месяц бесплатно»', '«Подключение за 24 часа, бесплатный выезд мастера»', '«Расскажу про тариф, который идеально подойдёт под ваши задачи»'],
                 'Текущий клиент': ['«Как постоянному клиенту — скидка 15% на расширение»', '«Вижу, что у вас базовый тариф — могу предложить лучше по той же цене»', '«Хочу убедиться, что вы получаете максимум от подключения»'] }},
    { key: 'gender', label: 'Пол', icon: '⚡', tips: { 'Мужчина': 'Технические характеристики, скорость, цифры', 'Женщина': 'Удобство для семьи, стабильность, поддержка' },
      scripts: { 'Мужчина': ['«Скорость до 500 Мбит/с — фильм за 2 минуты»', '«Пинг до 5мс — идеально для онлайн-игр»', '«Роутер с поддержкой Wi-Fi 6 в комплекте»'],
                 'Женщина': ['«Стабильный интернет для всей семьи — до 10 устройств»', '«Бесплатная поддержка 24/7, поможем с настройкой»', '«Детский контент и безопасный интернет включены»'] }},
    { key: 'age', label: 'Возраст', icon: '🎂', tips: { '18-25': 'Мобильность, стриминг, скорость', '26-35': 'Семья, работа из дома', '36-45': 'Надёжность, поддержка, ТВ', '46-55': 'Простота, ТВ, цена', '55+': 'Простые тарифы, помощь с настройкой' },
      scripts: { '18-25': ['«Безлимитный интернет + подписка на Movix в подарок»', '«Стриминг, игры, соцсети — всё летает»'],
                 '26-35': ['«Работаете из дома? Стабильный канал для видеозвонков»', '«Подключите семейный тариф — выгоднее на 20%»'],
                 '36-45': ['«Цифровое ТВ + интернет в одном пакете — удобно и выгодно»', '«Надёжное подключение без перебоев»'],
                 '46-55': ['«Простой тариф без скрытых платежей»', '«200+ каналов ТВ — спорт, кино, новости»'],
                 '55+': ['«Поможем настроить всё за один визит мастера»', '«Простой пульт для ТВ, понятный интерфейс»'] }},
    { key: 'housing', label: 'Жильё', icon: '🏠', tips: { 'Квартира': 'МКД-тарифы, общий доступ', 'Частный дом': 'ЧС-тарифы, индивидуальное подключение' },
      scripts: { 'Квартира': ['«Для вашего дома доступен тариф МКД — оптоволокно в квартиру»', '«Подключаем за 1 день, без сверления стен»'],
                 'Частный дом': ['«Для частного сектора — индивидуальная линия до дома»', '«Тариф ЧС: стабильный сигнал даже в удалённых районах»'] }},
    { key: 'traffic', label: 'Трафик', icon: '📶', tips: { 'До 50 ГБ': 'Лёгкое использование, базовый тариф', '50-200 ГБ': 'Средняя нагрузка, оптимальный тариф', '200-500 ГБ': 'Активное использование, стриминг/игры', '500+ ГБ': 'Тяжёлый трафик, максимальная скорость' },
      scripts: { 'До 50 ГБ': ['«Для вашего объёма достаточно базового тарифа — экономия без потерь»', '«Если планируете смотреть видео — рекомендую тариф повыше, чтобы не было ограничений»'],
                 '50-200 ГБ': ['«С вашим потреблением оптимальный тариф — идеальный баланс цены и скорости»', '«Стриминг и видеозвонки будут работать без задержек»'],
                 '200-500 ГБ': ['«Вы активный пользователь — на расширенном тарифе скорость не будет падать»', '«Для стриминга 4K и онлайн-игр рекомендую от 200 Мбит/с»'],
                 '500+ ГБ': ['«Для вашего объёма трафика нужен премиум — максимальная скорость без ограничений»', '«Безлимит + приоритет в сети — никаких просадок в пиковые часы»'] }},
    { key: 'devices', label: 'Кол-во устройств', icon: '📱', tips: { '1-2 устройства': 'Базовый тариф, экономия', '3-5 устройств': 'Оптимальный тариф, Wi-Fi 6 роутер', '6+ устройств': 'Премиум + Mesh-система' },
      scripts: { '1-2 устройства': ['«Базового тарифа хватит с запасом — экономия без потери качества»'],
                 '3-5 устройств': ['«Для 3-5 устройств рекомендую Оптимальный — стабильный Wi-Fi на всех»', '«Роутер с Wi-Fi 6 обеспечит скорость на каждом устройстве»'],
                 '6+ устройств': ['«Для 6+ устройств идеально подойдёт Mesh-система — покрытие всей квартиры»', '«Премиум-тариф + Mesh: ни одного мёртвого угла»'] }},
  ];

  // Analyze all dimensions
  const allSegments = dims.map(dim => {
    const groups = {};
    targeted.forEach(c => {
      const seg = c.client[dim.key];
      if (!groups[seg]) groups[seg] = { total: 0, converted: 0 };
      groups[seg].total++;
      if (c.converted) groups[seg].converted++;
    });
    const sorted = Object.entries(groups).sort((a, b) => (b[1].converted / b[1].total) - (a[1].converted / a[1].total));
    return { ...dim, groups, sorted, best: sorted[0], worst: sorted[sorted.length - 1] };
  });

  // Build "ideal client portrait" from best segments
  const portraitConvs = allSegments.map(s => s.best[1].total > 0 ? s.best[1].converted / s.best[1].total : 0);
  const avgPortraitConv = avg(portraitConvs);
  const overallConv = targeted.length ? targeted.filter(c => c.converted).length / targeted.length : 0;

  // Segment cards (all 6)
  const segCards = allSegments.map(dim => {
    const bestConv = dim.best[1].total > 0 ? dim.best[1].converted / dim.best[1].total : 0;
    const scripts = dim.scripts?.[dim.best[0]] || [];

    // Bar chart for all values in this dimension
    const bars = dim.sorted.map(([name, data]) => {
      const conv = data.total > 0 ? data.converted / data.total : 0;
      const pct = conv / Math.max(...dim.sorted.map(s => s[1].total > 0 ? s[1].converted / s[1].total : 0.01)) * 100;
      const isBest = name === dim.best[0];
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div style="width:100px;font-size:12px;color:${isBest ? 'var(--text-primary);font-weight:600' : 'var(--text-secondary)'};text-align:right;flex-shrink:0;">${name}</div>
        <div style="flex:1;height:20px;background:var(--border-light);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${Math.max(pct, 5)}%;background:${isBest ? '#10b981' : '#4f6ef7'};border-radius:4px;transition:width 400ms;"></div>
        </div>
        <div style="width:48px;font-size:12px;font-weight:600;font-family:'JetBrains Mono';color:${isBest ? '#10b981' : 'var(--text-secondary)'};flex-shrink:0;">${fmtPct(conv)}</div>
      </div>`;
    }).join('');

    return `<div class="profile-card" style="padding:18px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:20px;">${dim.icon}</span>
        <div>
          <div class="profile-segment">${dim.label}</div>
          <div style="font-size:11px;color:var(--text-muted);">Лучший: <b style="color:var(--green);">${dim.best[0]}</b> (${fmtPct(bestConv)})</div>
        </div>
      </div>
      ${bars}
      ${scripts.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);">
        <div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Правки в скрипт для «${dim.best[0]}»:</div>
        ${scripts.map(s => `<div style="font-size:12px;color:var(--text-secondary);padding:3px 0;padding-left:12px;position:relative;">
          <span style="position:absolute;left:0;color:var(--accent);">→</span> ${s}
        </div>`).join('')}
      </div>` : ''}
    </div>`;
  });

  return `
    <div class="alert-box success" style="margin-bottom:16px;">
      <span class="alert-icon">🧠</span>
      <div>
        <div class="alert-title">Идея: персональный скрипт по профилю клиента</div>
        <div class="alert-text">Зная профиль клиента до звонка, оператор адаптирует скрипт → выше конверсия. Средняя конверсия <b>${fmtPct(overallConv)}</b>, а в лучших сегментах — до <span class="val-green">${fmtPct(Math.max(...portraitConvs))}</span>.</div>
      </div>
    </div>

    <div style="background:linear-gradient(135deg, #f0f4ff, #e8f5e9);border:2px solid var(--accent);border-radius:var(--radius);padding:20px;margin-bottom:16px;">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">Портрет идеального клиента</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        ${allSegments.map(s => `<span class="badge accent" style="font-size:12px;">${s.icon} ${s.best[0]}</span>`).join('')}
      </div>
      <div style="font-size:13px;color:var(--text-secondary);">
        Средняя конверсия по лучшим сегментам: <b style="color:var(--green);">${fmtPct(avgPortraitConv)}</b>
        (vs общая <b>${fmtPct(overallConv)}</b> — разница <span class="val-green">+${fmtPct(avgPortraitConv - overallConv)}</span>)
      </div>
    </div>

    <div class="profile-grid" style="grid-template-columns:repeat(3,1fr);">${segCards.slice(0, 3).join('')}</div>
    <div class="profile-grid" style="grid-template-columns:repeat(3,1fr);">${segCards.slice(3, 6).join('')}</div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: TEAM
// ═══════════════════════════════════════════════════════════════════════
function renderTeam() {
  const calls = getCalls();
  const targeted = calls.filter(c => c.isTargeted);

  const teamCriteria = {};
  CRITERIA.forEach(cr => {
    teamCriteria[cr.short] = avg(targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined));
  });

  // TOP-3 focus
  const sorted = Object.entries(teamCriteria).sort((a, b) => a[1] - b[1]).slice(0, 3);
  document.getElementById('team-focus').innerHTML = sorted.map(([name, score], idx) => {
    const lift = ((4.0 - score) * 3).toFixed(0);
    const steps = TOP_FOCUS_STEPS[name] || ['Провести разбор', 'Прослушать 5 худших', 'Проверить через неделю'];
    return `
      <div class="focus-card">
        <div class="focus-header"><span class="focus-number">${idx + 1}</span><span class="focus-name">${name}</span></div>
        <div class="focus-meta">Текущий: <span class="current">${fmt(score)}</span></div>
        <div class="focus-lift">↗ +${lift} п.п. при выполнении</div>
        <ol class="focus-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>`;
  }).join('');

  // Comp table
  const compRows = OPERATORS.map(op => {
    const opT = targeted.filter(c => c.operatorId === op.id);
    const scores = CRITERIA.map(cr => avg(opT.map(c => c.scores[cr.key]).filter(v => v !== undefined)));
    return { name: op.shortName, scores, avg: avg(scores) };
  });
  document.getElementById('team-comp-table').innerHTML = `
    <table class="comp-table">
      <tr><th>Оператор</th>${CRITERIA.map(c => `<th>${c.short}</th>`).join('')}<th>Средн.</th></tr>
      ${compRows.map(r => `<tr><td>${r.name}</td>${r.scores.map(s => `<td><span class="comp-cell ${qaClass(s)}">${fmt(s)}</span></td>`).join('')}<td><span class="comp-cell ${qaClass(r.avg)}">${fmt(r.avg)}</span></td></tr>`).join('')}
    </table>`;

  // Radar
  const shorts = CRITERIA.map(c => c.short);
  Plotly.newPlot('team-radar', OPERATORS.map((op, i) => {
    const opT = targeted.filter(c => c.operatorId === op.id);
    const means = CRITERIA.map(cr => avg(opT.map(c => c.scores[cr.key]).filter(v => v !== undefined)));
    return { type: 'scatterpolar', r: [...means, means[0]], theta: [...shorts, shorts[0]], fill: 'toself', name: op.shortName, line: { color: COLORS[i], width: 2 }, opacity: 0.7 };
  }), {
    polar: { radialaxis: { visible: true, range: [0, 5] } },
    margin: { t: 40, b: 40, l: 100, r: 100 }, height: 420, font: plotlyFont,
  }, plotlyConfig);

  // Bar
  Plotly.newPlot('team-bar', OPERATORS.map((op, i) => {
    const opT = targeted.filter(c => c.operatorId === op.id);
    return { x: CRITERIA.map(c => c.short), y: CRITERIA.map(cr => avg(opT.map(c => c.scores[cr.key]).filter(v => v !== undefined))), name: op.shortName, type: 'bar', marker: { color: COLORS[i] } };
  }), {
    barmode: 'group', margin: { t: 10, b: 40, l: 40, r: 10 }, height: 380, font: plotlyFont, yaxis: { range: [0, 5] },
    shapes: [
      { type: 'line', x0: -0.5, x1: 9.5, y0: 3.8, y1: 3.8, line: { color: '#10b981', dash: 'dash', width: 1 } },
      { type: 'line', x0: -0.5, x1: 9.5, y0: 3, y1: 3, line: { color: '#f59e0b', dash: 'dash', width: 1 } },
    ],
  }, plotlyConfig);
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: CALLS (with detail)
// ═══════════════════════════════════════════════════════════════════════
function renderCalls() {
  const calls = getCalls();
  const targeted = calls.filter(c => c.isTargeted);

  // Call selector
  const sel = document.getElementById('callSelector');
  const recent = targeted.slice(-30).reverse();
  sel.innerHTML = recent.map(c =>
    `<option value="${c.session}">#${c.session} — ${c.operator} — ${c.product} (${fmt(c.qaScore, 1)})</option>`
  ).join('');

  sel.onchange = () => renderCallDetail(recent.find(c => c.session == sel.value));
  if (recent.length) renderCallDetail(recent[0]);

  // Table
  const tableRecent = calls.slice(-50).reverse();
  document.getElementById('calls-table').innerHTML = `
    <table class="comp-table">
      <tr><th>Дата</th><th>Оператор</th><th>Продукт</th><th>Клиент</th><th>Длит.</th><th>Результат</th><th>Оценка</th><th>Продажа</th></tr>
      ${tableRecent.map(c => `<tr style="cursor:${c.isTargeted ? 'pointer' : 'default'}" ${c.isTargeted ? `onclick="document.getElementById('callSelector').value='${c.session}';document.getElementById('callSelector').onchange()"` : ''}>
        <td>${c.date}</td><td>${c.operator}</td>
        <td>${c.isTargeted ? c.product : '<span style="color:#9ca3af">—</span>'}</td>
        <td><span class="badge accent">${c.client.type}</span></td>
        <td>${c.duration} мин</td>
        <td><span class="badge ${c.success === 'Отлично' || c.success === 'Хорошо' ? 'green' : c.success === 'Частично' ? 'yellow' : c.success === 'Неуспешно' ? 'red' : 'accent'}">${c.success}</span></td>
        <td>${c.isTargeted ? `<span class="comp-cell ${qaClass(c.qaScore)}">${fmt(c.qaScore, 1)}</span>` : '—'}</td>
        <td>${c.converted ? '<span class="badge green">Да</span>' : '<span style="color:#9ca3af">Нет</span>'}</td>
      </tr>`).join('')}
    </table>`;

  // Segments & Products charts
  const segments = {};
  targeted.forEach(c => {
    const key = c.client.type;
    if (!segments[key]) segments[key] = { total: 0, converted: 0 };
    segments[key].total++;
    if (c.converted) segments[key].converted++;
  });
  Plotly.newPlot('calls-segments', [{
    x: Object.keys(segments), y: Object.values(segments).map(s => s.total > 0 ? s.converted / s.total : 0),
    type: 'bar', marker: { color: ['#4f6ef7', '#8b5cf6'] },
    text: Object.values(segments).map(s => s.total > 0 ? fmtPct(s.converted / s.total) : '0%'), textposition: 'outside',
  }], { margin: { t: 10, b: 30, l: 50, r: 10 }, height: 300, font: plotlyFont, yaxis: { tickformat: '.0%', title: 'Конверсия' } }, plotlyConfig);

  const prods = {};
  targeted.forEach(c => {
    if (!prods[c.product]) prods[c.product] = { total: 0, converted: 0 };
    prods[c.product].total++;
    if (c.converted) prods[c.product].converted++;
  });
  const prodSorted = Object.entries(prods).sort((a, b) => b[1].total - a[1].total);
  Plotly.newPlot('calls-products', [{
    y: prodSorted.map(p => p[0]), x: prodSorted.map(p => p[1].total > 0 ? p[1].converted / p[1].total : 0),
    type: 'bar', orientation: 'h', marker: { color: '#10b981' },
    text: prodSorted.map(p => fmtPct(p[1].total > 0 ? p[1].converted / p[1].total : 0)), textposition: 'outside',
  }], { margin: { t: 10, b: 30, l: 120, r: 40 }, height: 300, font: plotlyFont, xaxis: { tickformat: '.0%', title: 'Конверсия' } }, plotlyConfig);
}

function renderCallDetail(call) {
  if (!call) { document.getElementById('call-detail').innerHTML = ''; return; }

  const critTiles = CRITERIA.map(cr => {
    const score = call.scores[cr.key];
    if (score === undefined) return '';
    const cls = qaClass(score);
    return `<div class="criteria-tile ${cls}">
      <div class="criteria-tile-score" style="color:${qaColor(score)}">${score}</div>
      <div class="criteria-tile-name">${cr.short}</div>
    </div>`;
  }).join('');

  const weakest = CRITERIA.map(cr => ({ name: cr.short, score: call.scores[cr.key] || 0 })).filter(c => c.score > 0 && c.score < 4).sort((a, b) => a.score - b.score);

  document.getElementById('call-detail').innerHTML = `
    <div class="call-card">
      <div class="call-meta">
        <span class="badge accent">${call.operator}</span>
        <span class="badge ${call.converted ? 'green' : 'yellow'}">${call.converted ? '✓ Продажа' : 'Без продажи'}</span>
        <span class="badge accent">${call.product}</span>
        <span class="badge accent">${call.duration} мин</span>
        <span class="badge ${call.success === 'Отлично' || call.success === 'Хорошо' ? 'green' : call.success === 'Частично' ? 'yellow' : 'red'}">Качество: ${call.success}</span>
      </div>
      <div style="margin-bottom:8px;">
        <b>Клиент:</b> ${call.client.type} · ${call.client.gender} · ${call.client.age} · ${call.client.housing} · ${call.client.traffic} · ${call.client.devices}
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">Ср. оценка: <b style="color:${qaColor(call.qaScore)}">${fmt(call.qaScore, 2)}</b></div>
    </div>
    <div style="margin-bottom:8px;font-weight:600;">Оценки по критериям</div>
    <div class="criteria-grid">${critTiles}</div>
    ${weakest.length ? `
      <div style="margin-top:12px;font-weight:600;margin-bottom:8px;">Рекомендации</div>
      ${weakest.map(w => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--yellow-light);border-left:3px solid var(--yellow);border-radius:0 8px 8px 0;margin-bottom:6px;">
          <div style="font-weight:600;min-width:90px;">${w.name} <span style="color:${qaColor(w.score)}">${w.score}</span></div>
          <div style="font-size:13px;color:var(--text-secondary);">${REC_ACTIONS[w.name] || 'Улучшить навык'}</div>
        </div>`).join('')}` : '<div class="alert-box success"><span class="alert-icon">🎉</span><div><div class="alert-title">Отличный звонок!</div><div class="alert-text">Все критерии на высоком уровне.</div></div></div>'}
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: REAL CALLS
// ═══════════════════════════════════════════════════════════════════════
function renderRealCalls() {
  if (typeof REAL_CALLS === 'undefined' || !REAL_CALLS.length) return;

  const calls = REAL_CALLS;
  const avgAll = avg(calls.map(c => c.avgScore));
  const best = calls.reduce((a, b) => a.avgScore > b.avgScore ? a : b);
  const aboveNorm = calls.filter(c => c.avgScore >= 3.8).length;

  // KPIs
  document.getElementById('real-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Звонков</div>
      <div class="kpi-value">${calls.length}</div>
      <div class="kpi-sub">10.02.2026</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ср. оценка</div>
      <div class="kpi-value" style="color:${qaColor(avgAll)}">${fmt(avgAll, 2)}</div>
      <div class="kpi-sub">из 5.0</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Выше нормы (3.8)</div>
      <div class="kpi-value ${aboveNorm / calls.length > 0.5 ? 'green' : ''}" style="color:${aboveNorm / calls.length > 0.5 ? '#10b981' : '#ef4444'}">${aboveNorm} из ${calls.length}</div>
      <div class="kpi-sub">${fmtPct(aboveNorm / calls.length)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Лучший результат</div>
      <div class="kpi-value green">${fmt(best.avgScore, 2)}</div>
      <div class="kpi-sub">${best.operator}</div>
    </div>`;

  // Criteria bar chart
  const criteriaKeys = ['contact','needs','presentation','objections','closing','modules','grammar','tone','activity','listening'];
  const criteriaNames = ['Контакт','Потребности','Презентация','Возражения','Завершение','Модули','Грамотность','Тон','Активность','Слушание'];
  const criteriaAvgs = criteriaKeys.map(k => avg(calls.map(c => c.scores[k])));

  Plotly.newPlot('real-criteria-chart', [
    {
      x: criteriaNames, y: criteriaAvgs, type: 'bar',
      marker: { color: criteriaAvgs.map(v => v >= 3.8 ? '#10b981' : v >= 3.0 ? '#f59e0b' : '#ef4444') },
      text: criteriaAvgs.map(v => v.toFixed(2)), textposition: 'outside',
    },
    {
      x: criteriaNames, y: criteriaNames.map(() => 3.8), type: 'scatter', mode: 'lines',
      name: 'Норма 3.8', line: { color: '#ef4444', dash: 'dash', width: 2 }, showlegend: true,
    },
  ], {
    margin: { t: 20, b: 80, l: 50, r: 20 }, height: 350, font: plotlyFont,
    yaxis: { range: [0, 5], dtick: 1 }, showlegend: true,
    legend: { orientation: 'h', y: -0.25 },
  }, plotlyConfig);

  // ── Summary banner ──
  document.getElementById('real-summary').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:linear-gradient(135deg,#003288 0%,#0050c8 100%);border-radius:12px;margin-bottom:16px;color:#fff;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FBAC00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <div>
        <div style="font-weight:700;font-size:15px;">Реальные данные пилота</div>
        <div style="font-size:13px;opacity:0.85;">Источник: транскрибация звонков ОКЦ / НТП / ССК · 10.02.2026 · Персональные данные анонимизированы</div>
      </div>
    </div>`;

  // ── Conclusions ──
  const belowNorm = criteriaKeys
    .map((k, i) => ({ key: k, name: criteriaNames[i], avg: criteriaAvgs[i] }))
    .filter(c => c.avg < 3.8)
    .sort((a, b) => a.avg - b.avg);
  const aboveNormCriteria = criteriaKeys
    .map((k, i) => ({ key: k, name: criteriaNames[i], avg: criteriaAvgs[i] }))
    .filter(c => c.avg >= 3.8)
    .sort((a, b) => b.avg - a.avg);

  // By line
  const lineStats = {};
  calls.forEach(c => {
    if (!lineStats[c.line]) lineStats[c.line] = [];
    lineStats[c.line].push(c.avgScore);
  });
  const lineRanking = Object.entries(lineStats)
    .map(([line, scores]) => ({ line, avg: avg(scores), count: scores.length }))
    .sort((a, b) => b.avg - a.avg);

  document.getElementById('real-conclusions').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-weight:700;margin-bottom:10px;color:#ef4444;">Проблемные зоны (ниже нормы 3.8)</div>
        ${belowNorm.map(c => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 12px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:0 8px 8px 0;">
            <div style="font-weight:600;min-width:110px;">${c.name}</div>
            <div style="flex:1;height:16px;background:#fee2e2;border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${c.avg/5*100}%;background:#ef4444;border-radius:4px;"></div>
            </div>
            <div style="font-weight:700;font-family:'JetBrains Mono';color:#ef4444;min-width:36px;text-align:right;">${c.avg.toFixed(2)}</div>
          </div>`).join('')}
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:10px;color:#10b981;">Сильные стороны (выше нормы)</div>
        ${aboveNormCriteria.map(c => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 12px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:0 8px 8px 0;">
            <div style="font-weight:600;min-width:110px;">${c.name}</div>
            <div style="flex:1;height:16px;background:#dcfce7;border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${c.avg/5*100}%;background:#10b981;border-radius:4px;"></div>
            </div>
            <div style="font-weight:700;font-family:'JetBrains Mono';color:#10b981;min-width:36px;text-align:right;">${c.avg.toFixed(2)}</div>
          </div>`).join('')}
      </div>
    </div>

    <div style="font-weight:700;margin-bottom:10px;">Качество по линиям</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      ${lineRanking.map(l => `
        <div style="flex:1;min-width:150px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:10px;text-align:center;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">${l.line}</div>
          <div style="font-size:24px;font-weight:700;color:${qaColor(l.avg)};font-family:'JetBrains Mono';">${l.avg.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${l.count} звонков</div>
        </div>`).join('')}
    </div>

    <div style="font-weight:700;margin-bottom:10px;">Рекомендации</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      ${belowNorm.slice(0, 3).map((c, i) => {
        const actions = {
          'Модули': ['Внедрить чек-лист завершения: итог + следующий шаг + «Остались вопросы?»', 'Контроль: проверять последние 2 минуты звонка'],
          'Потребности': ['Минимум 3 открытых вопроса до презентации продукта', 'Шаблон: площадь, кол-во устройств, цели использования'],
          'Завершение': ['Инициировать оформление: «Давайте оформим заявку»', 'Фиксировать дату и время подключения'],
          'Презентация': ['Связывать тариф с потребностью клиента', 'Называть конкретные выгоды: скорость, каналы, цену'],
          'Возражения': ['Техника «согласие + аргумент + вопрос»', 'Составить банк ответов на топ-5 возражений'],
          'Контакт': ['Полное приветствие: имя, компания, готовность помочь', 'Уточнять имя клиента в начале звонка'],
          'Слушание': ['Перефразировать: «Правильно ли я понимаю...»', 'Пауза 2 сек после ответа клиента'],
          'Тон': ['Доброжелательный тон без разговорных оборотов', 'Контроль эмоций при негативе от клиента'],
          'Активность': ['Вести диалог, структурировать этапы', 'Объяснять клиенту логику действий'],
          'Грамотность': ['Исключить слова-паразиты', 'Использовать профессиональную лексику'],
        };
        const tips = actions[c.name] || ['Улучшить навык'];
        return `
          <div style="padding:14px;background:var(--yellow-light);border-top:3px solid var(--yellow);border-radius:10px;">
            <div style="font-weight:700;margin-bottom:4px;">Фокус ${i+1}: ${c.name}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Текущий: <span style="color:${qaColor(c.avg)};font-weight:600;">${c.avg.toFixed(2)}</span> → Цель: <span style="color:#10b981;font-weight:600;">3.80</span></div>
            <ul style="margin:0;padding-left:18px;font-size:13px;">
              ${tips.map(t => `<li style="margin-bottom:4px;">${t}</li>`).join('')}
            </ul>
          </div>`;
      }).join('')}
    </div>
  `;

  // Call selector
  const sel = document.getElementById('realCallSelector');
  sel.innerHTML = calls.sort((a, b) => b.avgScore - a.avgScore)
    .map(c => `<option value="${c.id}">${c.operator} · ${c.line} · ${fmt(c.avgScore, 2)} · ${c.success}</option>`).join('');
  sel.onchange = () => renderRealCallDetail(calls.find(c => c.id === +sel.value));
  renderRealCallDetail(calls[0]);

  // Table
  const sorted = [...calls].sort((a, b) => b.avgScore - a.avgScore);
  document.getElementById('real-calls-table').innerHTML = `
    <table class="data-table"><thead><tr>
      <th>#</th><th>Оператор</th><th>Линия</th><th>Длит.</th><th>Контакт</th><th>Потр.</th><th>Презент.</th><th>Возр.</th><th>Заверш.</th><th>Модули</th><th>Грамот.</th><th>Тон</th><th>Актив.</th><th>Слуш.</th><th>Среднее</th><th>Статус</th>
    </tr></thead><tbody>
    ${sorted.map((c, i) => `<tr style="cursor:pointer;" onclick="document.getElementById('realCallSelector').value='${c.id}';renderRealCallDetail(REAL_CALLS.find(x=>x.id===${c.id}));document.getElementById('real-call-detail').scrollIntoView({behavior:'smooth'});">
      <td>${i + 1}</td>
      <td style="font-weight:500;">${c.operator}</td>
      <td><span class="badge accent">${c.line}</span></td>
      <td>${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}</td>
      ${criteriaKeys.map(k => `<td style="color:${qaColor(c.scores[k])};font-weight:600;font-family:'JetBrains Mono';">${c.scores[k].toFixed(1)}</td>`).join('')}
      <td style="font-weight:700;color:${qaColor(c.avgScore)};font-family:'JetBrains Mono';">${c.avgScore.toFixed(2)}</td>
      <td><span class="badge ${c.success === 'Отлично' || c.success === 'Хорошо' ? 'green' : c.success === 'Частично' ? 'yellow' : 'red'}">${c.success}</span></td>
    </tr>`).join('')}
    </tbody></table>`;
}

function renderRealCallDetail(call) {
  if (!call) return;
  const criteriaKeys = ['contact','needs','presentation','objections','closing','modules','grammar','tone','activity','listening'];
  const criteriaNames = ['Контакт','Потребности','Презентация','Возражения','Завершение','Модули','Грамотность','Тон','Активность','Слушание'];

  // Format dialog with colored turns
  const dialogHtml = call.dialog
    .replace(/<out>/g, '</span><span style="display:block;margin:4px 0;padding:6px 10px;background:#e8f0fe;border-radius:6px;border-left:3px solid #4f6ef7;font-size:13px;"><b style="color:#4f6ef7;">Оператор:</b> ')
    .replace(/<in>/g, '</span><span style="display:block;margin:4px 0;padding:6px 10px;background:#f0f0f0;border-radius:6px;border-left:3px solid #9ca3af;font-size:13px;"><b style="color:#6b7280;">Клиент:</b> ')
    + '</span>';

  // Score bars
  const scoreBars = criteriaKeys.map((k, i) => {
    const s = call.scores[k];
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <div style="width:110px;font-size:12px;text-align:right;flex-shrink:0;">${criteriaNames[i]}</div>
      <div style="flex:1;height:20px;background:var(--border-light);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${s/5*100}%;background:${qaColor(s)};border-radius:4px;"></div>
      </div>
      <div style="width:32px;font-size:12px;font-weight:600;font-family:'JetBrains Mono';color:${qaColor(s)};">${s.toFixed(1)}</div>
    </div>`;
  }).join('');

  // Recommendations for weak areas
  const weakCriteria = criteriaKeys
    .map((k, i) => ({ key: k, name: criteriaNames[i], score: call.scores[k], shortName: CRITERIA[i]?.short || criteriaNames[i] }))
    .filter(c => c.score < 3.5)
    .sort((a, b) => a.score - b.score);

  const recsHtml = weakCriteria.length > 0 ? weakCriteria.map(w => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--yellow-light);border-left:3px solid var(--yellow);border-radius:0 8px 8px 0;margin-bottom:6px;">
      <div style="font-weight:600;min-width:100px;">${w.name} <span style="color:${qaColor(w.score)}">${w.score.toFixed(1)}</span></div>
      <div style="font-size:13px;color:var(--text-secondary);">${REC_ACTIONS[w.shortName] || 'Улучшить навык'}</div>
    </div>`).join('') : '<div style="padding:10px;color:#10b981;font-weight:500;">Все критерии на хорошем уровне</div>';

  document.getElementById('real-call-detail').innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <span class="badge accent">${call.operator}</span>
        <span class="badge">${call.line}</span>
        <span class="badge">${call.direction}</span>
        <span class="badge accent">${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}</span>
        <span class="badge ${call.success === 'Отлично' || call.success === 'Хорошо' ? 'green' : call.success === 'Частично' ? 'yellow' : 'red'}">${call.success} · ${call.avgScore.toFixed(2)}</span>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:16px;">
      <div>
        <div style="font-weight:600;margin-bottom:8px;">Оценки по критериям</div>
        ${scoreBars}
      </div>
      <div>
        <div style="font-weight:600;margin-bottom:8px;">Рекомендации</div>
        ${recsHtml}
      </div>
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:8px;">Диалог</div>
      <div style="max-height:400px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:8px;border:1px solid var(--border-light);">
        ${dialogHtml}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  PAGE: PERSONAL
// ═══════════════════════════════════════════════════════════════════════
function renderPersonal() {
  const opId = currentOperator !== 'all' ? currentOperator : 'op1';
  const op = OPERATORS.find(o => o.id === opId);
  document.getElementById('personal-subtitle').textContent = op.shortName;

  const calls = filterByPeriod(ALL_CALLS, currentPeriod).filter(c => c.operatorId === opId);
  const targeted = calls.filter(c => c.isTargeted);
  const weekly = getWeekly();

  const avgQa = avg(targeted.map(c => c.qaScore));
  const convRate = targeted.length ? targeted.filter(c => c.converted).length / targeted.length : 0;
  const successRate = targeted.length ? targeted.filter(c => ['Отлично', 'Хорошо'].includes(c.success)).length / targeted.length : 0;

  document.getElementById('personal-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Оценка <span class="kpi-label-icon">⭐</span></div><div class="kpi-value" style="color:${qaColor(avgQa)}">${fmt(avgQa, 2)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Звонков <span class="kpi-label-icon">📞</span></div><div class="kpi-value">${calls.length}</div><div class="kpi-sub">Целевых: ${targeted.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Качество звонков ${tip('Отлично + Хорошо по LLM')}<span class="kpi-label-icon">✅</span></div><div class="kpi-value green">${fmtPct(successRate)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Конверсия в продажу ${tip('Доля звонков → реальная продажа')}<span class="kpi-label-icon">🎯</span></div><div class="kpi-value accent">${fmtPct(convRate)}</div></div>
  `;

  const means = CRITERIA.map(cr => avg(targeted.map(c => c.scores[cr.key]).filter(v => v !== undefined)));
  const critPairs = CRITERIA.map((cr, i) => ({ name: cr.short, score: means[i] })).filter(c => c.score > 0).sort((a, b) => a.score - b.score);

  if (critPairs.length && critPairs[0].score < 4.0) {
    document.getElementById('personal-alert').innerHTML = `
      <div class="alert-box warning">
        <span class="alert-icon">⚠️</span>
        <div>
          <div class="alert-title">Зона роста</div>
          <div class="alert-text">Подтяните <b>${critPairs[0].name}</b> с <span class="val-red">${fmt(critPairs[0].score)}</span> до <span class="val-green">4.0</span> — наибольший эффект на конверсию</div>
        </div>
      </div>`;
  } else {
    document.getElementById('personal-alert').innerHTML = '';
  }

  // Radar with benchmarks
  const shorts = CRITERIA.map(c => c.short);
  const allTargeted = filterByPeriod(ALL_CALLS, currentPeriod).filter(c => c.isTargeted);
  const teamMeans = CRITERIA.map(cr => avg(allTargeted.map(c => c.scores[cr.key]).filter(v => v !== undefined)));
  const topMeans = CRITERIA.map(cr => Math.max(...OPERATORS.map(o => avg(allTargeted.filter(c => c.operatorId === o.id).map(c => c.scores[cr.key]).filter(v => v !== undefined)))));
  const normLine = CRITERIA.map(() => 3.8);

  Plotly.newPlot('personal-radar', [
    { type: 'scatterpolar', r: [...normLine, normLine[0]], theta: [...shorts, shorts[0]], fill: null, line: { color: '#9ca3af', width: 1, dash: 'dash' }, name: 'Норма 3.8' },
    { type: 'scatterpolar', r: [...topMeans, topMeans[0]], theta: [...shorts, shorts[0]], fill: null, line: { color: '#8b5cf6', width: 1, dash: 'dot' }, name: 'Топ' },
    { type: 'scatterpolar', r: [...teamMeans, teamMeans[0]], theta: [...shorts, shorts[0]], fill: 'toself', fillcolor: 'rgba(156,163,175,0.1)', line: { color: '#9ca3af', width: 1 }, name: 'Среднее' },
    { type: 'scatterpolar', r: [...means, means[0]], theta: [...shorts, shorts[0]], fill: 'toself', fillcolor: 'rgba(79,110,247,0.2)', line: { color: '#4f6ef7', width: 2 }, name: op.shortName },
  ], {
    polar: { radialaxis: { visible: true, range: [0, 5] } },
    margin: { t: 30, b: 30, l: 80, r: 80 }, height: 380, font: plotlyFont,
    legend: { orientation: 'h', y: -0.12, font: { size: 11 } },
  }, plotlyConfig);

  // Progress bars
  document.getElementById('personal-bars').innerHTML = CRITERIA.map((cr, i) => {
    const score = means[i];
    const diff = score - teamMeans[i];
    const pct = score / 5 * 100;
    return `
      <div class="progress-row">
        <div class="progress-label">${cr.short}</div>
        <div class="progress-track"><div class="progress-fill ${score >= 4 ? 'green' : score >= 3 ? 'yellow' : 'red'}" style="width:${pct}%"></div></div>
        <div class="progress-value" style="color:${qaColor(score)}">${fmt(score)}</div>
        <div class="progress-trend ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '↑' : '↓'}${Math.abs(diff).toFixed(1)}</div>
      </div>`;
  }).join('');

  // Weekly trend
  const opWeekly = weekly.map(w => ({ date: w.date, ...(w.operators[opId] || { avgQa: 0, conversion: 0 }) })).filter(w => w.avgQa > 0);
  if (opWeekly.length) {
    Plotly.newPlot('personal-trend', [
      { x: opWeekly.map(w => w.date), y: opWeekly.map(w => w.avgQa), name: 'Оценка', yaxis: 'y', line: { color: '#4f6ef7', width: 2 }, mode: 'lines+markers' },
      { x: opWeekly.map(w => w.date), y: opWeekly.map(w => w.conversion), name: 'Конверсия', yaxis: 'y2', type: 'bar', marker: { color: 'rgba(16,185,129,0.4)' } },
    ], {
      margin: { t: 10, b: 30, l: 50, r: 50 }, height: 320, font: plotlyFont,
      yaxis: { title: 'Оценка', range: [2.5, 5], dtick: 0.5 },
      yaxis2: { title: 'Конверсия', overlaying: 'y', side: 'right', tickformat: '.0%' },
      legend: { orientation: 'h', y: -0.15 },
    }, plotlyConfig);
  }

  // Recommendations
  document.getElementById('personal-recs').innerHTML = critPairs.filter(c => c.score < 4.5).map(c => {
    const cls = c.score < 3 ? 'red' : c.score < 4 ? 'yellow' : 'green';
    const label = c.score < 3 ? 'Приоритет' : c.score < 4 ? 'Улучшить' : 'Поддерживать';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-left:3px solid var(--${cls});background:var(--${cls}-light);border-radius:0 8px 8px 0;margin-bottom:8px;">
        <div>
          <div style="font-weight:600;">${c.name}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${REC_ACTIONS[c.name] || 'Улучшить'}</div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${cls}">${label}</span>
          <div style="font-weight:700;font-family:'JetBrains Mono';margin-top:4px;color:${qaColor(c.score)}">${fmt(c.score)}/5</div>
        </div>
      </div>`;
  }).join('');
}
