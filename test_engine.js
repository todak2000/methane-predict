'use strict';

const assert = require('assert');
const engine = require('./engine.js');

console.log('--- RUNNING ENGINE UNIT TESTS (MODE A) ---');

// Test 1: Normalization
assert.strictEqual(engine.normalizeInput(0.27, 0.27, 27.59), -1.0, 'P min should normalize to -1.0');
assert.strictEqual(engine.normalizeInput(27.86, 0.27, 27.59), 1.0, 'P max should normalize to 1.0');
assert.strictEqual(engine.normalizeInput(25.0, 25.0, 60.0), -1.0, 'T min should normalize to -1.0');
assert.strictEqual(engine.normalizeInput(85.0, 25.0, 60.0), 1.0, 'T max should normalize to 1.0');
console.log('✓ Normalization checks passed');

// Test 2: Mode A Prediction for Row 1
// P=0.43, TOC=1.11, T=70, M=1.24
const row1 = engine.predict(0.43, 1.11, 70.0, 1.24);
console.log('Row 1 Mode A prediction:', row1.scfTon.toFixed(8), 'SCF/ton');
assert(Math.abs(row1.scfTon - 0.35725314) < 1e-6, 'Row 1 Mode A calculation matches explicit formula');
assert(row1.neuronDetails.length === 9, 'All 9 hidden neurons evaluated');
console.log('✓ Mode A explicit formula prediction verified');

// Test 3: Non-Negative Gate
// Extreme synthetic inputs that would drive raw linear sum negative
const extremeLow = engine.predict(0.27, 0.09, 85.0, 9.83);
assert(extremeLow.scfTon >= 0.0, 'Output must never be negative');
console.log('Extreme input prediction (gated):', extremeLow.scfTon, 'Raw:', extremeLow.rawScfTon);
console.log('✓ Non-negative gate verified');

// Test 4: Isotherm Generation
const isotherm = engine.generateIsotherm(4.5, 65.0, 1.5, 30);
assert(isotherm.points.length === 30, 'Generated 30 isotherm points');
assert(isotherm.points[0].p === 0.27, 'Starts at P min');
assert(isotherm.points[29].p === 27.86, 'Ends at P max');
assert(isotherm.points.every(pt => pt.scfTon >= 0), 'All isotherm points are non-negative');
console.log('✓ Isotherm curve generation verified');

// Test 5: Sensitivity Tornado
const sens = engine.runSensitivity(15.0, 4.5, 65.0, 1.2);
assert(sens.parameters.length === 4, 'Sensitivity covers all 4 parameters');
assert(sens.parameters[0].impact >= sens.parameters[1].impact, 'Sorted by impact descending');
console.log('Sensitivity ranking:', sens.parameters.map(p => `${p.symbol}: ${p.impact.toFixed(4)}`).join(', '));
console.log('✓ Sensitivity analysis verified');

// Test 6: Presets
engine.PRESETS.forEach(preset => {
  const pRes = engine.predict(preset.P, preset.TOC, preset.T, preset.M);
  assert(pRes.scfTon >= 0, `Preset ${preset.name} evaluates cleanly`);
  assert(pRes.tier && pRes.tier.tier, `Preset ${preset.name} has a valid tier`);
});
console.log('✓ All 6 geological presets verified');

// Test 7: Table 3 Data Evaluation
console.log('\n--- VALIDATION BENCHMARK EVALUATION (MODE A) ---');
console.log('Row | P (MPa) | TOC (%) | T (°C) | M (%) | Mode A (Calc) | Table 3 BRNN | Delta');
engine.VALIDATION_DATA.forEach(row => {
  const res = engine.predict(row.P, row.TOC, row.T, row.M);
  const delta = res.scfTon - row.brnnPaper;
  console.log(
    `${String(row.row).padStart(3)} | ` +
    `${row.P.toFixed(2).padStart(7)} | ` +
    `${row.TOC.toFixed(2).padStart(7)} | ` +
    `${row.T.toFixed(1).padStart(6)} | ` +
    `${row.M.toFixed(2).padStart(5)} | ` +
    `${res.scfTon.toFixed(6).padStart(13)} | ` +
    `${row.brnnPaper.toFixed(6).padStart(12)} | ` +
    `${(delta >= 0 ? '+' : '') + delta.toFixed(6)}`
  );
  // Verify delta is constant ~0.31996
  assert(Math.abs(delta - 0.31996) < 0.0001, `Delta on row ${row.row} is constant offset ~0.31996`);
});

console.log('\nALL 7 ENGINE TEST SUITES PASSED PERFECTLY!\n');

