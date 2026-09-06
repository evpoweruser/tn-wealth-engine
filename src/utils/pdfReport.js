/**
 * Revamped PDF report builder for TN Wealth Engine.
 *
 * Produces a portrait A4 multi-page vector report (selectable text):
 *  p1 — Cover header + KPI cards + key inputs
 *  p2 — Wealth trajectory chart image + 5-year snapshot table
 *  p3 — Goals table + SIP feasibility chart + SIP summary
 *  p4 — Assumptions & methodology + disclaimer
 *
 * Charts are captured individually with html2canvas in a forced light
 * theme so dark-mode dashboards still print cleanly on white paper.
 *
 * NOTE: jsPDF built-in fonts (WinAnsi) lack the ₹ glyph, so all
 * currency is rendered as "Rs." in the PDF body.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { runPath } from '../engine/index.js';

// --- palette (print / light-first) ---
const NAVY = [15, 23, 42];
const BLUE = [2, 132, 199];
const MUTED = [100, 116, 139];
const LIGHT_BG = [241, 245, 249];
const CARD_BORDER = [226, 232, 240];

const PW = 210;
const PH = 297;
const MARGIN = 14;
const CW = PW - MARGIN * 2;

// jsPDF WinAnsi has no ₹ glyph → use Rs.
const rs = (s) => String(s ?? '').replace(/₹/g, 'Rs. ');
const fmtINR = (x) => 'Rs. ' + Math.round(Number(x) || 0).toLocaleString('en-IN');
const fmtCrRs = (x) => 'Rs. ' + ((Number(x) || 0) / 1e7).toFixed(2) + ' Cr';

const schemeLabel = (mode) => {
  if (mode === 'taps') return 'TAPS - Assured Pension';
  if (mode === 'cps') return 'Pure CPS - Lump-sum';
  return 'Compare - TAPS vs CPS';
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureNode(selector) {
  const el = document.querySelector(`[data-pdf="${selector}"]`);
  if (!el) return null;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

/** Force light theme during capture so CSS-var charts print on white. */
async function captureChartsLight(onStage) {
  const root = document.documentElement;
  const prev = root.dataset.theme;
  try {
    onStage?.('Preparing charts for print...');
    root.dataset.theme = 'light';
    // let CSS vars + recharts repaint
    await sleep(300);
    onStage?.('Capturing wealth chart...');
    const wealthImg = await captureNode('wealth-chart');
    onStage?.('Capturing SIP chart...');
    const feasImg = await captureNode('feasibility-chart');
    return { wealthImg, feasImg };
  } finally {
    if (prev) root.dataset.theme = prev;
    else delete root.dataset.theme;
  }
}

function addFooter(doc, pageNum, pageCount, genDate) {
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setDrawColor(...CARD_BORDER);
  doc.line(MARGIN, PH - 12, PW - MARGIN, PH - 12);
  doc.text('TN Pension & SIP Wealth Engine  |  Planning estimate only - not financial advice', MARGIN, PH - 8);
  doc.text(`Generated ${genDate}  |  Page ${pageNum} of ${pageCount}`, PW - MARGIN, PH - 8, { align: 'right' });
}

function coverHeader(doc, state, genDate) {
  // navy band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 46, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('TN Pension & SIP Wealth Engine', MARGIN, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(186, 205, 227);
  doc.text('Retirement Plan Report  |  TAPS / CPS / SIP + Child Goals + Monte Carlo', MARGIN, 24);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  // scheme pill
  const pill = schemeLabel(state.retireMode);
  doc.setFillColor(...BLUE);
  const pillW = doc.getTextWidth(pill) + 10;
  doc.roundedRect(MARGIN, 29, pillW, 9, 2, 2, 'F');
  doc.text(pill, MARGIN + 5, 35.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 205, 227);
  doc.text(`Generated: ${genDate}`, MARGIN + pillW + 6, 35.2);
}

function kpiCards(doc, kpis, y) {
  const gap = 3;
  const cardH = 24;
  // row 1: 3 cards, row 2: 2 cards
  const rows = [kpis.slice(0, 3), kpis.slice(3)];
  let cy = y;
  rows.forEach((row) => {
    const w = (CW - gap * (row.length - 1)) / row.length;
    row.forEach((k, i) => {
      const x = MARGIN + i * (w + gap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...CARD_BORDER);
      doc.roundedRect(x, cy, w, cardH, 2, 2, 'FD');
      // top accent
      doc.setFillColor(...k.accent);
      doc.roundedRect(x, cy, w, 2.2, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(k.label.toUpperCase(), x + 4, cy + 8);
      doc.setFontSize(11.5);
      doc.setTextColor(...NAVY);
      doc.text(rs(k.value), x + 4, cy + 15.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      const sub = doc.splitTextToSize(rs(k.sub), w - 8);
      doc.text(sub.slice(0, 2), x + 4, cy + 20);
    });
    cy += cardH + gap;
  });
  return cy;
}

function sectionTitle(doc, y, title, hint) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN, y);
  if (hint) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(hint, MARGIN, y + 5);
    return y + 10;
  }
  return y + 6;
}

function buildKpis(state, derivedState, results) {
  const { mid, survivePct, retP10, retP90 } = results;
  const mode = state.retireMode || 'taps';
  const wealth = 'Rs. ' + ((mid.totalWealthAtRetire ?? mid.liquidStart ?? 0) / 1e7).toFixed(2) + ' Cr';
  const wealthSub =
    state.mcOn && retP10 != null && retP90 != null
      ? `Today's value ${fmtCrRs(mid.realWealthAtRetire || 0)}  |  P10-P90 ${fmtCrRs(retP10)} - ${fmtCrRs(retP90)}`
      : `Worth ${fmtCrRs(mid.realWealthAtRetire || 0)} in today's money`;
  const pension =
    mid.monthlyPension > 0 ? `${fmtINR(mid.monthlyPension)} /mo` : mode === 'taps' ? 'Calculating...' : 'Rs. 0 /mo (lump-sum)';
  const pensionSub = mode === 'taps' ? 'TAPS Assured Pension' : mid.annuityCorpus > 0 ? 'Voluntary Annuity' : 'Pure CPS (100% lump-sum)';
  const liquidSub = mode === 'taps' ? 'SIP + Gratuity (corpus funds TAPS)' : 'CPS residual + SIP + Gratuity';
  const planDepletes = mid.depletedYear && (results.exhaustPct ?? 0) > 50;
  const longevity = planDepletes ? `Depletes ${mid.depletedYear}` : `Age ${state.lifeAge}+`;
  const longevitySub = planDepletes ? 'Corpus depleted' : state.mcOn ? 'Median sustains' : 'Sustains';
  const success = state.mcOn ? `${(survivePct ?? 0).toFixed(0)}%` : mid.depletedYear ? 'Risk' : 'OK';
  void derivedState;
  return [
    { label: 'Wealth at retire', value: wealth, sub: wealthSub, accent: NAVY },
    { label: 'Monthly pension', value: pension, sub: pensionSub, accent: BLUE },
    { label: 'Liquid base', value: fmtCrRs(mid.liquidStart || 0), sub: liquidSub, accent: [5, 150, 105] },
    { label: 'Longevity', value: longevity, sub: longevitySub, accent: planDepletes ? [220, 38, 38] : [124, 58, 237] },
    { label: 'Plan success', value: success, sub: state.mcOn ? 'Runs sustaining to plan age' : mode, accent: [180, 83, 9] },
  ];
}

function snapshotRows(results) {
  const recs = results.mid.records || [];
  if (!recs.length) return [];
  const retireIdx = recs.findIndex((r) => r.phase === 'draw');
  const picked = [];
  const seen = new Set();
  recs.forEach((r, i) => {
    const isRetire = i === retireIdx;
    const isLast = i === recs.length - 1;
    if (i % 5 === 0 || isRetire || isLast) {
      const key = `${r.yr}`;
      if (!seen.has(key)) {
        seen.add(key);
        picked.push(r);
      }
    }
  });
  return picked.map((r) => [
    String(r.yr),
    String(r.age),
    r.phase === 'acc' ? 'Accumulation' : 'Drawdown',
    (Number(r.tot) || 0).toFixed(2),
    (Number(r.liquid) || 0).toFixed(2),
    r.pension ? Math.round(r.pension).toLocaleString('en-IN') : '-',
  ]);
}

/** Recompute TAPS vs CPS paths for compare mode (mirrors ComparePanel). */
function buildComparison(state, derivedState) {
  if (state.retireMode !== 'compare' || !derivedState) return null;
  try {
    const { baseYear, retireYear, endYear, currentAge, lastPay, goals, inflationData } = derivedState;
    void goals;
    const simParams = {
      bYr: baseYear,
      rYr: retireYear,
      endYr: endYear,
      currentAge,
      pcs: Object.fromEntries(
        Object.entries(state.payCommissions).filter(([, v]) => v).map(([k]) => [Number(k), 0.25]),
      ),
      cpsBal: state.cpsBal,
      cpsAnn: state.cpsAnn,
      cpsInc: state.cpsInc / 100,
      cpsRate: state.cpsRate / 100,
      annPct: state.annPct,
      annYield: state.annYield / 100,
      gratuity: state.gratuity,
      postRetRate: state.postRetRate / 100,
      retSpend: state.retSpend,
      medShare: state.medShare / 100,
      sipMo: state.sipMo,
      sipXirr: state.sipXirr / 100,
      sipStep: state.sipStep / 100,
      mSurplus: state.mSurplus,
      lastPay,
    };
    const tapsRes = runPath(simParams, 'taps', simParams.cpsRate, simParams.sipXirr,
      inflationData.infLiving, inflationData.infMed, inflationData.infEdu, inflationData.infComposite, {});
    const cpsRes = runPath(simParams, 'cps', simParams.cpsRate, simParams.sipXirr,
      inflationData.infLiving, inflationData.infMed, inflationData.infEdu, inflationData.infComposite, {});
    return { tapsRes, cpsRes };
  } catch {
    return null;
  }
}

export async function generateWealthReport({ state, derivedState, results, onStage }) {
  if (!results?.mid?.records?.length) throw new Error('No simulation results to export yet.');
  const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  onStage?.('Preparing charts for print...');
  const { wealthImg, feasImg } = await captureChartsLight(onStage);

  onStage?.('Building report...');
  const doc = new jsPDF('p', 'mm', 'a4');
  const kpis = buildKpis(state, derivedState, results);
  const comparison = buildComparison(state, derivedState);

  // ---------- PAGE 1: cover + KPIs + key inputs ----------
  coverHeader(doc, state, genDate);
  let y = 52;
  y = kpiCards(doc, kpis, y) + 4;

  if (comparison) {
    y = sectionTitle(doc, y, 'TAPS vs CPS comparison', 'Side-by-side at retirement') ;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      head: [['Metric', 'TAPS (assured pension)', 'Pure CPS (lump-sum)']],
      body: [
        ['Monthly pension', fmtINR(comparison.tapsRes.monthlyPension || comparison.tapsRes.tapsPension), fmtINR(comparison.cpsRes.monthlyPension)],
        ['Corpus at retire', fmtCrRs(comparison.tapsRes.finCPS), fmtCrRs(comparison.cpsRes.finCPS)],
        ['Liquid at retire', fmtCrRs(comparison.tapsRes.liquidStart), fmtCrRs(comparison.cpsRes.liquidStart)],
      ],
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  y = sectionTitle(doc, y, 'Key inputs', 'Career horizon and contribution setup');
  const lastPay = derivedState?.lastPay;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [['Parameter', 'Value', 'Parameter', 'Value']],
    body: [
      ['Date of birth', state.dob, 'Date of retirement', state.dor],
      ['Date of joining', state.doj, 'Plan till age', String(state.lifeAge)],
      ['Monthly SIP', `${fmtINR(state.sipMo)} (+${state.sipStep}%/yr)`, 'Monthly surplus', fmtINR(state.mSurplus)],
      ['SIP XIRR', `${state.sipXirr}%`, 'Post-ret return', `${state.postRetRate}%`],
      ['Gratuity', fmtINR(state.gratuity), 'Last emoluments', lastPay ? fmtINR(lastPay.emoluments) : '-'],
      ['CPS balance', fmtINR(state.cpsBal), 'CPS annuity/mo', fmtINR(state.cpsAnn)],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('All currency in Rs. White-background charts for clean printing.', MARGIN, y);

  // ---------- PAGE 2: wealth trajectory ----------
  doc.addPage();
  y = sectionTitle(doc, 18, 'Accumulation & drawdown horizon', state.mcOn ? 'Median path with P10-P90 Monte Carlo band  |  Rs. Cr' : 'Deterministic projection  |  Rs. Cr');
  if (wealthImg) {
    const props = doc.getImageProperties(wealthImg);
    const h = Math.min((props.height / props.width) * CW, 110);
    doc.addImage(wealthImg, 'PNG', MARGIN, y, CW, h);
    y += h + 4;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Wealth chart capture unavailable - snapshot below still reflects the same simulation.', MARGIN, y + 6);
    y += 12;
  }
  y = sectionTitle(doc, y, 'Trajectory snapshot', 'Every 5 years + retirement + end of plan (Rs. Cr; pension Rs./mo)');
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [['Year', 'Age', 'Phase', 'Total (Cr)', 'Liquid (Cr)', 'Pension/mo']],
    body: snapshotRows(results),
  });

  // ---------- PAGE 3: goals + feasibility ----------
  doc.addPage();
  y = sectionTitle(doc, 18, 'Milestone goals', 'Child education & marriage - future value incl. LTCG gross-up');
  const goals = derivedState?.goals || [];
  if (goals.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      head: [['Goal', 'Year', 'Target today', 'Gross FV', 'Fund', 'SIP/mo']],
      body: goals.map((g) => [
        `${g.childName} - ${g.label}`,
        String(g.year),
        fmtINR(g.baseCost),
        fmtINR(g.grossFV),
        g.fund === 'corpus' ? 'Corpus' : 'SIP',
        g.fund === 'sip' ? `${fmtINR(g.sipRequired)}/mo` : '-',
      ]),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('No child goals configured.', MARGIN, y + 6);
    y += 12;
  }
  y = sectionTitle(doc, y, 'SIP vs surplus feasibility', 'Stacked monthly commitment vs available surplus');
  if (feasImg) {
    const props = doc.getImageProperties(feasImg);
    const h = Math.min((props.height / props.width) * CW, 80);
    doc.addImage(feasImg, 'PNG', MARGIN, y, CW, h);
    y += h + 4;
  }
  const feas = results.feasibility;
  if (feas?.years?.length) {
    const peak = feas.years.reduce((acc, yr, i) => {
      const tot = (feas.baseSip[i] || 0) + (feas.dedSip[i] || 0);
      return tot > acc.tot ? { yr, tot } : acc;
    }, { yr: feas.years[0], tot: 0 });
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(`Peak commitment: ${fmtINR(peak.tot)}/mo in ${peak.yr}  |  Available surplus: ${fmtINR(state.mSurplus)}/mo`, MARGIN, y);
    y += 5;
    doc.setTextColor(...MUTED);
    doc.text(peak.tot <= state.mSurplus ? 'Status: feasible within surplus.' : 'Status: exceeds surplus - reduce goals or raise surplus.', MARGIN, y);
  }

  // ---------- PAGE 4: assumptions ----------
  doc.addPage();
  y = sectionTitle(doc, 18, 'Assumptions & methodology', 'Transparent inputs behind every number');
  const inf = state.inflation;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [['Category', 'Detail']],
    body: [
      ['Career', `DOJ ${state.doj} to DOR ${state.dor}; 3% annual increment; DACP bumps ${state.dacp8}/${state.dacp15}/${state.dacp17}/${state.dacp20}%; MD +${state.mdIncr} increments from ${state.mdYear}; DA ${state.daPct}%; pay commissions ${Object.entries(state.payCommissions).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'} (+25% basic, DA reset).`],
      ['Inflation (split CPI)', `Consumer ${inf.rates.consumer}% (w${inf.weights.consumer}), Food ${inf.rates.food}% (w${inf.weights.food}), Medical ${inf.rates.medical}% (w${inf.weights.medical}), Education ${inf.rates.education}% (w${inf.weights.education}). Composite drives living costs; medical/education inflate their own buckets.`],
      ['Investments', `SIP ${fmtINR(state.sipMo)}/mo, +${state.sipStep}%/yr, XIRR ${state.sipXirr}%. Allocation: Indian Eq ${state.allocation.indianEq}%, US Eq ${state.allocation.usEq}%, Debt ${state.allocation.debt}%, Gold ${state.allocation.gold}%. CPS return ${state.cpsRate}%, growth ${state.cpsInc}%. Annuity ${state.annPct}% @ ${state.annYield}% yield.`],
      ['Retirement spend', `Base ${fmtINR(state.retSpend)}/mo, medical share ${state.medShare}%. Post-ret return ${state.postRetRate}%. TAPS pension = 50% of last Basic + DA, DA-grown.`],
      ['Monte Carlo', state.mcOn ? `ON - ${state.mcRuns} runs, mode ${state.mcMode}. P10-P90 band = 10th-90th percentile of total wealth paths.` : 'OFF - single deterministic path.'],
      ['Goals & tax', 'Education goals inflate at education CPI, marriage at living CPI. LTCG gross-up: max(0, FV x 60% - Rs.1,25,000) x 12.5%. Corpus-funded goals withdraw from liquid; SIP-funded goals add dedicated monthly SIP.'],
    ],
    columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });
  y = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...CARD_BORDER);
  doc.roundedRect(MARGIN, y, CW, 30, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Disclaimer', MARGIN + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const dis = doc.splitTextToSize('This report is a planning model based on user inputs and simplified assumptions (returns, inflation, DA, pay commissions, taxation). Actual outcomes will differ. It is not financial, tax, or legal advice. Review with a qualified advisor before decisions.', CW - 8);
  doc.text(dis, MARGIN + 4, y + 12);

  // footers + save
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    addFooter(doc, i, pages, genDate);
  }
  const tag = (state.retireMode || 'plan').toUpperCase();
  const dstr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`TN_Wealth_Report_${tag}_${dstr}.pdf`);
}
