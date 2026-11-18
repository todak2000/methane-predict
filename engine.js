'use strict';

/**
 * Methane Adsorption in Gas Shale Reservoir Calculator
 * Explicit Bayesian Regularized Neural Network (BRNN) Model (Dr. Okorie)
 * Architecture: 4 Inputs -> 9 Hidden Neurons (tanh) -> 1 Output
 */

// Model Parameters and Input Bounds
const PARAMS = [
  {
    id: 'P',
    label: 'Pore Pressure',
    symbol: 'P',
    unit: 'MPa',
    min: 0.27,
    max: 27.86,
    span: 27.59,
    def: 12.00,
    step: 0.05,
    group: 'reservoir',
    description: 'In-situ pore fluid pressure in megapascals.'
  },
  {
    id: 'TOC',
    label: 'Total Organic Carbon',
    symbol: 'TOC',
    unit: '%',
    min: 0.09,
    max: 11.90,
    span: 11.81,
    def: 4.20,
    step: 0.05,
    group: 'geochemical',
    description: 'Organic richness of the shale matrix in weight percentage.'
  },
  {
    id: 'T',
    label: 'Reservoir Temperature',
    symbol: 'T',
    unit: '°C',
    min: 25.0,
    max: 85.0,
    span: 60.0,
    def: 65.0,
    step: 0.5,
    group: 'reservoir',
    description: 'Subsurface formation temperature in degrees Celsius.'
  },
  {
    id: 'M',
    label: 'Moisture Content',
    symbol: 'M',
    unit: '%',
    min: 0.13,
    max: 9.83,
    span: 9.70,
    def: 1.50,
    step: 0.05,
    group: 'petrophysical',
    description: 'Equilibrium moisture/water saturation in weight percentage.'
  }
];

// 9 Hidden Neurons: weights w = [w_P, w_TOC, w_T, w_M], bias b, scale factor s
const NEURONS = [
  { id: 1, s:  4.3454, b:  0.1364, w: [ 0.463864, -0.311330,  0.344959, -3.120020] },
  { id: 2, s: -2.3848, b:  1.5674, w: [-0.581340,  3.884372, -3.358040, -3.561200] },
  { id: 3, s:  1.0787, b:  1.6986, w: [ 2.063359, -1.367430,  0.017287, -0.818360] },
  { id: 4, s:  7.2983, b: -0.0611, w: [-0.558880,  3.675293, -3.624960, -5.467990] },
  { id: 5, s:  2.6694, b: -2.9299, w: [-0.348320, -1.058930, -4.058620,  3.986044] },
  { id: 6, s: -2.5638, b: -3.5087, w: [-0.543410, -6.085160,  2.800065, -1.959760] },
  { id: 7, s: -2.4732, b:  3.2086, w: [ 0.726167,  5.449910, -3.538790,  2.364884] },
  { id: 8, s:  4.5911, b:  0.8407, w: [ 0.593457, -3.938350,  4.100349,  6.917117] },
  { id: 9, s:  0.3444, b:  3.8238, w: [ 0.528816,  0.545323,  1.302212,  4.240496] }
];

// Model Denormalization Constants (Explicit Formula — Corrected b2 = -3.5352)
const OUTPUT_BIAS_NORM = -3.5352;
const DENORM_SLOPE     =  1.6150;
const DENORM_INTERCEPT =  1.6150;

// Residual Quantile Offsets for Predictive Uncertainty (Dr. Okorie Model)
const P10_OFFSET = -0.052685;
const P50_OFFSET =  0.000445;
const P90_OFFSET =  0.033200;

// Conversion factor: 1 SCF/ton = 0.03121404 cm³/g (or cc/g)
const SCF_TO_CM3G = 0.03121404;

// Typical North American & Global Shale Gas Presets
const PRESETS = [
  {
    name: 'Barnett Baseline',
    desc: 'Fort Worth Basin, TX — Classic Mississippian siliceous shale',
    P: 15.00, TOC: 4.50, T: 65.0, M: 1.20
  },
  {
    name: 'Marcellus Deep',
    desc: 'Appalachian Basin, PA/WV — High-TOC Devonian black shale',
    P: 22.80, TOC: 6.20, T: 55.0, M: 0.85
  },
  {
    name: 'Haynesville HPHT',
    desc: 'Gulf Coast Basin, TX/LA — High Pressure, High Temperature dry gas',
    P: 26.50, TOC: 3.80, T: 82.0, M: 0.50
  },
  {
    name: 'Woodford Organic Core',
    desc: 'Anadarko/Arkoma Basin, OK — Pyrite & organic matter rich',
    P: 14.20, TOC: 5.50, T: 68.0, M: 1.60
  },
  {
    name: 'Eagle Ford Gas Window',
    desc: 'South Texas — Calcareous organic mudstone, condensate-gas zone',
    P: 18.50, TOC: 3.20, T: 75.0, M: 1.10
  },
  {
    name: 'Shallow Transition',
    desc: 'Near-surface sub-crop / lower maturity test point',
    P: 3.20, TOC: 1.50, T: 32.0, M: 3.50
  }
];

// Published 14 Validation Benchmark Points (Dr. Okorie Document Page 3)
const VALIDATION_DATA = [
  { row: 1,  P: 0.43,  TOC: 1.11, T: 70.0, M: 1.24, brnnPaper: 0.037287181 },
  { row: 2,  P: 0.80,  TOC: 1.11, T: 70.0, M: 1.24, brnnPaper: 0.064870765 },
  { row: 3,  P: 5.72,  TOC: 1.11, T: 70.0, M: 1.24, brnnPaper: 0.293011250 },
  { row: 4,  P: 8.48,  TOC: 1.11, T: 70.0, M: 1.24, brnnPaper: 0.354879804 },
  { row: 5,  P: 16.37, TOC: 1.11, T: 70.0, M: 1.24, brnnPaper: 0.421304780 },
  { row: 6,  P: 0.88,  TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.021161069 },
  { row: 7,  P: 1.63,  TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.099410967 },
  { row: 8,  P: 3.17,  TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.221875981 },
  { row: 9,  P: 6.21,  TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.358086384 },
  { row: 10, P: 9.20,  TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.418219037 },
  { row: 11, P: 13.08, TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.455943676 },
  { row: 12, P: 22.86, TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.543231805 },
  { row: 13, P: 27.86, TOC: 4.03, T: 85.0, M: 0.26, brnnPaper: 0.601595925 },
  { row: 14, P: 0.86,  TOC: 1.73, T: 67.0, M: 0.55, brnnPaper: 0.075049226 }
];

/**
 * Normalization helper: maps physical value to [-1, 1]
 */
function normalizeInput(val, min, span) {
  return 2.0 * ((val - min) / span) - 1.0;
}

/**
 * Denormalization helper: maps normalized value to physical
 */
function denormalizeInput(norm, min, span) {
  return ((norm + 1.0) / 2.0) * span + min;
}

/**
 * Qualitative Adsorption Tier
 */
function getAdsorptionTier(scfTon) {
  if (scfTon < 0.20) {
    return {
      tier: 'Trace / Marginal',
      color: '#64748B',
      desc: 'Extremely lean gas adsorption, typical of immature or high moisture shales.'
    };
  }
  if (scfTon < 0.50) {
    return {
      tier: 'Moderate Capacity',
      color: '#38BDF8',
      desc: 'Typical mid-grade organic shale gas retention under reservoir conditions.'
    };
  }
  if (scfTon < 0.85) {
    return {
      tier: 'High Capacity',
      color: '#10B981',
      desc: 'Commercial shale play sweet-spot with substantial adsorbed gas inventory.'
    };
  }
  return {
    tier: 'Exceptional Storage',
    color: '#00F0FF',
    desc: 'High TOC, optimal thermobaric conditions maximizing storage density.'
  };
}

/**
 * Core Neural Network Computation (Explicit Formula verbatim)
 */
function predictCore(P, TOC, T, M) {
  // Input normalization
  const Pn   = normalizeInput(P,   0.27, 27.59);
  const TOCn = normalizeInput(TOC, 0.09, 11.81);
  const Tn   = normalizeInput(T,   25.0, 60.00);
  const Mn   = normalizeInput(M,   0.13,  9.70);

  const xn = [Pn, TOCn, Tn, Mn];

  // Hidden neurons activation
  let sumH = 0.0;
  const neuronDetails = [];

  for (let i = 0; i < NEURONS.length; i++) {
    const n = NEURONS[i];
    let z = n.b;
    z += n.w[0] * xn[0];
    z += n.w[1] * xn[1];
    z += n.w[2] * xn[2];
    z += n.w[3] * xn[3];

    const tanhVal = Math.tanh(z);
    const h = n.s * tanhVal;
    sumH += h;

    neuronDetails.push({
      id: n.id,
      scale: n.s,
      z: z,
      tanhVal: tanhVal,
      activation: h
    });
  }

  // Normalized output sum
  const normOutput = sumH + OUTPUT_BIAS_NORM;

  // Denormalization
  const rawAdsorption = DENORM_SLOPE * normOutput + DENORM_INTERCEPT;

  // Non-negative gate function
  const finalAdsorption = Math.max(0.0, rawAdsorption);

  return {
    scfTon: finalAdsorption,
    rawScfTon: rawAdsorption,
    cm3g: finalAdsorption * SCF_TO_CM3G,
    rawCm3g: rawAdsorption * SCF_TO_CM3G,
    normOutput: normOutput,
    sumH: sumH,
    neuronDetails: neuronDetails,
    normalizedInputs: { Pn, TOCn, Tn, Mn }
  };
}

/**
 * Full Prediction with diagnostics, tier, predictive quantiles, and engineering conversions
 */
function predict(P, TOC, T, M) {
  const core = predictCore(P, TOC, T, M);
  const tier = getAdsorptionTier(core.scfTon);

  // Predictive Quantiles (Residual Quantiles from Dr. Okorie Model)
  const p10_scf = Math.max(0.0, core.scfTon + P10_OFFSET);
  const p50_scf = Math.max(0.0, core.scfTon + P50_OFFSET);
  const p90_scf = Math.max(0.0, core.scfTon + P90_OFFSET);

  const quantiles = {
    p10: {
      scfTon: p10_scf,
      cm3g: p10_scf * SCF_TO_CM3G,
      label: 'P10 (Conservative / 90% Exceedance)'
    },
    p50: {
      scfTon: p50_scf,
      cm3g: p50_scf * SCF_TO_CM3G,
      label: 'P50 (Median Expected)'
    },
    p90: {
      scfTon: p90_scf,
      cm3g: p90_scf * SCF_TO_CM3G,
      label: 'P90 (Optimistic / Upside)'
    },
    spreadScf: p90_scf - p10_scf,
    spreadCm3g: (p90_scf - p10_scf) * SCF_TO_CM3G
  };

  return {
    ...core,
    tier: tier,
    quantiles: quantiles,
    units: {
      scfTon: core.scfTon,
      cm3g: core.cm3g,
      m3Ton: core.scfTon * 0.03121404 * 1.0, // m3/ton = cm3/g * 1.0 at standard rock density
      langmuirRel: core.scfTon / 1.0 // relative index
    }
  };
}

/**
 * Generate full Adsorption Isotherm curve (P from 0.27 to 28 MPa at fixed TOC, T, M)
 */
function generateIsotherm(TOC, T, M, steps = 60) {
  const pMin = 0.27;
  const pMax = 27.86;
  const stepSize = (pMax - pMin) / (steps - 1);
  const points = [];

  for (let i = 0; i < steps; i++) {
    const p = pMin + i * stepSize;
    const res = predictCore(p, TOC, T, M);
    const p10 = Math.max(0.0, res.scfTon + P10_OFFSET);
    const p90 = Math.max(0.0, res.scfTon + P90_OFFSET);

    points.push({
      p: Math.round(p * 100) / 100,
      scfTon: res.scfTon,
      cm3g: res.cm3g,
      p10Scf: p10,
      p90Scf: p90,
      p10Cm3g: p10 * SCF_TO_CM3G,
      p90Cm3g: p90 * SCF_TO_CM3G
    });
  }

  // Numerical derivative dV/dP at midpoint for reservoir draw-down insights
  const slopeMetrics = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dp = points[i + 1].p - points[i].p;
    const dv = points[i + 1].scfTon - points[i].scfTon;
    slopeMetrics.push({
      p: (points[i + 1].p + points[i].p) / 2,
      slope: dv / dp
    });
  }

  return { points, slopeMetrics };
}

/**
 * Tornado Sensitivity Analysis (+/- 10% parameter perturbation)
 */
function runSensitivity(P, TOC, T, M) {
  const base = { P, TOC, T, M };
  const baseRes = predictCore(P, TOC, T, M).scfTon;

  const results = PARAMS.map(param => {
    const val = base[param.id];
    const span = param.max - param.min;
    // 10% span perturbation or at least 2*step
    const delta = Math.max(span * 0.10, param.step * 2);

    const valLow = Math.max(param.min, val - delta);
    const valHigh = Math.min(param.max, val + delta);

    const resLow = predictCore(
      param.id === 'P' ? valLow : base.P,
      param.id === 'TOC' ? valLow : base.TOC,
      param.id === 'T' ? valLow : base.T,
      param.id === 'M' ? valLow : base.M
    ).scfTon;

    const resHigh = predictCore(
      param.id === 'P' ? valHigh : base.P,
      param.id === 'TOC' ? valHigh : base.TOC,
      param.id === 'T' ? valHigh : base.T,
      param.id === 'M' ? valHigh : base.M
    ).scfTon;

    const lowDelta = resLow - baseRes;
    const highDelta = resHigh - baseRes;
    const totalImpact = Math.abs(highDelta) + Math.abs(lowDelta);

    return {
      id: param.id,
      label: param.label,
      symbol: param.symbol,
      unit: param.unit,
      current: val,
      lowVal: valLow,
      highVal: valHigh,
      resLow: resLow,
      resHigh: resHigh,
      lowDelta: lowDelta,
      highDelta: highDelta,
      impact: totalImpact
    };
  });

  // Sort descending by total impact
  results.sort((a, b) => b.impact - a.impact);

  return {
    baseline: baseRes,
    parameters: results
  };
}

/**
 * Physical Domain Boundary Warnings
 */
function checkDomain(P, TOC, T, M) {
  const warnings = [];
  const vals = { P, TOC, T, M };
  const THRESHOLD = 0.02; // 2% margin from boundary

  for (const param of PARAMS) {
    const val = vals[param.id];
    if (val < param.min) {
      warnings.push({
        id: param.id,
        label: param.label,
        type: 'danger',
        msg: `Below training minimum (${param.min} ${param.unit}). Extrapolation outside model validity.`
      });
    } else if (val > param.max) {
      warnings.push({
        id: param.id,
        label: param.label,
        type: 'danger',
        msg: `Exceeds training maximum (${param.max} ${param.unit}). Extrapolation outside model validity.`
      });
    } else {
      const distMin = (val - param.min) / param.span;
      const distMax = (param.max - val) / param.span;
      if (distMin < THRESHOLD) {
        warnings.push({
          id: param.id,
          label: param.label,
          type: 'warning',
          msg: `Near lower boundary (${param.min} ${param.unit}). Precision may be constrained.`
        });
      } else if (distMax < THRESHOLD) {
        warnings.push({
          id: param.id,
          label: param.label,
          type: 'warning',
          msg: `Near upper boundary (${param.max} ${param.unit}). Precision may be constrained.`
        });
      }
    }
  }

  return warnings;
}

// Export for Node.js test runner and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PARAMS,
    NEURONS,
    OUTPUT_BIAS_NORM,
    DENORM_SLOPE,
    DENORM_INTERCEPT,
    P10_OFFSET,
    P50_OFFSET,
    P90_OFFSET,
    SCF_TO_CM3G,
    PRESETS,
    VALIDATION_DATA,
    normalizeInput,
    denormalizeInput,
    predictCore,
    predict,
    generateIsotherm,
    runSensitivity,
    checkDomain,
    getAdsorptionTier
  };
}

