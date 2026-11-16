'use strict';

/**
 * CH4 PREDICT — Application Controller
 * Handles interactive UI, Chart.js Isotherm, Neuron visualizer, and Batch processing.
 */

(function () {
  // Global State
  const state = {
    P: 15.00,
    TOC: 4.50,
    T: 65.0,
    M: 1.20,
    selectedUnit: 'scfTon', // 'scfTon' | 'cm3g'
    theme: 'dark',
    chart: null
  };

  // DOM Elements Cache
  const els = {
    paramContainer: document.getElementById('param-controls-container'),
    presetsContainer: document.getElementById('presets-container'),
    domainAlerts: document.getElementById('domain-alerts-container'),
    heroValue: document.getElementById('hero-value'),
    heroUnitLabel: document.getElementById('hero-unit-label'),
    heroTierBadge: document.getElementById('hero-tier-badge'),
    heroTierDesc: document.getElementById('hero-tier-desc'),
    metricSlope: document.getElementById('metric-slope'),
    metricVol: document.getElementById('metric-vol'),
    metricYn: document.getElementById('metric-yn'),
    tornadoContainer: document.getElementById('tornado-container'),
    neuronGrid: document.getElementById('neuron-grid-container'),
    neuronSumBadge: document.getElementById('neuron-sum-badge'),
    validationTableBody: document.getElementById('validation-table-body'),
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
    resetBtn: document.getElementById('btn-reset'),
    copyBtn: document.getElementById('btn-copy-result'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    csvInput: document.getElementById('csv-input'),
    csvOutput: document.getElementById('csv-output'),
    batchRunBtn: document.getElementById('btn-batch-run'),
    batchSampleBtn: document.getElementById('btn-batch-sample'),
    batchDownloadBtn: document.getElementById('btn-batch-download')
  };

  // 1. Initialization
  function init() {
    initTheme();
    renderParamControls();
    renderPresets();
    initChart();
    renderValidationTable();
    setupEventListeners();
    updateAll();

    // Render KaTeX if available
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  // 2. Theme Handling
  function initTheme() {
    const saved = localStorage.getItem('ch4_theme') || 'dark';
    setTheme(saved);
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ch4_theme', theme);

    if (theme === 'light') {
      els.themeIconSun.style.display = 'none';
      els.themeIconMoon.style.display = 'block';
    } else {
      els.themeIconSun.style.display = 'block';
      els.themeIconMoon.style.display = 'none';
    }

    if (state.chart) {
      updateChartTheme();
      state.chart.update();
    }
  }

  function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  // 3. Render Parameter Controls
  function renderParamControls() {
    els.paramContainer.innerHTML = '';

    PARAMS.forEach(param => {
      const group = document.createElement('div');
      group.className = 'param-group';
      group.setAttribute('data-param-id', param.id);

      const val = state[param.id];
      const fillPct = ((val - param.min) / param.span) * 100;

      group.innerHTML = `
        <div class="param-top">
          <div class="param-label-wrap">
            <span class="param-name">${param.label}</span>
            <span class="param-sym mono">(${param.symbol})</span>
          </div>
          <span class="param-value-badge mono" id="${param.id}-badge">${val.toFixed(2)} ${param.unit}</span>
        </div>
        <div class="param-slider-wrap">
          <input
            type="range"
            class="param-slider"
            id="${param.id}-slider"
            min="${param.min}"
            max="${param.max}"
            step="${param.step}"
            value="${val}"
            style="--fill-pct: ${fillPct}%"
            aria-label="${param.label}"
          />
          <div class="param-num-wrap">
            <input
              type="number"
              class="param-num-input mono"
              id="${param.id}-number"
              min="${param.min}"
              max="${param.max}"
              step="${param.step}"
              value="${val.toFixed(2)}"
              aria-label="${param.label} numeric input"
            />
          </div>
        </div>
        <div class="param-bounds">
          <span class="mono">${param.min} ${param.unit}</span>
          <span style="font-size:0.68rem; color:var(--text-muted);">${param.description}</span>
          <span class="mono">${param.max} ${param.unit}</span>
        </div>
      `;

      els.paramContainer.appendChild(group);

      // Event bindings
      const slider = group.querySelector(`#${param.id}-slider`);
      const number = group.querySelector(`#${param.id}-number`);

      slider.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        state[param.id] = v;
        number.value = v.toFixed(2);
        updateSliderFill(slider, v, param.min, param.span);
        updateAll();
      });

      number.addEventListener('change', e => {
        let v = parseFloat(e.target.value);
        if (isNaN(v)) v = param.def;
        v = Math.max(param.min, Math.min(param.max, v));
        state[param.id] = v;
        slider.value = v;
        number.value = v.toFixed(2);
        updateSliderFill(slider, v, param.min, param.span);
        updateAll();
      });
    });
  }

  function updateSliderFill(slider, val, min, span) {
    const pct = ((val - min) / span) * 100;
    slider.style.setProperty('--fill-pct', `${pct}%`);
  }

  // 4. Presets Render
  function renderPresets() {
    els.presetsContainer.innerHTML = '';

    PRESETS.forEach((preset, idx) => {
      const chip = document.createElement('button');
      chip.className = `preset-chip ${idx === 0 ? 'active' : ''}`;
      chip.textContent = preset.name;
      chip.title = `${preset.desc} — P:${preset.P}MPa, TOC:${preset.TOC}%, T:${preset.T}°C, M:${preset.M}%`;

      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadPreset(preset);
      });

      els.presetsContainer.appendChild(chip);
    });
  }

  function loadPreset(preset) {
    state.P = preset.P;
    state.TOC = preset.TOC;
    state.T = preset.T;
    state.M = preset.M;

    // Synchronize UI
    PARAMS.forEach(p => {
      const slider = document.getElementById(`${p.id}-slider`);
      const number = document.getElementById(`${p.id}-number`);
      if (slider && number) {
        slider.value = state[p.id];
        number.value = state[p.id].toFixed(2);
        updateSliderFill(slider, state[p.id], p.min, p.span);
      }
    });

    updateAll();
  }

  // 5. Chart.js Adsorption Isotherm
  function initChart() {
    const ctx = document.getElementById('isothermChart').getContext('2d');
    const isDark = state.theme === 'dark';

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'BRNN Adsorption Isotherm',
            data: [],
            borderColor: '#00F0FF',
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.25,
            fill: true,
            backgroundColor: function (context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, isDark ? 'rgba(0, 240, 255, 0.20)' : 'rgba(0, 140, 163, 0.15)');
              gradient.addColorStop(1, 'rgba(0, 240, 255, 0.00)');
              return gradient;
            }
          },
          {
            label: 'Operating Point',
            data: [],
            type: 'scatter',
            borderColor: '#10B981',
            backgroundColor: '#10B981',
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderWidth: 2,
            pointBorderColor: '#FFFFFF',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 180 },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(8, 13, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#F1F5F9' : '#0F172A',
            bodyColor: isDark ? '#94A3B8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (context) {
                const p = context.parsed.x.toFixed(2);
                const v = context.parsed.y.toFixed(4);
                const unit = state.selectedUnit === 'scfTon' ? 'SCF/ton' : 'cm³/g';
                return `P: ${p} MPa | Adsorption: ${v} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: 30,
            title: {
              display: true,
              text: 'Pore Pressure P (MPa)',
              color: isDark ? '#64748B' : '#94A3B8',
              font: { size: 11, weight: '600' }
            },
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
            ticks: { color: isDark ? '#64748B' : '#64748B' }
          },
          y: {
            min: 0,
            title: {
              display: true,
              text: state.selectedUnit === 'scfTon' ? 'Adsorption (SCF/ton)' : 'Adsorption (cm³/g)',
              color: isDark ? '#64748B' : '#94A3B8',
              font: { size: 11, weight: '600' }
            },
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
            ticks: { color: isDark ? '#64748B' : '#64748B' }
          }
        }
      }
    });
  }

  function updateChartTheme() {
    const isDark = state.theme === 'dark';
    if (!state.chart) return;

    state.chart.options.scales.x.grid.color = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    state.chart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    state.chart.options.scales.x.ticks.color = isDark ? '#64748B' : '#64748B';
    state.chart.options.scales.y.ticks.color = isDark ? '#64748B' : '#64748B';
    state.chart.options.scales.y.title.text = state.selectedUnit === 'scfTon' ? 'Adsorption (SCF/ton)' : 'Adsorption (cm³/g)';
  }

  // 6. Master Update Loop
  function updateAll() {
    // 6.1 Update badges
    PARAMS.forEach(p => {
      const badge = document.getElementById(`${p.id}-badge`);
      if (badge) {
        badge.textContent = `${state[p.id].toFixed(2)} ${p.unit}`;
      }
    });

    // 6.2 Compute Core Prediction
    const pred = predict(state.P, state.TOC, state.T, state.M);

    // 6.3 Hero HUD
    const dispVal = state.selectedUnit === 'scfTon' ? pred.scfTon : pred.cm3g;
    els.heroValue.textContent = dispVal.toFixed(4);
    els.heroUnitLabel.textContent = state.selectedUnit === 'scfTon' ? 'SCF/ton' : 'cm³/g';

    els.heroTierBadge.textContent = pred.tier.tier;
    els.heroTierBadge.style.color = pred.tier.color;
    els.heroTierBadge.style.borderColor = pred.tier.color;
    els.heroTierDesc.textContent = pred.tier.desc;

    // 6.4 Additional Engineering Metrics
    const isothermData = generateIsotherm(state.TOC, state.T, state.M, 60);
    // Find closest slope metric to current P
    let closestSlope = 0;
    let minDiff = Infinity;
    isothermData.slopeMetrics.forEach(sm => {
      const diff = Math.abs(sm.p - state.P);
      if (diff < minDiff) {
        minDiff = diff;
        closestSlope = sm.slope;
      }
    });

    els.metricSlope.textContent = `${closestSlope >= 0 ? '+' : ''}${closestSlope.toFixed(4)} SCF/(ton·MPa)`;
    els.metricVol.textContent = `${pred.units.m3Ton.toFixed(4)} m³/ton`;
    els.metricYn.textContent = pred.normOutput.toFixed(4);

    // 6.5 Update Isotherm Chart
    if (state.chart) {
      const curveData = isothermData.points.map(pt => ({
        x: pt.p,
        y: state.selectedUnit === 'scfTon' ? pt.scfTon : pt.cm3g
      }));

      const opPoint = [
        {
          x: state.P,
          y: state.selectedUnit === 'scfTon' ? pred.scfTon : pred.cm3g
        }
      ];

      state.chart.data.datasets[0].data = curveData;
      state.chart.data.datasets[1].data = opPoint;
      state.chart.options.scales.y.title.text = state.selectedUnit === 'scfTon' ? 'Adsorption (SCF/ton)' : 'Adsorption (cm³/g)';
      state.chart.update('none');
    }

    // 6.6 Tornado Sensitivity
    updateTornado();

    // 6.7 Neuron Insights
    updateNeuronInsights(pred);

    // 6.8 Domain Alerts
    updateDomainAlerts();
  }

  // 7. Tornado Sensitivity Render
  function updateTornado() {
    const sens = runSensitivity(state.P, state.TOC, state.T, state.M);
    els.tornadoContainer.innerHTML = '';

    const maxDelta = Math.max(
      ...sens.parameters.map(p => Math.max(Math.abs(p.lowDelta), Math.abs(p.highDelta))),
      0.001
    );

    sens.parameters.forEach(p => {
      const row = document.createElement('div');
      row.className = 'tornado-row';

      const negPct = (Math.abs(Math.min(0, p.lowDelta, p.highDelta)) / maxDelta) * 50;
      const posPct = (Math.max(0, p.lowDelta, p.highDelta) / maxDelta) * 50;

      row.innerHTML = `
        <span class="tornado-name">${p.label} <span class="mono">(${p.symbol})</span></span>
        <div class="tornado-bar-track">
          <div class="tornado-center-line"></div>
          <div class="tornado-bar-neg" style="width: ${negPct}%"></div>
          <div class="tornado-bar-pos" style="width: ${posPct}%"></div>
        </div>
        <span class="tornado-score mono">±${p.impact.toFixed(3)}</span>
      `;

      els.tornadoContainer.appendChild(row);
    });
  }

  // 8. Neuron Diagnostics Render
  function updateNeuronInsights(pred) {
    els.neuronSumBadge.textContent = `∑ H_i: ${pred.sumH.toFixed(4)}`;
    els.neuronGrid.innerHTML = '';

    // Max absolute activation for scaling bars
    const maxAct = Math.max(...pred.neuronDetails.map(n => Math.abs(n.activation)), 0.1);

    pred.neuronDetails.forEach(n => {
      const card = document.createElement('div');
      card.className = 'neuron-card';

      const isPos = n.activation >= 0;
      const pct = (Math.abs(n.activation) / maxAct) * 100;
      const color = isPos ? 'var(--emerald)' : 'var(--rose)';

      card.innerHTML = `
        <div class="neuron-card-header">
          <span class="neuron-id mono">Neuron H_${n.id}</span>
          <span class="neuron-activation-pill mono" style="color:${color};">
            ${isPos ? '+' : ''}${n.activation.toFixed(4)}
          </span>
        </div>
        <div class="neuron-bar-track">
          <div class="neuron-bar-fill" style="width:${pct}%; left:0; background:${color};"></div>
        </div>
        <div class="neuron-meta-row mono">
          <span>z = ${n.z.toFixed(3)}</span>
          <span>tanh(z) = ${n.tanhVal.toFixed(3)}</span>
          <span>s = ${n.scale.toFixed(4)}</span>
        </div>
      `;

      els.neuronGrid.appendChild(card);
    });
  }

  // 9. Domain Alerts
  function updateDomainAlerts() {
    const warnings = checkDomain(state.P, state.TOC, state.T, state.M);
    els.domainAlerts.innerHTML = '';

    warnings.forEach(w => {
      const div = document.createElement('div');
      div.className = `alert-item ${w.type === 'danger' ? 'alert-danger' : 'alert-warning'}`;
      div.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span><strong>${w.label}:</strong> ${w.msg}</span>
      `;
      els.domainAlerts.appendChild(div);
    });
  }

  // 10. Table 3 Benchmark Render
  function renderValidationTable() {
    els.validationTableBody.innerHTML = '';

    VALIDATION_DATA.forEach(row => {
      const calc = predict(row.P, row.TOC, row.T, row.M);
      const delta = calc.scfTon - row.brnnPaper;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${row.row}</td>
        <td class="mono">${row.P.toFixed(2)}</td>
        <td class="mono">${row.TOC.toFixed(2)}</td>
        <td class="mono">${row.T.toFixed(1)}</td>
        <td class="mono">${row.M.toFixed(2)}</td>
        <td class="mono" style="font-weight:600; color:var(--accent);">${calc.scfTon.toFixed(6)}</td>
        <td class="mono" style="color:var(--text-muted);">${row.brnnPaper.toFixed(6)}</td>
        <td><span class="delta-pill mono">+${delta.toFixed(6)}</span></td>
        <td>
          <button class="action-btn-sm" data-load-row="${row.row}">Load</button>
        </td>
      `;

      tr.querySelector(`[data-load-row="${row.row}"]`).addEventListener('click', () => {
        state.P = row.P;
        state.TOC = row.TOC;
        state.T = row.T;
        state.M = row.M;

        // Switch to Predictor Tab
        switchTab('tab-predictor');

        // Update inputs
        PARAMS.forEach(p => {
          const slider = document.getElementById(`${p.id}-slider`);
          const number = document.getElementById(`${p.id}-number`);
          if (slider && number) {
            slider.value = state[p.id];
            number.value = state[p.id].toFixed(2);
            updateSliderFill(slider, state[p.id], p.min, p.span);
          }
        });

        updateAll();
      });

      els.validationTableBody.appendChild(tr);
    });
  }

  // 11. Tab Switching
  function switchTab(targetId) {
    els.tabBtns.forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === targetId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    els.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });

    // Auto-render KaTeX if equations tab selected
    if (targetId === 'tab-equations' && window.renderMathInElement) {
      renderMathInElement(document.getElementById('tab-equations'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  // 12. Batch CSV Processing
  function handleBatchRun() {
    const text = els.csvInput.value.trim();
    if (!text) {
      alert('Please enter or paste CSV lines (P, TOC, T, M).');
      return;
    }

    const lines = text.split('\n');
    const results = [];
    results.push('P_MPa,TOC_pct,T_degC,M_pct,Adsorption_SCF_ton,Adsorption_cm3_g,Storage_Tier');

    let processedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('P') || line.startsWith('#')) continue;

      const parts = line.split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 4 && parts.every(p => !isNaN(p))) {
        const [p, toc, t, m] = parts;
        const res = predict(p, toc, t, m);
        results.push(
          `${p.toFixed(2)},${toc.toFixed(2)},${t.toFixed(1)},${m.toFixed(2)},` +
          `${res.scfTon.toFixed(6)},${res.cm3g.toFixed(6)},"${res.tier.tier}"`
        );
        processedCount++;
      }
    }

    els.csvOutput.value = results.join('\n');
    els.batchDownloadBtn.style.display = processedCount > 0 ? 'inline-block' : 'none';
  }

  function handleBatchSample() {
    const sample = [
      '# Pore Pressure (MPa), TOC (%), Temperature (°C), Moisture (%)',
      '15.00, 4.50, 65.0, 1.20',
      '22.80, 6.20, 55.0, 0.85',
      '26.50, 3.80, 82.0, 0.50',
      '14.20, 5.50, 68.0, 1.60',
      '18.50, 3.20, 75.0, 1.10',
      '03.20, 1.50, 32.0, 3.50',
      '00.80, 1.11, 70.0, 1.24',
      '08.48, 1.11, 70.0, 1.24',
      '27.86, 4.03, 85.0, 0.26'
    ].join('\n');

    els.csvInput.value = sample;
    handleBatchRun();
  }

  function handleBatchDownload() {
    const text = els.csvOutput.value;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CH4_Adsorption_Batch_ModeA_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 13. Event Listeners
  function setupEventListeners() {
    // Tabs
    els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Units
    els.unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedUnit = btn.getAttribute('data-unit');
        updateAll();
      });
    });

    // Theme Toggle
    els.themeToggleBtn.addEventListener('click', toggleTheme);

    // Reset Defaults
    els.resetBtn.addEventListener('click', () => {
      loadPreset(PRESETS[0]);
    });

    // Copy Result
    els.copyBtn.addEventListener('click', () => {
      const pred = predict(state.P, state.TOC, state.T, state.M);
      const text =
        `CH4 Adsorption Prediction (Mode A):\n` +
        `Pressure: ${state.P.toFixed(2)} MPa\n` +
        `TOC: ${state.TOC.toFixed(2)} %\n` +
        `Temperature: ${state.T.toFixed(1)} °C\n` +
        `Moisture: ${state.M.toFixed(2)} %\n` +
        `Predicted Capacity: ${pred.scfTon.toFixed(6)} SCF/ton (${pred.cm3g.toFixed(6)} cm³/g)\n` +
        `Adsorption Tier: ${pred.tier.tier}`;

      navigator.clipboard.writeText(text).then(() => {
        const originalSvg = els.copyBtn.innerHTML;
        els.copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--emerald);"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          els.copyBtn.innerHTML = originalSvg;
        }, 1600);
      });
    });

    // Batch Controls
    els.batchRunBtn.addEventListener('click', handleBatchRun);
    els.batchSampleBtn.addEventListener('click', handleBatchSample);
    els.batchDownloadBtn.addEventListener('click', handleBatchDownload);

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'r' || e.key === 'R') {
        loadPreset(PRESETS[0]);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const tabIds = ['tab-predictor', 'tab-neurons', 'tab-validation', 'tab-batch', 'tab-equations'];
        switchTab(tabIds[parseInt(e.key) - 1]);
      }
    });
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

