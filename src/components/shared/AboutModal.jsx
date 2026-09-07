import React from 'react';
import { Landmark, X } from 'lucide-react';
import styles from './AboutModal.module.css';

export const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="About and user guide">
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.logoIcon}><Landmark size={16} /></span> About & User Guide
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className={styles.content}>
          {/* Section 1: Overview */}
          <section className={styles.section}>
            <h3>1. Overview & Purpose</h3>
            <p>
              The <b>TN Pension & SIP Wealth Engine</b> is a specialized financial planning tool designed for 
              Tamil Nadu Government Employees. It helps employees model retirement outcomes under the 
              <b>Tamil Nadu Assured Pension Scheme (TAPS)</b> versus the <b>Contributory Pension Scheme (CPS)</b>, 
              integrated with personal Equity SIP investments and children's milestone goals.
            </p>
          </section>

          {/* Section 2: TAPS vs CPS */}
          <section className={styles.section}>
            <h3>2. TN Retirement Schemes Explained</h3>
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h4>TAPS — Assured Pension Scheme</h4>
                <ul>
                  <li><b>Pension Amount:</b> Guaranteed 50% of last drawn emoluments (Basic Pay + Dearness Allowance).</li>
                  <li><b>Dearness Allowance (DA):</b> Pension increases periodically in line with DA revisions to protect against inflation.</li>
                  <li><b>Corpus Utilization:</b> The accumulated CPS corpus is utilized by the Government to fund the assured pension stream.</li>
                  <li><b>Liquid Assets at Retire:</b> Your personal SIP investments + Gratuity payout.</li>
                </ul>
              </div>

              <div className={styles.card}>
                <h4>Pure CPS — Contributory Lump-sum</h4>
                <ul>
                  <li><b>Accumulation:</b> 10% employee basic + 10% government match, compounding monthly.</li>
                  <li><b>Payout:</b> 100% of accumulated corpus is available at retirement.</li>
                  <li><b>Voluntary Annuity:</b> You can choose what percentage (if any) to convert into a monthly annuity.</li>
                  <li><b>Liquid Assets at Retire:</b> Full CPS corpus + SIP investments + Gratuity payout.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Career Progression & Assumptions */}
          <section className={styles.section}>
            <h3>3. Career & Pay Rules (G.O. Regulations)</h3>
            <ul>
              <li><b>Annual Increment:</b> 3% annual basic pay increment applied every year.</li>
              <li><b>DACP (Dynamic Assured Career Progression):</b> Grade pay bumps at 8, 15, 17, and 20 years of service (e.g. for Medical Officers).</li>
              <li><b>MD / Special Qualification:</b> 2 advance 3% basic pay increments applied upon acquiring postgraduate degrees.</li>
              <li><b>Pay Commissions:</b> Expected every 10 years (2027, 2037, 2047) with a +25% basic pay bump, resetting DA to 0%.</li>
              <li><b>Dearness Allowance (DA):</b> Increases by ~6 percentage points per year between Pay Commission revisions.</li>
            </ul>
          </section>

          {/* Section 4: Split Inflation & SIP Allocation */}
          <section className={styles.section}>
            <h3>4. Financial Calculations & Sources</h3>
            <div className={styles.card}>
              <h4>Split Inflation Model</h4>
              <p>Standard calculators use a single inflation rate. This engine splits inflation into 4 categories based on Indian CPI data:</p>
              <ul>
                <li><b>Consumer (General):</b> Default 4.5% — applies to general living expenses.</li>
                <li><b>Food & Groceries:</b> Default 5.5% — applies to essential food items.</li>
                <li><b>Medical & Healthcare:</b> Default 7.0% — inflates healthcare expenses during retirement.</li>
                <li><b>Education & Fees:</b> Default 8.0% — inflates children's Higher Secondary and College milestone costs.</li>
              </ul>
            </div>

            <div className={styles.card} style={{ marginTop: '12px' }}>
              <h4>Children Milestone Tax (LTCG)</h4>
              <p>Milestone future values account for long-term capital gains tax:</p>
              <code>Net FV = Base Cost × (1 + Inflation)^Years</code><br />
              <code>LTCG Tax = Max(0, Net FV × 60% - ₹1,25,000) × 12.5%</code><br />
              <code>Gross FV Required = Net FV + LTCG Tax</code>
            </div>
          </section>

          {/* Section 5: How to Use */}
          <section className={styles.section}>
            <h3>5. User Instructions & Workflow</h3>
            <ol className={styles.instructions}>
              <li><b>Set Career Horizon:</b> Enter your Date of Birth, Date of Joining, and Date of Retirement in Section 1.</li>
              <li><b>Select Scheme:</b> Choose <b>TAPS</b> for assured pension, <b>CPS</b> for lump-sum, or <b>Compare</b> for side-by-side comparison in Section 2.</li>
              <li><b>Build Career Progression:</b> Expand the <i>Career Builder</i> inside Section 2 to project your final retirement basic pay and DA.</li>
              <li><b>Configure SIP & Allocation:</b> Set your monthly SIP amount, step-up %, and asset allocation (Indian Equity, US Equity, Debt, Gold) in Section 3.</li>
              <li><b>Add Children Milestones:</b> Input Higher Secondary, College, and Marriage ages and target costs in Section 6. Choose whether each goal is funded from <b>SIP Corpus</b> or <b>Dedicated Monthly SIP</b>.</li>
              <li><b>Run Monte Carlo:</b> Enable Monte Carlo in Section 5 to simulate 1,000 market scenarios and view P10–P90 confidence ranges.</li>
              <li><b>Export Reports:</b> Download clean PDF reports or raw CSV spreadsheets using the header buttons.</li>
            </ol>
          </section>

          {/* Section 6: Privacy */}
          <section className={styles.section}>
            <h3>6. Privacy & Offline Capability</h3>
            <p>
              <b>100% Client-Side Privacy:</b> All calculations run inside your browser. No financial data is ever sent to any external server.
              Settings are stored locally on your device (`localStorage`).
            </p>
            <p style={{ marginTop: '8px' }}>
              <b>PWA Offline Mode:</b> You can install this app on your phone or desktop ("Add to Home Screen") and run it offline anytime.
            </p>
          </section>

          {/* Section 7: Family pension & inheritance */}
          <section className={styles.section}>
            <h3>7. Family Pension & Inheritance</h3>
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h4>TAPS Family Pension (G.O.Ms.No.07, 09-01-2026)</h4>
                <ul>
                  <li><b>60% of pension:</b> on the pensioner's death, the eligible spouse/family receives 60% of the last pension drawn.</li>
                  <li><b>DA at par:</b> dearness allowance revisions apply to family pensioners exactly like serving employees.</li>
                  <li><b>Market-proof:</b> it is pay-based, so market crashes in the Stress Lab never touch it — only the corpus legs suffer.</li>
                  <li><b>Old-rules context:</b> pre-2003 TN pension rules paid enhanced family pension at 50% of emoluments (7 yrs / till 65) and 30% thereafter.</li>
                </ul>
              </div>
              <div className={styles.card}>
                <h4>What Children Can Inherit (as modelled)</h4>
                <ul>
                  <li><b>TAPS:</b> leftover SIP balance + unspent gratuity at age 85, in today's money. The CPS corpus funds the pension promise — not inheritable.</li>
                  <li><b>CPS:</b> leftover SIP + residual CPS + unspent gratuity. Voluntary annuity money dies with the annuitant — excluded.</li>
                  <li><b>Depleted paths leave ₹0:</b> that is why downside (P10) bequest columns can read zero while medians stay healthy.</li>
                  <li><b>Not modelled:</b> exact death year, nominees/succession law, end-of-life bills, inheritance tax, DCRG ceiling (₹25 lakh).</li>
                </ul>
              </div>
            </div>
            <div className={styles.card} style={{ marginTop: '12px' }}>
              <h4>Statutory & Voluntary Protection Stack</h4>
              <ul>
                <li><b>Family Benefit Fund (FBF):</b> ₹1.5 Lakh flat statutory TN Govt lump sum (Karuvoolam Treasuries, includes ₹5k funeral advance).</li>
                <li><b>Family Security Fund:</b> ₹5 Lakh flat (2021 G.O.Ms.129 revision, ₹110/mo subscription).</li>
                <li><b>Doctors Corpus Fund (DCF):</b> ₹1 Crore flat TNGDA voluntary scheme (duty-death basis, ₹500/mo subscription).</li>
                <li><b>Term Insurance:</b> Private contractual cover — recommended target is 12× annual income. Verify insurer claims settlement ratio and underwriting terms.</li>
              </ul>
            </div>
            <p style={{ marginTop: '8px' }}>
              <b>Verify before acting:</b> pension rules are amended by government notification — confirm current
              rates with the Principal Accountant General / Treasury before retirement decisions.
            </p>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.primaryBtn} onClick={onClose}>Got it, return to engine</button>
        </div>
      </div>
    </div>
  );
};
