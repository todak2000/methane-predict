# CH4 Predict — Engineering Guide & User Manual

**Application:** Methane Adsorption in Gas Shale Intelligence  
**Model:** Explicit Bayesian Regularized Neural Network (BRNN) with 4 inputs, 9 hidden neurons ($\tanh$), 1 output  
**Source Document:** *Methane Adsorption in Shale Calculator* — Dr. Okorie  
**Operational Formulation:** Mode A (Published Explicit Formula)

---

## 1. Quick Start / Running Locally

### Option A: Direct Browser Launch (Zero Installation)
Simply open `index.html` in your browser:
```bash
open methane-predict/index.html
```

### Option B: Local Web Server (Recommended)
```bash
cd methane-predict
python3 -m http.server 8000
```
Then navigate to: `http://localhost:8000`

---

## 2. Model Parameters & Operational Bounds

| Parameter | Symbol | Unit | Min | Max | Default | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Pore Pressure** | $P$ | MPa | 0.27 | 27.86 | 15.00 | Reservoir in-situ fluid pore pressure |
| **Total Organic Carbon** | $TOC$ | wt.% | 0.09 | 11.90 | 4.50 | Organic richness of the shale matrix |
| **Reservoir Temperature** | $T$ | °C | 25.0 | 85.0 | 65.0 | Subsurface formation temperature |
| **Moisture Content** | $M$ | wt.% | 0.13 | 9.83 | 1.20 | Equilibrium water saturation / moisture |

---

## 3. Mode A Explicit Mathematical Formulation

### 3.1 Normalization
Each variable $X$ is scaled into the range $[-1, 1]$:
$$P_n = 2\left(\frac{P - 0.27}{27.59}\right) - 1$$
$$TOC_n = 2\left(\frac{TOC - 0.09}{11.81}\right) - 1$$
$$T_n = 2\left(\frac{T - 25.0}{60.0}\right) - 1$$
$$M_n = 2\left(\frac{M - 0.13}{9.7}\right) - 1$$

### 3.2 Hidden Layer (9 $\tanh$ Nodes)
$$H_1 = 4.3454 \tanh(0.463864 P_n - 0.31133 TOC_n + 0.344959 T_n - 3.12002 M_n + 0.1364)$$
$$H_2 = -2.3848 \tanh(-0.58134 P_n + 3.884372 TOC_n - 3.35804 T_n - 3.5612 M_n + 1.5674)$$
$$H_3 = 1.0787 \tanh(2.063359 P_n - 1.36743 TOC_n + 0.017287 T_n - 0.81836 M_n + 1.6986)$$
$$H_4 = 7.2983 \tanh(-0.55888 P_n + 3.675293 TOC_n - 3.62496 T_n - 5.46799 M_n - 0.0611)$$
$$H_5 = 2.6694 \tanh(-0.34832 P_n - 1.05893 TOC_n - 4.05862 T_n + 3.986044 M_n - 2.9299)$$
$$H_6 = -2.5638 \tanh(-0.54341 P_n - 6.08516 TOC_n + 2.800065 T_n - 1.95976 M_n - 3.5087)$$
$$H_7 = -2.4732 \tanh(0.726167 P_n + 5.44991 TOC_n - 3.53879 T_n + 2.364884 M_n + 3.2086)$$
$$H_8 = 4.5911 \tanh(0.593457 P_n - 3.93835 TOC_n + 4.100349 T_n + 6.917117 M_n + 0.8407)$$
$$H_9 = 0.3444 \tanh(0.528816 P_n + 0.545323 TOC_n + 1.302212 T_n + 4.240496 M_n + 3.8238)$$

### 3.3 Output Summation, Mode A Denormalization & Non-Negative Gating
$$(\text{CH}_4\text{ adsorption})_n = \sum_{i=1}^{9} H_i - 3.3371$$
$$\text{CH}_4\text{ adsorption} = 1.615 (\text{CH}_4\text{ adsorption})_n + 1.615$$
$$(\text{CH}_4\text{ adsorption})_{\text{final}} = \max(0, \text{CH}_4\text{ adsorption})\quad [\text{SCF/ton}]$$

---

## 4. Key Features & Interface Capabilities

1. **Dual-Input Synchronization**:
   - Interactive slider + direct numeric input with bounds checking and live gradient tracking.
2. **Langmuir Adsorption Isotherm Curve**:
   - Real-time pressure sweep ($P \in [0.27, 27.86\text{ MPa}]$) generating the full adsorption curve at current $(TOC, T, M)$.
   - Real-time operating marker showing current state and drawdown slope $\partial V / \partial P$.
3. **Tornado Sensitivity Analysis**:
   - Dynamic parameter ranking based on $\pm 10\%$ localized perturbation.
4. **Neuron Insights View**:
   - Live diagnostics for all 9 hidden neurons showing $z_i$, $\tanh(z_i)$, scaling $s_i$, and visual contribution bars.
5. **Table 3 Benchmark Suite**:
   - Verification suite with line-by-line comparison of Dr. Okorie's 14 benchmark test points.
   - Interactive **Load** buttons to transfer any sample row into the live predictor in 1 click.
6. **Batch CSV Processor**:
   - Process multiple core samples simultaneously with instant CSV export.
7. **Accessibility & Design**:
   - AAA minimalist aesthetic, Dark & Light themes, KaTeX equations, keyboard shortcuts (`1-5` for tabs, `R` for reset, `T` for theme).

