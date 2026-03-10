/* ============================================================
   NURSE OWNERSHIP CIRCLE — app.js
   tmacinspired.com
   Handles: navigation, calculators, deal tracker,
            shift tracker, checklist, localStorage, PWA install
   ============================================================ */

'use strict';

/* ----------------------------------------------------------
   SERVICE WORKER REGISTRATION
   ---------------------------------------------------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[NOC] Service worker registered:', reg.scope))
      .catch(err => console.warn('[NOC] Service worker failed:', err));
  });
}

/* ----------------------------------------------------------
   LOCALSTORAGE HELPERS
   ---------------------------------------------------------- */
const LS = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('[NOC] localStorage write failed:', e); }
  },
  remove(key) {
    try { localStorage.removeItem(key); }
    catch {}
  }
};

/* ----------------------------------------------------------
   APP STATE
   ---------------------------------------------------------- */
const state = {
  currentSection: 'dashboard',
  deals: LS.get('noc_deals', []),
  checklist: LS.get('noc_checklist', {}),
  selectedPath: LS.get('noc_selected_path', null),
  userName: LS.get('noc_user_name', null),
};

/* ----------------------------------------------------------
   NAVIGATION
   ---------------------------------------------------------- */
function navigateTo(sectionId) {
  // Hide current
  const current = document.getElementById(`section-${state.currentSection}`);
  if (current) current.classList.remove('active');

  // Deactivate nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show new section
  const next = document.getElementById(`section-${sectionId}`);
  if (next) next.classList.add('active');

  // Activate nav item
  const navBtn = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navBtn) navBtn.classList.add('active');

  state.currentSection = sectionId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bottom nav click events
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    navigateTo(btn.dataset.section);
  });
});

/* ----------------------------------------------------------
   PROFILE SETUP
   ---------------------------------------------------------- */
function showProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('hidden');
}

function saveProfile() {
  const nameInput = document.getElementById('setup-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    nameInput.style.borderColor = '#c0392b';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
    return;
  }
  state.userName = name;
  LS.set('noc_user_name', name);
  updateWelcome();
  closeProfileModal();
}

function updateWelcome() {
  const el = document.getElementById('dashboard-name');
  if (el && state.userName) {
    el.textContent = state.userName;
  }
}

/* ----------------------------------------------------------
   INVESTMENT PATH SELECTION
   ---------------------------------------------------------- */
function selectPath(pathName) {
  state.selectedPath = pathName;
  LS.set('noc_selected_path', pathName);

  // Update dashboard display
  const pathDisplay = document.getElementById('path-name-display');
  if (pathDisplay) pathDisplay.textContent = pathName;

  // Mark card as selected
  document.querySelectorAll('.path-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Highlight the chosen card
  document.querySelectorAll('.path-card').forEach(card => {
    const btn = card.querySelector('button');
    if (btn && btn.getAttribute('onclick').includes(pathName)) {
      card.classList.add('selected');
    }
  });

  // Navigate to dashboard to see selection
  navigateTo('dashboard');
}

function updatePathDisplay() {
  if (state.selectedPath) {
    const el = document.getElementById('path-name-display');
    if (el) el.textContent = state.selectedPath;
  }
}

/* ----------------------------------------------------------
   WEEKLY CHECKLIST
   ---------------------------------------------------------- */
function initChecklist() {
  const inputs = document.querySelectorAll('.check-input');

  inputs.forEach(input => {
    const key = input.dataset.key;
    // Restore saved state
    if (state.checklist[key]) {
      input.checked = true;
    }

    // Listen for changes
    input.addEventListener('change', () => {
      state.checklist[key] = input.checked;
      LS.set('noc_checklist', state.checklist);
      updateChecklistProgress();
    });
  });

  updateChecklistProgress();
}

function updateChecklistProgress() {
  const inputs = document.querySelectorAll('.check-input');
  const total = inputs.length;
  let checked = 0;

  inputs.forEach(input => {
    if (input.checked) checked++;
  });

  const pct = total > 0 ? (checked / total) * 100 : 0;

  const fill = document.getElementById('checklist-fill');
  const label = document.getElementById('checklist-label');

  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${checked} of ${total} complete`;
}

/* ----------------------------------------------------------
   SHIFT REPLACEMENT TRACKER
   ---------------------------------------------------------- */
function calculateShiftReplacement() {
  const hourlyRate    = parseFloat(document.getElementById('hourly-rate')?.value) || 0;
  const hoursPerShift = parseFloat(document.getElementById('hours-per-shift')?.value) || 0;
  const shiftsPerMonth= parseFloat(document.getElementById('shifts-per-month')?.value) || 0;
  const passiveIncome = parseFloat(document.getElementById('passive-income')?.value) || 0;

  if (!hourlyRate || !hoursPerShift || !shiftsPerMonth) {
    alert('Please fill in your hourly rate, hours per shift, and shifts per month.');
    return;
  }

  const shiftValue       = hourlyRate * hoursPerShift;
  const monthlyNursing   = shiftValue * shiftsPerMonth;
  const incomeGap        = Math.max(0, monthlyNursing - passiveIncome);
  const shiftsReplaced   = passiveIncome >= shiftValue
    ? Math.floor(passiveIncome / shiftValue)
    : (passiveIncome / shiftValue);
  const shiftsRemaining  = Math.max(0, shiftsPerMonth - shiftsReplaced);
  const pct              = Math.min(100, (passiveIncome / monthlyNursing) * 100);

  // Update DOM
  setText('monthly-nursing-income',  fmt(monthlyNursing));
  setText('passive-income-display',  fmt(passiveIncome));
  setText('income-gap',              fmt(incomeGap));
  setText('shifts-replaced',         shiftsReplaced.toFixed(1));
  setText('shifts-remaining',        shiftsRemaining.toFixed(1));
  setText('tracker-percent',         `${pct.toFixed(0)}%`);

  const fill = document.getElementById('tracker-fill');
  if (fill) fill.style.width = `${pct}%`;

  // Insight note
  let note = '';
  if (pct === 0) {
    note = 'Every financial journey begins with the first asset. Your next step is identifying a strategy and running your first deal analysis.';
  } else if (pct < 25) {
    note = `You've replaced ${pct.toFixed(0)}% of your nursing income. You're building momentum — stay consistent with your strategy.`;
  } else if (pct < 50) {
    note = `You're nearly a quarter of the way to freedom. At this pace, you're demonstrating what ownership can produce. Keep going.`;
  } else if (pct < 75) {
    note = `Over halfway there. Your passive income is doing real work. Focus on your next acquisition to accelerate the timeline.`;
  } else if (pct < 100) {
    note = `You're in the final stretch. ${(100 - pct).toFixed(0)}% more to full shift replacement. Your next deal could close the gap.`;
  } else {
    note = `You have fully replaced your nursing income. This is what ownership looks like. Congratulations.`;
  }

  setText('tracker-note', note);

  // Save to localStorage
  LS.set('noc_tracker', { hourlyRate, hoursPerShift, shiftsPerMonth, passiveIncome });

  // Show results
  document.getElementById('tracker-results')?.classList.remove('hidden');
}

function loadTrackerData() {
  const saved = LS.get('noc_tracker', null);
  if (!saved) return;
  if (saved.hourlyRate)     setValue('hourly-rate', saved.hourlyRate);
  if (saved.hoursPerShift)  setValue('hours-per-shift', saved.hoursPerShift);
  if (saved.shiftsPerMonth) setValue('shifts-per-month', saved.shiftsPerMonth);
  if (saved.passiveIncome)  setValue('passive-income', saved.passiveIncome);
}

/* ----------------------------------------------------------
   RENTAL CASH FLOW CALCULATOR
   ---------------------------------------------------------- */
function calculateRental() {
  const purchase    = parseFloat(document.getElementById('r-purchase')?.value) || 0;
  const downpayment = parseFloat(document.getElementById('r-downpayment')?.value) || 0;
  const mortgage    = parseFloat(document.getElementById('r-mortgage')?.value) || 0;
  const rent        = parseFloat(document.getElementById('r-rent')?.value) || 0;
  const expenses    = parseFloat(document.getElementById('r-expenses')?.value) || 0;

  if (!purchase || !mortgage || !rent) {
    alert('Please enter at least the purchase price, mortgage payment, and monthly rent.');
    return;
  }

  const monthlyCashFlow = rent - mortgage - expenses;
  const annualCashFlow  = monthlyCashFlow * 12;
  const totalInvested   = downpayment || purchase * 0.2;
  const coc             = totalInvested > 0 ? (annualCashFlow / totalInvested) * 100 : 0;

  let verdict = '';
  let verdictClass = '';
  if (coc >= 10) {
    verdict = 'Strong Deal';
    verdictClass = 'result-value--gold';
  } else if (coc >= 6) {
    verdict = 'Solid Deal — Analyze Further';
    verdictClass = '';
  } else if (coc >= 0) {
    verdict = 'Marginal — Negotiate or Pass';
    verdictClass = '';
  } else {
    verdict = 'Negative Cash Flow — Do Not Proceed';
    verdictClass = '';
  }

  setText('r-cashflow', fmt(monthlyCashFlow));
  setText('r-annual',   fmt(annualCashFlow));
  setText('r-coc',      `${coc.toFixed(1)}%`);

  const verdictEl = document.getElementById('r-verdict');
  if (verdictEl) {
    verdictEl.textContent = verdict;
    verdictEl.className = `result-value ${verdictClass}`;
  }

  document.getElementById('rental-results')?.classList.remove('hidden');
}

/* ----------------------------------------------------------
   SHARED LIVING CALCULATOR
   ---------------------------------------------------------- */
function calculateSharedLiving() {
  const rooms    = parseFloat(document.getElementById('sl-rooms')?.value) || 0;
  const perBed   = parseFloat(document.getElementById('sl-per-bed')?.value) || 0;
  const mortgage = parseFloat(document.getElementById('sl-mortgage')?.value) || 0;
  const staff    = parseFloat(document.getElementById('sl-staff')?.value) || 0;
  const util     = parseFloat(document.getElementById('sl-utilities')?.value) || 0;

  if (!rooms || !perBed) {
    alert('Please enter the number of rooms and monthly revenue per bed.');
    return;
  }

  const grossRevenue = rooms * perBed;
  const totalExpenses= mortgage + staff + util;
  const netCashFlow  = grossRevenue - totalExpenses;
  const annualNet    = netCashFlow * 12;

  let verdict = '';
  if (netCashFlow >= 3000) {
    verdict = 'Excellent — High Cash Flow Property';
  } else if (netCashFlow >= 1500) {
    verdict = 'Strong — Solid Shared Living Play';
  } else if (netCashFlow >= 500) {
    verdict = 'Positive — Review Expense Structure';
  } else if (netCashFlow >= 0) {
    verdict = 'Break Even — Negotiate Costs';
  } else {
    verdict = 'Negative — Rework the Numbers';
  }

  setText('sl-gross',    fmt(grossRevenue));
  setText('sl-totalexp', fmt(totalExpenses));
  setText('sl-net',      fmt(netCashFlow));
  setText('sl-annual',   fmt(annualNet));
  setText('sl-verdict',  verdict);

  document.getElementById('shared-results')?.classList.remove('hidden');
}

/* ----------------------------------------------------------
   TAX LIEN / DEED ANALYZER
   ---------------------------------------------------------- */
function calculateTaxLien() {
  const propValue = parseFloat(document.getElementById('tl-value')?.value) || 0;
  const lienAmt   = parseFloat(document.getElementById('tl-lien')?.value) || 0;
  const repairs   = parseFloat(document.getElementById('tl-repairs')?.value) || 0;
  const discount  = parseFloat(document.getElementById('tl-discount')?.value) || 40;

  if (!propValue) {
    alert('Please enter the estimated property value.');
    return;
  }

  const maxBid   = propValue * ((100 - discount) / 100);
  const allIn    = maxBid + repairs;
  const equity   = propValue - allIn;
  const roi      = allIn > 0 ? (equity / allIn) * 100 : 0;

  let verdict = '';
  if (roi >= 40) {
    verdict = 'Excellent Deal — Strong Equity Position';
  } else if (roi >= 20) {
    verdict = 'Good Deal — Favorable Return';
  } else if (roi >= 10) {
    verdict = 'Marginal — Verify Repair Costs';
  } else if (roi > 0) {
    verdict = 'Low Margin — Negotiate or Pass';
  } else {
    verdict = 'Deal Underwater — Do Not Bid';
  }

  setText('tl-propval', fmt(propValue));
  setText('tl-maxbid',  fmt(maxBid));
  setText('tl-allin',   fmt(allIn));
  setText('tl-equity',  fmt(equity));
  setText('tl-roi',     `${roi.toFixed(1)}%`);
  setText('tl-verdict', verdict);

  document.getElementById('taxlien-results')?.classList.remove('hidden');
}

/* ----------------------------------------------------------
   CALCULATOR TAB SWITCHING
   ---------------------------------------------------------- */
function switchCalc(calcId) {
  // Hide all panels
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));

  // Show selected
  const panel = document.getElementById(`calc-${calcId}`);
  if (panel) panel.classList.remove('hidden');

  // Activate tab
  const tabs = document.querySelectorAll('.calc-tab');
  const map  = { rental: 0, shared: 1, taxlien: 2, privatemoney: 3, mtr: 4 };
  if (tabs[map[calcId]] !== undefined) tabs[map[calcId]].classList.add('active');
}

/* ----------------------------------------------------------
   DEAL TRACKER
   ---------------------------------------------------------- */
function addDeal() {
  const name     = document.getElementById('deal-name')?.value.trim();
  const strategy = document.getElementById('deal-strategy')?.value;
  const amount   = parseFloat(document.getElementById('deal-amount')?.value) || 0;
  const status   = document.getElementById('deal-status')?.value;

  if (!name) {
    const el = document.getElementById('deal-name');
    if (el) { el.style.borderColor = '#c0392b'; setTimeout(() => el.style.borderColor = '', 1500); }
    return;
  }

  if (!strategy) {
    const el = document.getElementById('deal-strategy');
    if (el) { el.style.borderColor = '#c0392b'; setTimeout(() => el.style.borderColor = '', 1500); }
    return;
  }

  const deal = {
    id: Date.now(),
    name,
    strategy,
    amount,
    status,
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };

  state.deals.unshift(deal);
  LS.set('noc_deals', state.deals);

  // Clear form
  setValue('deal-name', '');
  setValue('deal-amount', '');
  document.getElementById('deal-strategy').value = '';
  document.getElementById('deal-status').value   = 'Researching';

  renderDeals();
}

function deleteDeal(id) {
  state.deals = state.deals.filter(d => d.id !== id);
  LS.set('noc_deals', state.deals);
  renderDeals();
}

function renderDeals() {
  const list  = document.getElementById('deals-list');
  const empty = document.getElementById('deals-empty');
  if (!list) return;

  // Remove existing deal cards (not the empty state)
  list.querySelectorAll('.deal-card').forEach(c => c.remove());

  if (state.deals.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  state.deals.forEach(deal => {
    const card = document.createElement('div');
    card.className = 'deal-card';
    card.onclick = () => openDealWorkspace(deal.id);
    card.innerHTML = `
      <div class="deal-card__body">
        <p class="deal-card__name">${escHtml(deal.name)}</p>
        <div class="deal-card__meta">
          <span class="deal-card__strategy">${escHtml(deal.strategy)}</span>
          <span class="deal-card__amount">${deal.amount ? fmt(deal.amount) : 'Amount TBD'}</span>
        </div>
        <div class="deal-card__meta">
          <span class="deal-card__status ${statusClass(deal.status)}">${escHtml(deal.status)}</span>
          <span style="font-size:0.7rem;color:#aeaeb2;">${deal.createdAt}</span>
        </div>
      </div>
      <div class="deal-card__chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    `;
    list.appendChild(card);
  });
}

function statusClass(status) {
  const map = {
    'Researching':    'status--researching',
    'Bidding':        'status--bidding',
    'Under Contract': 'status--contract',
    'Owned':          'status--owned',
    'Cash Flowing':   'status--cashflowing',
  };
  return map[status] || 'status--researching';
}

/* ----------------------------------------------------------
   LEARNING MODULE ACCORDION
   ---------------------------------------------------------- */
function toggleModule(id) {
  const lessons = document.getElementById(id);
  const chevron = document.getElementById(`chevron-${id}`);
  if (!lessons) return;

  const isHidden = lessons.classList.contains('hidden');
  lessons.classList.toggle('hidden', !isHidden);
  if (chevron) chevron.classList.toggle('open', isHidden);
}

/* ----------------------------------------------------------
   PWA INSTALL PROMPT
   ---------------------------------------------------------- */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install banner if not previously dismissed
  if (!LS.get('noc_install_dismissed', false)) {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  }
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[NOC] Install outcome:', outcome);
  deferredPrompt = null;
  document.getElementById('install-banner')?.classList.add('hidden');
});

document.getElementById('install-dismiss')?.addEventListener('click', () => {
  LS.set('noc_install_dismissed', true);
  document.getElementById('install-banner')?.classList.add('hidden');
});

/* ----------------------------------------------------------
   UTILITY FUNCTIONS
   ---------------------------------------------------------- */
function fmt(value) {
  const n = parseFloat(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ----------------------------------------------------------
   INIT
   ---------------------------------------------------------- */
function init() {
  // Show profile modal if first visit
  if (!state.userName) {
    setTimeout(showProfileModal, 600);
  } else {
    updateWelcome();
  }

  // Restore path selection
  updatePathDisplay();
  if (state.selectedPath) {
    document.querySelectorAll('.path-card').forEach(card => {
      const btn = card.querySelector('button');
      if (btn && btn.getAttribute('onclick')?.includes(state.selectedPath)) {
        card.classList.add('selected');
      }
    });
  }

  // Init checklist
  initChecklist();

  // Render saved deals
  renderDeals();

  // Restore tracker data
  loadTrackerData();
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ----------------------------------------------------------
   PRIVATE MONEY LENDING CALCULATOR
   ---------------------------------------------------------- */
function calculatePrivateMoney() {
  const amount = parseFloat(document.getElementById('pm-amount')?.value) || 0;
  const rate   = parseFloat(document.getElementById('pm-rate')?.value) || 0;
  const term   = parseFloat(document.getElementById('pm-term')?.value) || 0;
  const arv    = parseFloat(document.getElementById('pm-arv')?.value) || 0;

  if (!amount || !rate || !term) return;

  const monthlyInterest = (amount * (rate / 100)) / 12;
  const totalInterest   = monthlyInterest * term;
  const annualReturn    = rate;
  const ltv             = arv > 0 ? ((amount / arv) * 100).toFixed(1) : 'N/A';
  const ltvNum          = arv > 0 ? (amount / arv) * 100 : 0;

  let safety = '';
  if (ltvNum <= 65)      safety = '✅ Strong — LTV under 65%. Excellent collateral protection.';
  else if (ltvNum <= 75) safety = '⚠️ Acceptable — LTV under 75%. Standard private lending range.';
  else if (ltvNum <= 85) safety = '⚠️ Elevated Risk — LTV over 75%. Require strong borrower track record.';
  else if (ltvNum > 85)  safety = '🚫 High Risk — LTV over 85%. Not recommended without additional collateral.';
  else                   safety = 'Enter property value to assess safety.';

  document.getElementById('pm-monthly').textContent      = `$${monthlyInterest.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  document.getElementById('pm-total-interest').textContent = `$${totalInterest.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  document.getElementById('pm-annual-return').textContent  = `${annualReturn}% per year`;
  document.getElementById('pm-ltv').textContent            = ltvNum > 0 ? `${ltv}%` : 'N/A';
  document.getElementById('pm-safety').textContent         = safety;

  document.getElementById('pm-results')?.classList.remove('hidden');
}

/* ----------------------------------------------------------
   MTR CALCULATOR
   ---------------------------------------------------------- */
function calculateMTR() {
  const rate       = parseFloat(document.getElementById('mtr-rate')?.value) || 0;
  const mortgage   = parseFloat(document.getElementById('mtr-mortgage')?.value) || 0;
  const supplies   = parseFloat(document.getElementById('mtr-supplies')?.value) || 0;
  const expenses   = parseFloat(document.getElementById('mtr-expenses')?.value) || 0;
  const occupancy  = parseFloat(document.getElementById('mtr-occupancy')?.value) || 85;

  if (!rate) return;

  const effectiveRevenue = rate * (occupancy / 100);
  const totalExpenses    = mortgage + supplies + expenses;
  const netCashFlow      = effectiveRevenue - totalExpenses;
  const annualNet        = netCashFlow * 12;

  let verdict = '';
  if (netCashFlow >= 1000)     verdict = '🏆 Excellent MTR — strong cash flow above $1K/month.';
  else if (netCashFlow >= 500) verdict = '✅ Solid MTR — positive cash flow above $500/month.';
  else if (netCashFlow > 0)    verdict = '⚠️ Marginal — slightly positive. Review expenses or pricing.';
  else                         verdict = '🚫 Negative cash flow. Renegotiate rent, reduce costs, or increase rate.';

  const fmt = n => `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  document.getElementById('mtr-effective').textContent  = fmt(effectiveRevenue);
  document.getElementById('mtr-total-exp').textContent  = fmt(totalExpenses);
  document.getElementById('mtr-net').textContent        = fmt(netCashFlow);
  document.getElementById('mtr-annual').textContent     = fmt(annualNet);
  document.getElementById('mtr-verdict').textContent    = verdict;

  document.getElementById('mtr-results')?.classList.remove('hidden');
}

/* ----------------------------------------------------------
   RESOURCE VAULT — IN-APP READER
   ---------------------------------------------------------- */

const RESOURCES = {

  'burned-out': {
    title: "The Burned-Out Nurse's Guide to Real Estate Investing",
    badge: "Guide",
    body: `
      <div class="highlight-box">
        "You take care of everyone else. Real estate investing is how you finally take care of you."
        — Dr. TMac
      </div>

      <p>As a nurse, you've dedicated your life to helping others. But long hours, burnout, and financial stress shouldn't be the price you pay. What if you could build wealth through real estate — without quitting your job or working extra shifts?</p>

      <h2>Why Nurses Should Invest in Real Estate</h2>
      <ul>
        <li><strong>Predictable Cash Flow</strong> — Earn consistent monthly income from tenants</li>
        <li><strong>Financial Security</strong> — Build long-term wealth and escape the paycheck-to-paycheck cycle</li>
        <li><strong>Flexibility</strong> — Reduce or replace your shifts with passive income</li>
        <li><strong>Retirement Planning</strong> — Create a real estate portfolio that funds your future</li>
        <li><strong>Leverage Your Skills</strong> — Your ability to manage patients translates directly to managing properties</li>
      </ul>

      <h2>Step 1 — Choose Your Strategy</h2>
      <p>Not all real estate investing requires a huge down payment. Here are three beginner-friendly strategies for nurses:</p>

      <div class="strategy-block">
        <div class="s-label">Strategy 1</div>
        <h4>House Hacking</h4>
        <p>Buy a property, live in one unit, and rent out the others to cover your mortgage. Your tenants pay your housing cost — and often generate profit from day one.</p>
      </div>

      <div class="strategy-block">
        <div class="s-label">Strategy 2</div>
        <h4>Shared Living Rentals</h4>
        <p>Convert a home into a high-cash-flow shared living space for traveling nurses or professionals. Rent by the room instead of by the unit and generate 2–3x the income of a traditional rental.</p>
      </div>

      <div class="strategy-block">
        <div class="s-label">Strategy 3</div>
        <h4>Tiny-Home Investments</h4>
        <p>Purchase or build small, affordable homes that are in high demand. Lower acquisition costs, strong rental yields, and growing market appeal.</p>
      </div>

      <h2>Step 2 — Funding Your First Property</h2>
      <p>Many nurses think they need a lot of money to invest. That's a myth. Here's how to buy a property with little to no money down:</p>
      <ul>
        <li><strong>FHA Loan</strong> — Only 3.5% down for first-time homebuyers</li>
        <li><strong>VA Loan</strong> — $0 down if you're a veteran</li>
        <li><strong>Down Payment Assistance</strong> — Local programs can help cover costs</li>
        <li><strong>Private Money &amp; Partnerships</strong> — Use other people's money to fund deals</li>
        <li><strong>Seller Financing</strong> — Negotiate terms directly with the seller</li>
      </ul>

      <h2>Step 3 — Finding the Right Property</h2>
      <p>To ensure profitability, look for properties that meet these three criteria:</p>
      <ul>
        <li><strong>High Demand</strong> — Near hospitals, schools, or business districts</li>
        <li><strong>Affordable Pricing</strong> — Below market value or motivated sellers</li>
        <li><strong>Cash Flow Potential</strong> — Can generate rental income above expenses</li>
      </ul>
      <p>Use Zillow, Realtor.com, and LoopNet to find deals, or work with an investor-friendly realtor who understands your goals.</p>

      <h2>Step 4 — Managing Without Extra Work</h2>
      <p>Many nurses worry about the time commitment of managing real estate. With the right systems, it can be completely passive:</p>
      <ul>
        <li><strong>Hire a Property Manager</strong> — They handle tenants and maintenance for you</li>
        <li><strong>Use Automation Tools</strong> — Collect rent online via Avail or similar platforms</li>
        <li><strong>Screen Tenants Well</strong> — Set clear expectations and rental policies upfront</li>
      </ul>

      <h2>Step 5 — Take Action Today</h2>
      <div class="highlight-box">
        Real estate investing isn't just for the wealthy — it's for nurses like you who want to build a secure financial future without working more shifts.
      </div>
      <ul>
        <li>Pick a strategy: House Hacking, Shared Living, or Tiny-Home Investing</li>
        <li>Explore funding options: FHA, VA, Private Money</li>
        <li>Start looking for properties that cash flow</li>
        <li>Run the numbers in the app's calculators before you commit</li>
      </ul>
      <p><em>You take care of others. Now it's time to take care of you.</em></p>
    `
  },

  'fast-track': {
    title: "The Nurse's Real Estate Fast-Track",
    badge: "Strategy",
    body: `
      <div class="highlight-box">
        "As nurses, we are experts at managing high-stress environments and following complex protocols. Those same skills make us incredible investors. Real estate isn't just an investment — it's your exit strategy."
      </div>

      <p>If you're feeling the burnout of the 12-hour grind, this guide gives you three proven strategies to build wealth beyond the bedside — written specifically for nurses, by a nurse who did it.</p>

      <h2>Strategy 1 — The Credential Hack</h2>
      <p><em>Also known as: LMI Waivers for Healthcare Professionals</em></p>

      <div class="strategy-block">
        <div class="s-label">The Problem</div>
        <h4>Saving a 20% down payment feels impossible on a nursing salary without working endless overtime.</h4>
      </div>
      <div class="strategy-block">
        <div class="s-label">The Solution</div>
        <h4>Use your professional status.</h4>
        <p>Many lenders offer LMI (Lenders Mortgage Insurance) Waivers for healthcare professionals. This means you can often enter the market with only 5–10% down instead of 20%.</p>
      </div>
      <p><strong>The Logic:</strong> Your job security is your collateral. Use it to buy your first asset years sooner than the general public. A nurse's stable W2 income is one of the strongest signals a lender can see.</p>

      <h2>Strategy 2 — The MTR Goldilocks Method</h2>
      <p><em>Mid-Term Rentals for travel nurses and healthcare professionals</em></p>

      <div class="strategy-block">
        <div class="s-label">The Problem</div>
        <h4>Long-term tenants offer low returns. Airbnbs are a full-time management job.</h4>
      </div>
      <div class="strategy-block">
        <div class="s-label">The Solution</div>
        <h4>Mid-Term Rentals (MTRs) for travel nurses.</h4>
        <p>Rent your furnished property for 30–90 day stays to fellow healthcare professionals. Not too short, not too long — just right.</p>
      </div>
      <p><strong>The Win:</strong> You know exactly what a travel nurse needs — blackout curtains, quiet, safety, proximity to the hospital. You can charge a 20–40% premium above market rate for providing a "home away from home" that your peers can't find anywhere else.</p>
      <p><strong>The Logic:</strong> Your insider knowledge of the travel nurse experience is a competitive advantage that no outside investor has.</p>

      <h2>Strategy 3 — House Hacking (The Shift-Killer)</h2>

      <div class="strategy-block">
        <div class="s-label">The Problem</div>
        <h4>Housing is your biggest expense, forcing you to pick up extra shifts just to stay ahead.</h4>
      </div>
      <div class="strategy-block">
        <div class="s-label">The Solution</div>
        <h4>Buy a property with an extra unit or rooms and rent them out.</h4>
        <p>Your tenants pay your mortgage. You live for free — or close to it.</p>
      </div>
      <p><strong>The Win:</strong> If your housing cost drops to $0, your "required" income drops significantly. That breathing room is what gives you the freedom to start your own business, cut shifts, or build your next investment.</p>
      <p><strong>The Logic:</strong> This is the fastest way to gain financial breathing room without a raise, a side hustle, or more overtime. Let the property work for you.</p>

      <div class="highlight-box">
        Start with one strategy. Master it. Then stack the next one. You don't need to do everything at once — you need to do one thing right.
      </div>
    `
  },

  'tax-guide': {
    title: "Tax Deeds & Tax Liens Quick Guide",
    badge: "Reference",
    body: `
      <div class="highlight-box">
        Two lesser-known but potentially lucrative forms of real estate investment that reward the research-minded nurse investor.
      </div>

      <h2>What Is a Tax Lien?</h2>
      <p>A tax lien is a claim made by the government on a property when the homeowner fails to pay their property taxes. As an investor, you can purchase that tax lien at auction — effectively paying the owed taxes on the homeowner's behalf. In return, the homeowner must repay you, with interest, to clear the lien.</p>
      <p>Tax liens are issued as an immediate action when taxes go unpaid, creating a government-enforced obligation that protects your investment.</p>

      <h2>What Is a Tax Deed?</h2>
      <p>A tax deed is a legal document that transfers ownership of a property to an investor when the owner has failed to pay property taxes for a prolonged period — often years. The government sells the property at public auction to recover the unpaid taxes.</p>
      <p>Tax deeds represent the government's last resort to recover revenue. For investors, they represent an opportunity to acquire real property at well below market value.</p>

      <h2>Pros and Cons</h2>
      <h3>Pros</h3>
      <ul>
        <li><strong>Potentially High ROI</strong> — Both can yield high returns when well-researched. Lien states offer 8–36% state-mandated interest rates.</li>
        <li><strong>Lower Competition</strong> — Less popular than traditional real estate, which means less bidding pressure.</li>
        <li><strong>Asset-Backed</strong> — Your investment is secured by the property itself.</li>
      </ul>
      <h3>Cons</h3>
      <ul>
        <li><strong>Complexity</strong> — These require in-depth understanding of state-specific laws and processes.</li>
        <li><strong>Due Diligence Required</strong> — You must research thoroughly to avoid properties with structural issues, additional liens, or title problems.</li>
        <li><strong>Potential Risk Factors</strong> — Properties may have issues that affect profitability.</li>
      </ul>

      <h2>How to Get Started</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Research your state's laws</div><div class="check-items">Know whether your state is a lien state, a deed state, or both. Rules vary significantly.</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Identify properties</div><div class="check-items">Use public records and county websites to find upcoming auctions and available properties.</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Conduct due diligence</div><div class="check-items">Inspect properties where possible, pull title history, assess market value and condition.</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Attend the auction</div><div class="check-items">Register in advance. Know your maximum bid before you walk in. Stick to it.</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Manage your investment</div><div class="check-items">Understand redemption periods, foreclosure rights, and your exit strategy before bidding.</div></div></div>

      <h2>Key FAQs</h2>
      <h3>When can I expect returns?</h3>
      <p>For tax liens, returns come when the homeowner repays the debt. For tax deeds, after you sell or rent the acquired property.</p>
      <h3>What if the homeowner never pays?</h3>
      <p>In lien states, you may have the right to initiate foreclosure proceedings and potentially take ownership of the property.</p>
      <h3>What's the difference between a lien state and a deed state?</h3>
      <p>In a deed state, the property itself is sold to recover unpaid taxes. In a lien state, a certificate is sold to an investor who collects interest and may foreclose if the owner doesn't pay.</p>
      <h3>Are there hidden costs?</h3>
      <p>Yes — administrative fees, recording fees, title clearing costs, and potential repair expenses. Always factor these into your bid ceiling before auction day.</p>

      <div class="highlight-box">
        Tips for success: Conduct thorough due diligence on every property. Diversify across multiple liens or deeds. Think long-term — this strategy rewards patient, research-driven investors.
      </div>
    `
  },

  'group-home': {
    title: "Shared Living & Group Home Blueprint",
    badge: "Blueprint",
    body: `
      <div class="highlight-box">
        "An unlicensed group home provides room and board for 2 or more unrelated individuals. It is not licensed or certified by the state — but it is fully protected by federal law." — Dr. TMac
      </div>

      <h2>Start With Your WHY</h2>
      <p>Before you set up the business, get clear on why you're doing this. The strongest WHYs for nurses entering shared living:</p>
      <ul>
        <li>Create passive income that runs while you sleep</li>
        <li>Help your community by providing quality, affordable housing</li>
        <li>Build a legacy business your family can inherit</li>
        <li>Become your own boss without leaving healthcare</li>
        <li>Replace nursing income one room at a time</li>
      </ul>

      <h2>Legal Foundation</h2>
      <p>Unlicensed shared living homes are protected under multiple federal statutes. Municipalities cannot legally discriminate against group homes for people with disabilities:</p>
      <ul>
        <li><strong>Fair Housing Amendments Act (FHAA)</strong> — Prohibits treating disabled residents less favorably and blocks discriminatory zoning</li>
        <li><strong>ADA</strong> — Protects residents with physical and mental limitations</li>
        <li><strong>Rehabilitation Act of 1973</strong> — Additional federal protection</li>
      </ul>
      <p>If a city ordinance conflicts with federal law protecting your residents, federal law wins. Know your rights.</p>

      <h2>Who You Can Serve</h2>
      <p>Shared living homes serve a wide range of demographics — this is one of the most versatile housing models in real estate:</p>
      <ul>
        <li>Adults with physical or mental limitations</li>
        <li>Alzheimer's and memory care residents</li>
        <li>Addiction recovery and sober living</li>
        <li>Veterans transitioning to civilian life</li>
        <li>Aged-out foster youth</li>
        <li>Bad-credit housing seekers</li>
        <li>Travel nurses and healthcare workers</li>
        <li>Students and young professionals</li>
      </ul>

      <h2>Business Setup — Before You Launch</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Check name availability</div><div class="check-items">Use Namechk.com to check availability across platforms before you commit.</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Secure your domain and email</div><div class="check-items">Get a matching domain name and professional email address immediately.</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Get a virtual office address</div><div class="check-items">Critical for business funding and establishing a business line of credit.</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Register your LLC</div><div class="check-items">State registration, EIN from IRS.gov, and a dedicated business bank account.</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Set up accounting</div><div class="check-items">QuickBooks Online, Wave, or FreshBooks from day one. Track everything.</div></div></div>

      <h2>Finding Your Property</h2>
      <ul>
        <li>Look for ranch-style homes — single floor, accessible, easy to modify</li>
        <li>Consider renting before buying — leverage matters more than ownership in the beginning</li>
        <li>Check crime reports and visit the neighborhood at different times of day</li>
        <li>Get multiple insurance quotes: renter's, liability, and small business</li>
        <li>Look for high-vacancy areas — lower rent improves your margins significantly</li>
      </ul>

      <h2>If You Don't Have Capital Yet</h2>
      <p>You don't need to own the property to run a profitable shared living home. The partnership model works like this:</p>
      <ul>
        <li>Find someone with a home to use — family, friends, your network</li>
        <li>Offer to manage everything: marketing, intake calls, tenant management</li>
        <li>Propose a 50/50 split of net profit after expenses</li>
        <li>The property owner gets passive income with zero management headache</li>
        <li>You get a business with no acquisition cost</li>
      </ul>

      <h2>Operations — House Rules That Protect You</h2>
      <ul>
        <li>All agreements are licensee agreements — NOT leases. This is a key legal distinction.</li>
        <li>Management can terminate the arrangement at any time</li>
        <li>Payment due by the 5th of each month; $5/day late fee applies after that</li>
        <li>30-day written notice required for voluntary departure or deposit is forfeited</li>
        <li>Zero tolerance for drugs, alcohol, or violence — immediate termination</li>
        <li>Management reserves the right to request urine samples for erratic behavior</li>
        <li>Cameras in all common areas; keyless entry systems on all exterior doors</li>
      </ul>

      <h2>The Startup Checklist</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Research your target demographic and housing type</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Register business and open bank account</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Search and acquire your first property</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Create policies &amp; procedures manual</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Get insurance coverage</div></div></div>
      <div class="checklist-row"><span class="check-num">6</span><div><div class="check-title">Furnish with used, quality items (estate sales, Facebook Marketplace, Habitat ReStore)</div></div></div>
      <div class="checklist-row"><span class="check-num">7</span><div><div class="check-title">Set bed/room pricing and launch marketing plan</div></div></div>
      <div class="checklist-row"><span class="check-num">8</span><div><div class="check-title">Accept first client — get licensee agreement signed + deposit collected</div></div></div>
      <div class="checklist-row"><span class="check-num">9</span><div><div class="check-title">Set up Google Workspace + CRM + rent collection system</div></div></div>
      <div class="checklist-row"><span class="check-num">10</span><div><div class="check-title">Tweak, improve, and repeat at property #2</div></div></div>

      <div class="highlight-box">
        The goal is simple: get your first home running smoothly, then replicate the system. Each additional property is faster and easier than the last.
      </div>
    `
  },

  'private-money': {
    title: "Private Money Lending Masterclass",
    badge: "Masterclass",
    body: `
      <div class="highlight-box">
        "Private money lending lets you be the bank — collecting interest secured by real property, with no tenants, no management, and no maintenance calls at 2am."
      </div>

      <h2>What Is Private Money Lending?</h2>
      <p>Private money lending means providing loans to real estate investors using your own funds — rather than going through a traditional bank. Private lenders can be individuals, companies, or self-directed retirement accounts.</p>

      <h2>Why Nurses Are Ideal Private Lenders</h2>
      <ul>
        <li><strong>Higher Returns</strong> — Private loans earn 8–15% annually vs. 1–4% in savings accounts</li>
        <li><strong>Collateralized</strong> — Your loan is secured by a real property, reducing risk of loss</li>
        <li><strong>True Passive Income</strong> — Once funded, you receive interest payments monthly with no active management</li>
        <li><strong>Control</strong> — You choose which deals to fund and set your own terms</li>
        <li><strong>Diversification</strong> — Spreads your wealth across asset classes beyond the stock market</li>
      </ul>

      <h2>The Four Types of Borrowers</h2>
      <div class="strategy-block">
        <div class="s-label">Borrower Type 1</div>
        <h4>Rehab/Sell (Fix &amp; Flip)</h4>
        <p>Investors who buy distressed properties, renovate them, and sell for profit. They need fast access to funds — which is exactly what private money provides.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Borrower Type 2</div>
        <h4>Rehab/Rent (BRRRR)</h4>
        <p>Investors who renovate properties and hold them for rental income. Same funding needs as fix-and-flip, but with a long-term cash flow exit instead of a sale.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Borrower Type 3</div>
        <h4>Builders &amp; Developers</h4>
        <p>Developers purchasing vacant land to build residential or commercial properties. Conventional banks often won't touch speculative development — private money fills the gap.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Borrower Type 4</div>
        <h4>Commercial Bridge Borrowers</h4>
        <p>Commercial investors who need short-term financing while a property stabilizes before qualifying for conventional financing.</p>
      </div>

      <h2>How You Get Paid — 4 Structures</h2>
      <ul>
        <li><strong>Interest Payments</strong> (most common) — Borrower pays monthly interest; you collect a steady income stream throughout the loan term</li>
        <li><strong>Points</strong> — Borrower pays fees upfront (1 point = 1% of loan) at closing; you're paid a lump sum immediately plus interest</li>
        <li><strong>Exit Fees</strong> — Predetermined amount paid at loan payoff; often structured as a percentage of the deal</li>
        <li><strong>Joint Ventures</strong> — You share in the final profits instead of charging interest; higher upside, higher risk</li>
      </ul>

      <h2>Deal Analysis Example — Good Deal</h2>
      <p>Single-family home rehab. ARV: $200,000. Rehab loan: $50,000. Term: 6 months. Rate: 12% per year.</p>
      <ul>
        <li>Monthly interest income: <strong>$500</strong></li>
        <li>Total interest earned: <strong>$3,000</strong></li>
        <li>Loan-to-ARV ratio: <strong>25%</strong> — excellent protection</li>
        <li>Verdict: Strong deal. Low LTV, experienced investor, clear exit strategy.</li>
      </ul>

      <h2>Deal Analysis Example — Proceed with Caution</h2>
      <p>Multi-unit apartment rehab. ARV: $1,500,000. Rehab loan: $500,000. Investor has limited multi-unit experience. High-vacancy market.</p>
      <ul>
        <li>LTV ratio: <strong>33%</strong> — limited margin of safety</li>
        <li>Market conditions: competitive, high vacancy, low rental demand</li>
        <li>Verdict: Elevated risk. Inexperienced borrower + challenged market = proceed carefully or pass.</li>
      </ul>

      <h2>Documents You Need</h2>
      <ul>
        <li><strong>Promissory Note</strong> — The borrower's legally binding promise to repay under specific terms; includes loan amount, interest rate, repayment plan, and collateral details</li>
        <li><strong>Mortgage Agreement or Deed of Trust</strong> — Creates a lien on the property securing your loan; varies by state (some require Deed of Trust instead)</li>
        <li><strong>Real Estate Attorney</strong> — Non-negotiable. Always have a qualified attorney review your documents before you fund any loan.</li>
      </ul>

      <h2>Tips for Starting Your Lending Business</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Start small</div><div class="check-items">Set a comfortable investment range and don't exceed it. Build your track record before scaling.</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Hire a real estate attorney</div><div class="check-items">Before you write a single check, have legal protection in place. Non-negotiable.</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Focus locally first</div><div class="check-items">Your local market knowledge is an advantage. Start close to home, then expand.</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Maintain transparency</div><div class="check-items">Don't exaggerate your portfolio. Let your work speak for itself from day one.</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Keep learning</div><div class="check-items">You're still an investor even when you're the lender. Stay current on market trends.</div></div></div>
      <div class="checklist-row"><span class="check-num">6</span><div><div class="check-title">Join your local REIA</div><div class="check-items">Real Estate Investment Associations are where borrowers and lenders meet. Show up consistently.</div></div></div>

      <div class="highlight-box">
        As a nurse, you already understand risk management, protocol, and documentation. Those skills transfer directly to private money lending — and they give you an edge most lenders don't have.
      </div>
    `
  },

  'tax-sale-checklist': {
    title: "Buying Properties at a Tax Sale — Checklist",
    badge: "Checklist",
    body: `
      <div class="highlight-box">
        "This checklist is your roadmap to taking action and turning knowledge into results." — Dr. TMac
      </div>
      <p>Use this checklist before and during every tax sale auction you participate in. Knowledge without action is just information — this is the action plan.</p>

      <h2>Before the Auction</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Research the Tax Sale Process</div><div class="check-items">Understand local rules and procedures. Confirm whether the sale is for tax liens or tax deeds. Confirm auction date, time, and location.</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Register for the Auction</div><div class="check-items">Pre-register online or in person if required. Verify registration deadlines and any associated fees.</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Understand Auction Rules</div><div class="check-items">Review bidding rules, payment terms, and acceptable forms of payment. Know bidding increments and how to place a winning bid.</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Research the Properties</div><div class="check-items">Get the full property list. Perform due diligence on each property: location, zoning, potential issues, neighborhood trends, and total tax liability including any additional liens.</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Visit the Properties</div><div class="check-items">Drive by or inspect in person where possible. Evaluate condition — remember you may not be able to enter. Note the surrounding neighborhood.</div></div></div>
      <div class="checklist-row"><span class="check-num">6</span><div><div class="check-title">Set Your Budget</div><div class="check-items">Determine your maximum bid per property before you walk in. Factor in repairs, title clearing, legal fees, and any other post-purchase costs. Your max bid is your ceiling — not a starting point.</div></div></div>
      <div class="checklist-row"><span class="check-num">7</span><div><div class="check-title">Secure Your Financing</div><div class="check-items">Ensure funds are available and accessible. Many jurisdictions require payment within 24–48 hours of winning. Some require cashier's checks or wire transfers — confirm in advance.</div></div></div>

      <h2>At the Auction</h2>
      <div class="checklist-row"><span class="check-num">8</span><div><div class="check-title">Attend the Auction</div><div class="check-items">Arrive early whether in person or online. Stick to your pre-determined bid ceiling. Do not let competitive pressure push you over your number. Track every property you bid on.</div></div></div>

      <h2>After You Win</h2>
      <div class="checklist-row"><span class="check-num">9</span><div><div class="check-title">Complete the Post-Auction Process</div><div class="check-items">Confirm payment details immediately. Complete the transaction within the required timeframe. Obtain a receipt or proof of purchase for your records.</div></div></div>
      <div class="checklist-row"><span class="check-num">10</span><div><div class="check-title">Clear Title</div><div class="check-items">Work on clearing any additional liens or securing title insurance. Hire a title company or real estate attorney if needed — this step protects your entire investment.</div></div></div>
      <div class="checklist-row"><span class="check-num">11</span><div><div class="check-title">Plan Your Exit Strategy</div><div class="check-items">Decide now: will you flip, rent, or hold the property? Develop your management or sales strategy before making any improvements. Know your numbers before you spend a dollar on rehab.</div></div></div>

      <div class="highlight-box">
        The investors who win at tax sales are the ones who do the work before auction day — not during it. Your due diligence is your competitive edge.
      </div>
    `
  }

};

function openResource(id) {
  const resource = RESOURCES[id];
  if (!resource) return;

  document.getElementById('reader-title').textContent = resource.title;
  document.getElementById('reader-badge').textContent = resource.badge;
  document.getElementById('reader-body').innerHTML = resource.body;

  navigateTo('reader');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeResource() {
  navigateTo('resources');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------------------------
   LESSON READER — ALL 30 LESSONS
   ---------------------------------------------------------- */

let currentLessonId = null;

const LESSONS = {

  '1-1': {
    num: '1.1',
    title: 'Why Nurses Are Built for Ownership',
    body: `
      <div class="highlight-box">
        "Every skill you use at the bedside — critical thinking, systems management, staying calm under pressure — is a skill that makes you a better investor. The only difference is the arena."
      </div>
      <h2>The Mindset Shift</h2>
      <p>Most nurses never see themselves as investors. You've been trained to think of yourself as a caregiver, a clinician, a healthcare professional. That identity is real and it's valuable. But it can also be a ceiling if you let it stop there.</p>
      <p>Ownership is a mindset before it's a strategy. It means seeing yourself as someone who builds assets — not just earns income. That shift doesn't require a degree in finance. It requires a decision.</p>
      <h2>Your Clinical Skills Are Investment Skills</h2>
      <ul>
        <li><strong>Attention to detail</strong> — You catch what others miss. In real estate, that means spotting issues in a contract, a property, or a deal structure before they become problems.</li>
        <li><strong>Systems thinking</strong> — You understand that processes and protocols create consistent outcomes. Investment properties run the same way — the right systems make them nearly self-managing.</li>
        <li><strong>Crisis management</strong> — You don't panic when things go sideways. That composure is worth more than any credential when a tenant calls at midnight or a deal falls through.</li>
        <li><strong>Documentation and compliance</strong> — You already know how to keep records, follow protocols, and protect yourself legally. Real estate investing rewards these habits.</li>
        <li><strong>Empathy and communication</strong> — You know how to work with people in difficult circumstances. That makes you a better landlord, a better partner, and a better negotiator.</li>
      </ul>
      <h2>The Real Gap</h2>
      <p>The gap between where you are and where you want to be isn't knowledge — it's application. You already have more tools than you think. This program is about giving you a framework to use them in a new direction.</p>
      <div class="highlight-box">You were trained to save lives. Now it's time to build one — on your own terms.</div>
    `
  },

  '1-2': {
    num: '1.2',
    title: 'The Burnout-to-Ownership Framework',
    body: `
      <div class="highlight-box">
        "Burnout isn't weakness. It's information. It's telling you that the current arrangement isn't sustainable — and that it's time to build something that is."
      </div>
      <h2>The Three Phases</h2>
      <p>Building ownership while working nursing shifts doesn't happen overnight. But it follows a predictable path that every nurse investor moves through:</p>
      <div class="strategy-block">
        <div class="s-label">Phase 1</div>
        <h4>Learn</h4>
        <p>Understand the strategies, the numbers, and the market before you spend a dollar. This is where you are right now. Most nurses rush past this phase — don't. The deals you pass on because you weren't ready cost you far less than the ones you take before you are.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Phase 2</div>
        <h4>Acquire</h4>
        <p>Make your first move. Buy your first property, secure your first lien, or start your first shared living home. The first one is always the hardest. It's also the one that changes everything.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Phase 3</div>
        <h4>Scale</h4>
        <p>Use the income, equity, and experience from your first investment to fund the second. Then the third. Each one gets faster and easier because your systems, relationships, and confidence compound alongside your portfolio.</p>
      </div>
      <h2>Where Most Nurses Get Stuck</h2>
      <p>The most common trap is staying in Phase 1 indefinitely — consuming information without taking action. Set a deadline for your first move. Use the calculators in this app to build conviction. Then act.</p>
      <p>The second trap is trying to go straight to Phase 3 without building the foundation. Scale what works. Don't scale what you haven't tested.</p>
      <div class="highlight-box">Progress looks like this: Learn enough to act. Act enough to learn more. Repeat until the portfolio runs itself.</div>
    `
  },

  '1-3': {
    num: '1.3',
    title: 'Understanding Your Nurse Financial Picture',
    body: `
      <h2>Start With Honesty</h2>
      <p>Before you can build wealth, you need a clear picture of what you're working with. Most nurses are surprised by what they find when they actually look at the numbers — both positively and negatively.</p>
      <h2>What to Assess</h2>
      <h3>Income</h3>
      <ul>
        <li>Your base hourly rate and total monthly take-home after taxes</li>
        <li>Overtime income — but don't count it as permanent. Base your investment decisions on your base pay only.</li>
        <li>Any existing side income, rental income, or business revenue</li>
      </ul>
      <h3>Expenses</h3>
      <ul>
        <li>Fixed: rent/mortgage, car payment, insurance, subscriptions</li>
        <li>Variable: food, fuel, personal spending</li>
        <li>Debt payments: student loans, credit cards, personal loans</li>
      </ul>
      <h3>Savings Rate</h3>
      <p>What percentage of your take-home are you keeping? Even 10–15% consistently — invested into real assets — builds significant wealth over time.</p>
      <h3>Capital Available</h3>
      <p>How much do you have accessible for an investment right now? This includes savings, accessible retirement funds (some allow self-directed real estate investing), and equity in property you already own.</p>
      <h2>The 90-Day Mobilization Question</h2>
      <p>Ask yourself: <em>Without compromising my household stability, how much capital could I responsibly deploy into a real estate investment in the next 90–180 days?</em></p>
      <p>That number — even if it's $5,000 — is your starting point. Real estate strategies exist at every capital level. The goal is to match the right strategy to your current reality.</p>
      <div class="highlight-box">You don't need a lot of money to start. You need an honest number and the right strategy for that number.</div>
    `
  },

  '1-4': {
    num: '1.4',
    title: 'Selecting Your First Ownership Strategy',
    body: `
      <h2>No Single Strategy Fits Every Nurse</h2>
      <p>Your first investment strategy should match your capital, your schedule, your risk tolerance, and your goals. The worst move is copying someone else's path without checking whether it fits your life.</p>
      <h2>The Decision Framework</h2>
      <h3>How much capital do you have available?</h3>
      <ul>
        <li><strong>Under $10K</strong> — Shared living partnership model, tax liens, or creative financing strategies like seller financing</li>
        <li><strong>$10K–$30K</strong> — House hacking with FHA loan (3.5% down), tax deed auctions</li>
        <li><strong>$30K–$100K</strong> — MTR, buy-and-hold rental, private money lending</li>
        <li><strong>$100K+</strong> — Multiple strategies in parallel; private lending at scale</li>
      </ul>
      <h3>How much time do you have?</h3>
      <ul>
        <li><strong>Very limited (3–5 hrs/week)</strong> — Private money lending, tax liens, or a property manager-run rental</li>
        <li><strong>Moderate (5–10 hrs/week)</strong> — Shared living, MTR, house hacking</li>
        <li><strong>More available</strong> — Any strategy, including hands-on management</li>
      </ul>
      <h3>What's your risk tolerance?</h3>
      <ul>
        <li><strong>Conservative</strong> — Tax liens (government-backed), private lending (collateralized)</li>
        <li><strong>Moderate</strong> — Buy-and-hold rentals, house hacking, MTR</li>
        <li><strong>Growth-oriented</strong> — Shared living, tax deeds, value-add properties</li>
      </ul>
      <div class="highlight-box">The best strategy is the one you'll actually execute. Pick one. Use the calculators in this app to validate it. Then move.</div>
    `
  },

  '1-5': {
    num: '1.5',
    title: 'The 90-Day Nurse Owner Launch Plan',
    body: `
      <h2>Your First 90 Days</h2>
      <p>This isn't a someday plan. It's a now plan. Here's how to structure your first three months as a nurse building toward ownership:</p>
      <div class="strategy-block">
        <div class="s-label">Days 1–30 — Foundation</div>
        <h4>Build the knowledge base and clarify your target</h4>
        <ul>
          <li>Complete Modules 1 and 2 in this app</li>
          <li>Select your primary investment strategy</li>
          <li>Run your current financial picture honestly</li>
          <li>Identify your target market (city, neighborhood, property type)</li>
          <li>Open a dedicated savings account for your investment capital</li>
        </ul>
      </div>
      <div class="strategy-block">
        <div class="s-label">Days 31–60 — Research &amp; Relationships</div>
        <h4>Build your team and start analyzing deals</h4>
        <ul>
          <li>Find an investor-friendly realtor in your target market</li>
          <li>Talk to at least two lenders — know what you qualify for</li>
          <li>Attend one local real estate investor meeting (REIA)</li>
          <li>Analyze 10 deals using the calculators in this app</li>
          <li>Set your deal criteria: minimum cash flow, max purchase price, target neighborhoods</li>
        </ul>
      </div>
      <div class="strategy-block">
        <div class="s-label">Days 61–90 — Action</div>
        <h4>Make your first move</h4>
        <ul>
          <li>Submit your first offer — or place your first auction bid</li>
          <li>If not ready to buy, launch your shared living partnership outreach</li>
          <li>Log every deal you're tracking in the app's Deal Tracker</li>
          <li>Share your progress in the Telegram community</li>
        </ul>
      </div>
      <div class="highlight-box">90 days from today, you will either have made your first move — or you'll be exactly where you are now. The plan is in your hands.</div>
    `
  },

  '2-1': {
    num: '2.1',
    title: 'How Real Estate Creates Wealth',
    body: `
      <div class="highlight-box">
        "A nursing salary is a ceiling. Real estate is a ladder. The two together build something a W2 alone never can."
      </div>
      <h2>The Five Pillars of Real Estate Wealth</h2>
      <div class="strategy-block">
        <div class="s-label">Pillar 1</div>
        <h4>Cash Flow</h4>
        <p>Monthly income after all expenses are paid. This is the income that can eventually replace your nursing salary. Even $500/month from one property is a shift you don't have to work.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Pillar 2</div>
        <h4>Appreciation</h4>
        <p>Real estate historically appreciates 3–5% per year nationally. On a $200,000 property, that's $6,000–$10,000 in wealth growth annually — without doing anything.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Pillar 3</div>
        <h4>Leverage</h4>
        <p>You control a $200,000 asset with $10,000 down. That 20:1 leverage means even modest appreciation creates enormous returns on your actual cash invested.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Pillar 4</div>
        <h4>Tax Advantages</h4>
        <p>Depreciation, mortgage interest deductions, and 1031 exchanges let real estate investors legally reduce their tax burden in ways W2 employees cannot. Consult a real estate CPA to maximize yours.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Pillar 5</div>
        <h4>Equity Paydown</h4>
        <p>Every month your tenant pays rent, a portion of that payment pays down your mortgage — building your equity automatically. Your tenant is literally buying you a piece of the property.</p>
      </div>
      <h2>Why W2 Income Alone Isn't Enough</h2>
      <p>A nursing salary is taxed at the highest rates, doesn't appreciate, doesn't build equity, and stops the moment you stop working. Real estate works while you sleep, while you're on shift, and after you retire. The goal isn't to replace your income immediately — it's to build a second engine that eventually runs independently.</p>
    `
  },

  '2-2': {
    num: '2.2',
    title: 'Reading a Market',
    body: `
      <h2>Not Every Market Is a Good Market</h2>
      <p>Location determines everything in real estate. A great deal in the wrong market is still the wrong deal. Here's how to evaluate a market before you commit capital to it.</p>
      <h2>What to Look For</h2>
      <h3>Population Trends</h3>
      <p>Is the city growing or shrinking? Growing populations create housing demand. Shrinking populations create vacancies. Look for metros with net in-migration over the past 5 years.</p>
      <h3>Employment Anchors</h3>
      <p>What are the major employers? Hospitals, universities, military bases, and corporate headquarters create stable, long-term demand for housing. For MTR investors — proximity to a major medical center is gold.</p>
      <h3>Rental Demand Indicators</h3>
      <p>What is the vacancy rate? Under 5% is strong. What is the average days-on-market for rentals? Under 30 days means demand is outpacing supply.</p>
      <h3>Price-to-Rent Ratio</h3>
      <p>Divide the purchase price by the annual rent. A ratio under 15 generally favors buying. Over 20 generally favors renting. This helps you quickly screen markets for cash flow potential.</p>
      <h2>Research Tools</h2>
      <ul>
        <li><strong>Zillow / Realtor.com</strong> — Property values and rental comps</li>
        <li><strong>Census.gov</strong> — Population and demographic trends</li>
        <li><strong>BLS.gov</strong> — Local employment data</li>
        <li><strong>Rentometer.com</strong> — Rental rate benchmarks by zip code</li>
        <li><strong>Your local REIA</strong> — On-the-ground insight no website can give you</li>
      </ul>
      <div class="highlight-box">Start with your own backyard. You already know the hospitals, the demand for travel nurses, and the neighborhoods. That local knowledge is a competitive advantage.</div>
    `
  },

  '2-3': {
    num: '2.3',
    title: 'Financing as a Nurse',
    body: `
      <h2>Your W2 Is Your Superpower</h2>
      <p>As a working nurse with documented income, you have access to financing options that self-employed investors spend years trying to qualify for. Use that advantage.</p>
      <h2>Your Financing Options</h2>
      <div class="strategy-block">
        <div class="s-label">Option 1</div>
        <h4>FHA Loan — 3.5% Down</h4>
        <p>Federal Housing Administration loans allow first-time homebuyers to purchase with as little as 3.5% down. Works for 1–4 unit properties, making it ideal for house hacking. Requires owner-occupancy for the first year.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Option 2</div>
        <h4>Conventional Loan — 5–20% Down</h4>
        <p>Standard mortgage for investment properties. Better rates than FHA for buyers with strong credit (720+). Available for 1–4 units; investment properties typically require 15–25% down.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Option 3</div>
        <h4>DSCR Loan — Income from the Property</h4>
        <p>Debt Service Coverage Ratio loans qualify based on the property's rental income — not your personal income. Ideal when you've maxed out conventional financing or have irregular nurse income from agency work.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Option 4</div>
        <h4>Private Money — From Investors</h4>
        <p>Loans from individuals rather than institutions. More flexible terms, faster closings, no institutional underwriting requirements. Ideal for properties that don't qualify for conventional financing.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Option 5</div>
        <h4>Seller Financing</h4>
        <p>The seller acts as the bank. You negotiate terms directly. No bank required, no institutional qualification process. Rare but powerful when you find a motivated seller.</p>
      </div>
      <h2>The Healthcare Professional Advantage</h2>
      <p>Many lenders offer LMI (Lenders Mortgage Insurance) waivers for healthcare professionals — allowing you to put down as little as 5–10% without paying PMI. Ask every lender you speak to whether they offer this. Not all advertise it.</p>
    `
  },

  '2-4': {
    num: '2.4',
    title: 'Analyzing Your First Deal',
    body: `
      <h2>Run Numbers Before You Fall in Love</h2>
      <p>Emotions buy bad deals. Numbers buy good ones. Before you make any offer, run the property through these four metrics. Use the calculators in this app to do it in under 60 seconds.</p>
      <h2>The Four Core Metrics</h2>
      <div class="strategy-block">
        <div class="s-label">Metric 1</div>
        <h4>Monthly Cash Flow</h4>
        <p>Gross Rent − Mortgage − Taxes − Insurance − Management − Repairs = Cash Flow. A deal should generate at least $200–$300/month net to be worth pursuing as a buy-and-hold.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Metric 2</div>
        <h4>Cash-on-Cash Return (CoC)</h4>
        <p>Annual Cash Flow ÷ Total Cash Invested. This tells you what percentage return you're earning on your actual money. 8–12% CoC is solid. Under 6% and you should look harder at the deal.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Metric 3</div>
        <h4>Cap Rate</h4>
        <p>Net Operating Income ÷ Purchase Price. Used to compare properties regardless of financing. A cap rate of 6–8% is generally acceptable in most markets. Higher is better.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Metric 4</div>
        <h4>Gross Rent Multiplier (GRM)</h4>
        <p>Purchase Price ÷ Annual Gross Rent. A quick screening tool. Under 10 is strong. Over 15 and the deal likely won't cash flow well. Use this to quickly eliminate overpriced properties.</p>
      </div>
      <h2>The 1% Rule (Quick Screen)</h2>
      <p>If the monthly rent is at least 1% of the purchase price, the deal may cash flow. A $150,000 property should rent for at least $1,500/month. This is a screening tool, not a final analysis — always run the full numbers.</p>
      <div class="highlight-box">Use the calculators tab in this app to run any deal in real time. Analyze at least 10 deals before you make your first offer.</div>
    `
  },

  '2-5': {
    num: '2.5',
    title: 'Making and Negotiating Offers',
    body: `
      <h2>The Offer Is Not the End — It's the Beginning</h2>
      <p>Making an offer is where most first-time investors freeze. The fear of rejection, overpaying, or making a mistake keeps them in analysis paralysis. Here's the reality: submitting an offer costs you nothing. Not submitting one costs you everything.</p>
      <h2>Structuring a Smart Offer</h2>
      <h3>Know Your Maximum Price</h3>
      <p>Run the deal in the calculator first. Know the maximum price that still meets your cash flow criteria. Never let a seller or agent negotiate you above your number.</p>
      <h3>Use Contingencies to Protect Yourself</h3>
      <ul>
        <li><strong>Inspection contingency</strong> — Gives you the right to back out or renegotiate after a professional inspection</li>
        <li><strong>Financing contingency</strong> — Protects your deposit if your loan falls through</li>
        <li><strong>Appraisal contingency</strong> — Protects you if the property appraises below the purchase price</li>
      </ul>
      <h3>Earnest Money</h3>
      <p>Typically 1–3% of purchase price, held in escrow. It demonstrates you're serious and is applied to your down payment at closing. Only at risk if you back out outside of your contingency windows.</p>
      <h2>Negotiation Principles</h2>
      <ul>
        <li>Start below your maximum. Leave room to move.</li>
        <li>Ask for seller credits toward closing costs — often more effective than a lower price</li>
        <li>Use inspection findings to renegotiate price or repairs</li>
        <li>Know the seller's motivation — timeline, condition, liens — and make an offer that solves their problem</li>
        <li>Be willing to walk away. That willingness is your greatest negotiating leverage.</li>
      </ul>
    `
  },

  '2-6': {
    num: '2.6',
    title: 'Closing and Managing Your First Property',
    body: `
      <h2>Closing Day</h2>
      <p>Closing is the transfer of ownership. You'll review and sign the closing disclosure, provide your down payment and closing costs, and receive the keys. Have your attorney or title company review everything before you sign.</p>
      <h2>Setting Up for Rental</h2>
      <ul>
        <li>Inspect thoroughly — document every existing condition with photos before a tenant moves in</li>
        <li>Change all locks and provide new keys</li>
        <li>Ensure all appliances, HVAC, plumbing, and electrical are functional</li>
        <li>Set up a dedicated business bank account for rental income and expenses</li>
        <li>Get landlord insurance — different from homeowner's insurance</li>
      </ul>
      <h2>Tenant Screening — The Most Important Step</h2>
      <p>A great property with a bad tenant becomes a nightmare. Screen every applicant for:</p>
      <ul>
        <li>Credit score (minimum 620–650 for most rental situations)</li>
        <li>Income verification (2.5–3x monthly rent in gross income)</li>
        <li>Rental history and previous landlord references</li>
        <li>Criminal background check per your state's guidelines</li>
      </ul>
      <h2>Building Systems That Run Without You</h2>
      <ul>
        <li><strong>Online rent collection</strong> — Avail, TurboTenant, or Buildium. Automatic reminders, late fees, and payment records.</li>
        <li><strong>Maintenance requests</strong> — A dedicated email or app for maintenance keeps everything documented</li>
        <li><strong>Property manager</strong> — If you have more than 2 properties or zero time, 8–10% of monthly rent is worth it</li>
      </ul>
      <div class="highlight-box">The goal is to build a rental business that runs on systems, not on your constant involvement. Design it passive from day one.</div>
    `
  },

  '3-1': {
    num: '3.1',
    title: "The Government's Role: How Tax Liens and Tax Deeds Work",
    body: `
      <h2>Where This Opportunity Comes From</h2>
      <p>Every property owner pays annual property taxes. When they don't — whether due to financial hardship, neglect, or abandonment — the government needs a mechanism to recover that revenue. Tax liens and tax deeds are that mechanism. And they create an investment opportunity for you.</p>
      <h2>The Lifecycle of a Delinquent Property</h2>
      <div class="strategy-block">
        <div class="s-label">Stage 1</div>
        <h4>Taxes Go Unpaid</h4>
        <p>A property owner misses their tax payment. The government records this delinquency and begins the collection process.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Stage 2</div>
        <h4>Lien Is Placed (Lien States)</h4>
        <p>In tax lien states, the government places a legal claim on the property. This lien is then sold to investors at auction. The investor pays the back taxes, and the homeowner now owes the investor — plus interest.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Stage 3</div>
        <h4>Redemption Period</h4>
        <p>The property owner has a legally defined window — anywhere from a few months to several years depending on the state — to repay the investor and reclaim their property. During this time, the investor earns state-mandated interest.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Stage 4</div>
        <h4>Deed Auction or Foreclosure</h4>
        <p>If the owner doesn't redeem: in lien states, the investor may foreclose. In deed states, the government auctions the actual property to the highest bidder.</p>
      </div>
      <div class="highlight-box">Understanding the full lifecycle before you bid is non-negotiable. Know your state's rules cold before spending a dollar at auction.</div>
    `
  },

  '3-2': {
    num: '3.2',
    title: 'Tax Lien Certificates: How to Earn 8–36% on Your Investment',
    body: `
      <h2>The Basics</h2>
      <p>When you purchase a tax lien certificate, you're paying someone's overdue property taxes on their behalf. The government guarantees you a fixed interest rate — set by the state — on that money. The property itself secures your investment.</p>
      <h2>Interest Rates by State (Examples)</h2>
      <ul>
        <li><strong>Florida</strong> — Up to 18% (competitive bidding often drives effective rate lower)</li>
        <li><strong>Arizona</strong> — Up to 16%</li>
        <li><strong>Illinois</strong> — Up to 36% penalty</li>
        <li><strong>Iowa</strong> — 24% maximum</li>
        <li><strong>New Jersey</strong> — Up to 18%</li>
      </ul>
      <p>Note: In competitive auction states, investors bid down the interest rate. The winning bid is the one willing to accept the lowest rate. Research your target state's auction format before bidding.</p>
      <h2>What Happens Next</h2>
      <ul>
        <li><strong>If the owner redeems</strong> — They pay you back the lien amount plus all accrued interest. You made your return and move on.</li>
        <li><strong>If the owner doesn't redeem</strong> — After the redemption period, you may initiate foreclosure proceedings and potentially take title to the property.</li>
      </ul>
      <h2>Selecting Quality Liens</h2>
      <ul>
        <li>Focus on owner-occupied residential properties — they have the highest redemption rate</li>
        <li>Avoid mobile homes, vacant lots, and commercial properties when starting out</li>
        <li>Verify there are no other superior liens on the property</li>
        <li>Check the assessed value relative to the lien amount — you want equity protection</li>
      </ul>
    `
  },

  '3-3': {
    num: '3.3',
    title: 'Tax Deed Auctions: Acquiring Property Below Market Value',
    body: `
      <h2>What Is a Tax Deed Auction?</h2>
      <p>In tax deed states, when a property owner fails to pay taxes for a prolonged period, the government seizes the property and sells it at public auction to recover the back taxes. The buyer receives a tax deed — legal ownership of the property — often at a fraction of market value.</p>
      <h2>How Auctions Work</h2>
      <ul>
        <li>Counties publish lists of upcoming auction properties — usually 2–4 weeks in advance</li>
        <li>Auctions occur in person at the county courthouse or online through platforms like Bid4Assets</li>
        <li>Minimum bids are typically set at the amount of back taxes owed — often far below market value</li>
        <li>Payment is usually required within 24–48 hours of winning. Cash or certified funds only.</li>
      </ul>
      <h2>Common Traps for New Investors</h2>
      <ul>
        <li><strong>Emotional bidding</strong> — Auction environments create urgency. Know your maximum bid before you walk in and never exceed it.</li>
        <li><strong>Skipping due diligence</strong> — You cannot enter most tax deed properties before purchase. Research the exterior, the neighborhood, the title history, and the comps before bidding.</li>
        <li><strong>Additional liens</strong> — Some tax deeds come with IRS liens or other encumbrances that survive the tax sale. Always do a title search.</li>
        <li><strong>Overestimating ARV</strong> — Pull conservative comps. Assume the worst on repairs. Your margin of safety is what protects your profit.</li>
      </ul>
      <div class="highlight-box">The money in tax deed investing is made during due diligence — not during the auction. Do the work before the bidding starts.</div>
    `
  },

  '3-4': {
    num: '3.4',
    title: 'Due Diligence for Tax Properties',
    body: `
      <h2>The Five Areas to Research</h2>
      <div class="strategy-block">
        <div class="s-label">Area 1</div>
        <h4>Property Information</h4>
        <p>Pull the property address, legal description, assessed value, property type, and size. Get photos from the county assessor. Drive by if possible — you may not be able to enter, but you can see the exterior and neighborhood.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Area 2</div>
        <h4>Tax &amp; Lien History</h4>
        <p>Review all current and past tax records. Confirm the total owed including penalties. Identify any upcoming auction dates and redemption period details. Check for IRS liens, HOA liens, or other encumbrances that may survive the tax sale.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Area 3</div>
        <h4>Title Records</h4>
        <p>Run a title search to uncover all liens and encumbrances. Review the chain of ownership. Identify any pending legal disputes. Consider purchasing title insurance after acquisition.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Area 4</div>
        <h4>Market Research</h4>
        <p>Pull comparable sales within 0.5 miles from the past 6 months. Assess neighborhood trends. Calculate your conservative ARV and work backward from there to determine your maximum bid.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Area 5</div>
        <h4>Your Decision Matrix</h4>
        <p>Score each property across key factors: redemption potential, property condition, market conditions, title cleanliness, and projected return. Compare multiple properties before deciding where to bid.</p>
      </div>
    `
  },

  '3-5': {
    num: '3.5',
    title: 'Exit Strategies: Flip, Rent, or Hold',
    body: `
      <h2>Know Your Exit Before You Bid</h2>
      <p>The most common mistake in tax deed investing is winning a property without a clear plan for what to do with it next. Your exit strategy determines your entire acquisition strategy — including how much you should pay.</p>
      <h2>The Three Exits</h2>
      <div class="strategy-block">
        <div class="s-label">Exit 1</div>
        <h4>Flip (Rehab and Sell)</h4>
        <p>Acquire below market, renovate, sell at or near ARV. Best for properties in improving neighborhoods with strong buyer demand. Requires capital for rehab and a reliable contractor network. Profit timeline: 3–9 months.</p>
        <p><strong>Target margin:</strong> Minimum 20% of ARV in profit after all costs.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Exit 2</div>
        <h4>Rent (Buy and Hold)</h4>
        <p>Acquire, renovate to rental standard, and hold for long-term cash flow. Best for properties in stable rental markets with consistent tenant demand. Builds wealth through cash flow, appreciation, and equity paydown simultaneously.</p>
        <p><strong>Target metric:</strong> Minimum 8% cash-on-cash return on your total investment.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Exit 3</div>
        <h4>Wholesale or Assign</h4>
        <p>If you win a property you don't want to manage, you can sell it quickly to another investor — often for a $5,000–$20,000 profit — without doing any renovation. Requires a buyers list or REIA network.</p>
      </div>
      <div class="highlight-box">Decide your exit before you bid. The right exit makes your acquisition criteria clear. The wrong exit — or no exit — is how investors get stuck with properties they can't move.</div>
    `
  },

  '4-1': {
    num: '4.1',
    title: 'The Business Model: How Shared Living Outperforms Traditional Rentals',
    body: `
      <div class="highlight-box">
        "A 4-bedroom house rented to one family generates $1,800/month. The same house rented by the room generates $3,600–$5,000/month. Same property. Different model."
      </div>
      <h2>The Core Difference</h2>
      <p>Traditional rentals price by the unit. Shared living prices by the bed. That single distinction — renting rooms instead of whole units — is what makes shared living generate 2–3x the income of conventional rental on the same property footprint.</p>
      <h2>Why It Works</h2>
      <ul>
        <li><strong>Affordability demand is growing</strong> — Housing costs have outpaced wage growth. Shared living fills a real gap for working adults who need quality housing at accessible prices.</li>
        <li><strong>Multiple income streams from one property</strong> — 5 tenants paying $900/month each = $4,500. One tenant in the same house = $1,600. The math changes everything.</li>
        <li><strong>Vacancy protection</strong> — When one of five rooms is vacant, you still collect 80% of your revenue. When a single-family rental goes vacant, you collect 0%.</li>
        <li><strong>All-inclusive pricing commands premium</strong> — Including utilities, WiFi, laundry, and furnished rooms allows you to charge significantly above the per-room market rate.</li>
      </ul>
      <h2>The Nurse Advantage in Shared Living</h2>
      <p>Your background in care, community, and structure is a direct asset in this model. You understand the importance of safety, dignity, clear expectations, and a well-run environment. Those values — translated into operations — create the kind of homes tenants stay in long-term and refer others to.</p>
    `
  },

  '4-2': {
    num: '4.2',
    title: 'Setting Up Your First Shared Living Property',
    body: `
      <h2>Choosing the Right Property</h2>
      <ul>
        <li><strong>Ranch-style homes</strong> are ideal — accessible, single-floor, easy to configure</li>
        <li>Look for at least 3 bedrooms; 4–6 is the sweet spot for profitability</li>
        <li>Shared common areas (kitchen, living room, laundry) are essential</li>
        <li>Check zoning — most residential zones permit group homes under federal fair housing protections</li>
      </ul>
      <h2>Furnishing for Minimal Cost</h2>
      <p>You don't need new furniture to launch. Source quality used items from:</p>
      <ul>
        <li>Estate sales — often full sets at low prices</li>
        <li>Facebook Marketplace and Craigslist</li>
        <li>Habitat for Humanity ReStore</li>
        <li>IKEA for basics (bed frames, dressers, desks)</li>
        <li>Open-box deals at Big Lots and Walmart</li>
      </ul>
      <h2>Setting Room Pricing</h2>
      <p>Research comparable shared living rooms in your area on Craigslist and Facebook. Price your all-inclusive offering 10–20% above bare rooms because you're providing utilities, WiFi, laundry, and a managed community environment.</p>
      <h2>The All-Inclusive Package</h2>
      <p>Consider including in your monthly rate:</p>
      <ul>
        <li>All utilities (electric, water, gas)</li>
        <li>High-speed internet</li>
        <li>Laundry access</li>
        <li>Furnished room (bed, dresser, desk)</li>
        <li>Basic cleaning supplies for common areas</li>
      </ul>
      <div class="highlight-box">A well-furnished, all-inclusive room in a well-managed home commands significantly more than an empty room. Invest in the basics and price accordingly.</div>
    `
  },

  '4-3': {
    num: '4.3',
    title: 'Lease Strategies: Own vs. Master Lease',
    body: `
      <h2>You Don't Have to Own the Property</h2>
      <p>One of the most powerful — and underused — strategies in shared living is the master lease. It allows you to operate a profitable shared living home without purchasing property, using a mortgage, or having significant capital.</p>
      <h2>How the Master Lease Works</h2>
      <div class="strategy-block">
        <div class="s-label">Step 1</div>
        <h4>Find a Property Owner</h4>
        <p>Look for landlords who are tired of management, have a vacant property, or are struggling with inconsistent rental income. These are your best partners.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Step 2</div>
        <h4>Negotiate the Master Lease</h4>
        <p>You lease the entire property directly from the owner for a fixed monthly amount — typically at or slightly below standard market rent. The lease should give you the right to sublease individual rooms.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Step 3</div>
        <h4>Operate as Shared Living</h4>
        <p>You rent the rooms individually at shared living rates. Your revenue comes from the spread between what you pay the owner and what your tenants pay you.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Example</div>
        <h4>The Math</h4>
        <p>You master lease a 5-bedroom home for $2,000/month. You rent each room at $850/month all-inclusive. Gross revenue: $4,250. Net after lease: $2,250. After utilities ($500) and supplies ($200): $1,550/month — on a property you don't own.</p>
      </div>
      <h2>The Partnership Model</h2>
      <p>If a pure master lease isn't available, pitch a joint venture. You manage everything; the owner provides the property. Split net profits 50/50. The owner gets passive income without lifting a finger. You get a business with no acquisition cost.</p>
    `
  },

  '4-4': {
    num: '4.4',
    title: 'Operations, Systems, and Self-Management',
    body: `
      <h2>Build It to Run Without You</h2>
      <p>The goal is a shared living home that operates efficiently while you're working 12-hour shifts. That requires systems, not just effort.</p>
      <h2>Tenant Onboarding</h2>
      <ul>
        <li>Use a digital intake form (Google Forms works perfectly) to collect all required information before move-in</li>
        <li>Issue a licensee agreement — not a lease. This distinction gives you significantly more flexibility to remove problematic occupants.</li>
        <li>Collect first month's payment and security deposit before issuing keys</li>
        <li>Conduct a documented walkthrough with photos at move-in</li>
      </ul>
      <h2>Rent Collection</h2>
      <p>Never collect cash. Use Zelle, Venmo Business, or a property management platform. Automatic payment reminders eliminate the awkward conversation about late rent. Set your late fee ($5/day after the 5th) in the agreement from day one.</p>
      <h2>House Rules That Protect Everyone</h2>
      <ul>
        <li>No drugs, alcohol, or non-prescribed medication on premises</li>
        <li>Zero tolerance for violence — immediate termination</li>
        <li>30-day written notice required for voluntary departure</li>
        <li>Management reserves the right to inspect common areas at any time</li>
        <li>Urine sample may be requested for erratic behavior or suspected substance use</li>
      </ul>
      <h2>Property Security</h2>
      <ul>
        <li>Keyless entry systems on all exterior doors</li>
        <li>Security cameras in all common areas (disclose to tenants)</li>
        <li>Ring doorbell or similar at main entrance</li>
        <li>Lockbox for emergency key storage</li>
      </ul>
    `
  },

  '4-5': {
    num: '4.5',
    title: 'Scaling to a Portfolio of Shared Living Homes',
    body: `
      <h2>From One Home to Many</h2>
      <p>The shared living model is built to scale. Once you have your first property running profitably and systematically, the blueprint for the second is already written.</p>
      <h2>The Scaling Sequence</h2>
      <div class="strategy-block">
        <div class="s-label">Phase 1</div>
        <h4>Stabilize Property #1</h4>
        <p>Full occupancy. Consistent rent collection. Systems in place. You're spending less than 5 hours per week on management. This is your proof of concept.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Phase 2</div>
        <h4>Extract Learning and Capital</h4>
        <p>After 6–12 months, you have a documented system, a track record, and cash reserves from the property. Use those to fund or secure property #2.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Phase 3</div>
        <h4>Replicate With Refinements</h4>
        <p>Property #2 benefits from every mistake and improvement from property #1. Onboarding is faster. Pricing is sharper. Systems are already built. Time-to-profitability is shorter.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Phase 4</div>
        <h4>Hire a House Manager</h4>
        <p>At 3+ properties, bring on a part-time or full-time house manager. Their responsibilities: daily oversight, maintenance coordination, and tenant relationships. Your role becomes investor and operator, not manager.</p>
      </div>
      <h2>What Full Income Replacement Looks Like</h2>
      <p>Three shared living homes averaging $3,000/month net each = $9,000/month. That's $108,000/year — comparable to or exceeding many nursing salaries — from three properties you manage with systems, not shifts.</p>
      <div class="highlight-box">You don't need twenty properties. You need three well-run homes and the right systems. That's a real exit from bedside nursing — on your own timeline.</div>
    `
  },

  '5-1': {
    num: '5.1',
    title: 'What Private Money Lending Is — and Why Nurses Are Perfect for It',
    body: `
      <div class="highlight-box">
        "Private money lending is the most passive strategy in real estate. You provide the capital. Someone else does the work. The property secures your investment. You collect the interest."
      </div>
      <h2>The Simple Version</h2>
      <p>Private money lending means using your own capital — savings, accessible retirement funds, or equity — to fund another investor's real estate deal. You charge interest. They repay you. The property secures the loan. No bank, no broker, no license required.</p>
      <h2>Why Nurses Excel at This</h2>
      <ul>
        <li><strong>You understand risk assessment</strong> — Every shift, you evaluate risk and make decisions that protect your patients. As a lender, you evaluate deals and make decisions that protect your capital. Same skill, new application.</li>
        <li><strong>You follow protocols</strong> — Private lending has clear documentation requirements. Nurses are excellent at following and enforcing process.</li>
        <li><strong>You communicate clearly under pressure</strong> — When a deal gets complicated, your ability to have direct, calm conversations is a major advantage over lenders who avoid difficult discussions.</li>
        <li><strong>You have W2 income to build capital</strong> — Stable nursing income is the foundation that allows you to accumulate the capital to lend in the first place.</li>
      </ul>
      <h2>What Private Lending Is NOT</h2>
      <ul>
        <li>It is not a bank — you set your own terms</li>
        <li>It is not stock market investing — your return is contractually defined</li>
        <li>It is not property management — you never deal with tenants or maintenance</li>
        <li>It is not risky if done properly — the property is your collateral</li>
      </ul>
    `
  },

  '5-2': {
    num: '5.2',
    title: 'How to Structure a Private Money Loan',
    body: `
      <h2>You Set the Terms</h2>
      <p>As the lender, you have full authority over the loan structure. Interest rate, loan term, repayment method, and collateral requirements are all negotiated between you and the borrower. There is no fixed formula — but there are industry norms that protect you.</p>
      <h2>The Four Ways You Get Paid</h2>
      <div class="strategy-block">
        <div class="s-label">Structure 1 — Most Common</div>
        <h4>Interest-Only Monthly Payments</h4>
        <p>The borrower pays you monthly interest only. At the end of the loan term, they repay the full principal. Clean, predictable, passive income. A $50,000 loan at 12% = $500/month in your account.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Structure 2</div>
        <h4>Points at Closing</h4>
        <p>Borrower pays you a fee at closing — typically 1–3 points (1 point = 1% of loan). You're paid immediately in a lump sum, then continue receiving monthly interest. Front-loads your return.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Structure 3</div>
        <h4>Exit Fee</h4>
        <p>A predetermined amount paid when the loan is repaid. Often structured as a percentage of the total investment. Some lenders negotiate an increasing exit fee based on how long the loan runs.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Structure 4</div>
        <h4>Joint Venture Profit Share</h4>
        <p>Instead of interest, you receive a percentage of the final profit. Higher potential upside, but your return depends on the deal's success. Only use this structure with highly experienced borrowers on deals you understand deeply.</p>
      </div>
      <h2>Industry Standard Rates</h2>
      <p>Private money loans typically carry 8–15% annual interest, plus 1–3 points, for terms of 6–24 months. Shorter terms generally carry higher rates. The property's equity position is your safety net.</p>
    `
  },

  '5-3': {
    num: '5.3',
    title: 'Evaluating Borrowers and Deals',
    body: `
      <h2>Two Things You're Always Evaluating</h2>
      <p>Before you fund any loan, assess two things: the borrower and the deal. Both must pass. A great deal with an unreliable borrower is still a risk. A great borrower with a bad deal is still a bad deal.</p>
      <h2>Evaluating the Borrower</h2>
      <ul>
        <li><strong>Track record</strong> — How many deals have they completed? What were the results? Ask for references from previous lenders.</li>
        <li><strong>Experience with this property type</strong> — A borrower who has done 20 single-family flips is a different risk than one attempting their first multi-unit.</li>
        <li><strong>Skin in the game</strong> — Are they putting any of their own money in? A borrower with nothing to lose is a borrower with no motivation to perform.</li>
        <li><strong>Communication style</strong> — Do they respond promptly? Are they transparent about challenges? How they communicate before the loan reflects how they'll communicate during it.</li>
      </ul>
      <h2>Evaluating the Deal</h2>
      <ul>
        <li><strong>Loan-to-Value (LTV)</strong> — Your loan amount divided by the property's ARV. Target under 65–70% LTV. That means a $200,000 ARV property should secure no more than $130,000–$140,000 in total debt.</li>
        <li><strong>Property condition</strong> — What is the current condition? What is the rehab scope? Is the budget realistic?</li>
        <li><strong>Market demand</strong> — Are comparable properties selling or renting quickly? Slow markets create exit risk.</li>
        <li><strong>Exit strategy</strong> — Does the borrower have a clear, realistic plan to repay? Sale, refinance, or long-term rental?</li>
      </ul>
      <div class="highlight-box">A conservative LTV is your primary protection. If the deal goes wrong and you must foreclose, the equity in the property is what ensures you get your money back.</div>
    `
  },

  '5-4': {
    num: '5.4',
    title: 'The Legal Documents You Need',
    body: `
      <h2>Your Documents Are Your Protection</h2>
      <p>Private lending is only as safe as the documents behind it. Never fund a loan without proper legal documentation reviewed by a qualified real estate attorney. This is non-negotiable.</p>
      <h2>Document 1 — Promissory Note</h2>
      <p>The promissory note is the borrower's legally binding promise to repay your loan. It documents:</p>
      <ul>
        <li>The original loan amount</li>
        <li>The interest rate and calculation method</li>
        <li>The repayment schedule and due dates</li>
        <li>Late fees and default provisions</li>
        <li>What happens if the borrower fails to repay</li>
      </ul>
      <p>This is different from an IOU — it is a legally enforceable financial instrument. In real estate, it's often called a mortgage note.</p>
      <h2>Document 2 — Mortgage Agreement or Deed of Trust</h2>
      <p>This document secures your loan against the property. It creates a lien — meaning if the borrower defaults, you have a legal claim against the property itself.</p>
      <ul>
        <li><strong>Mortgage Agreement</strong> — Used in some states; involves two parties (borrower and lender)</li>
        <li><strong>Deed of Trust</strong> — Used in other states; involves three parties (borrower, lender, and a neutral trustee). Deed of Trust states typically allow faster non-judicial foreclosure — which benefits lenders.</li>
      </ul>
      <p>Check your state's requirements. Some states require one or the other. In states where both are acceptable, a Deed of Trust often provides better lender protection.</p>
      <h2>Your Real Estate Attorney</h2>
      <p>Find a real estate attorney in your state before you fund your first loan. Have them draft or review every document. Their fee is one of the best investments you'll make in your lending business.</p>
    `
  },

  '5-5': {
    num: '5.5',
    title: 'Finding Borrowers and Building Your Lending Business',
    body: `
      <h2>Where Quality Borrowers Come From</h2>
      <ul>
        <li><strong>Your local REIA</strong> — Real Estate Investor Associations are the fastest path to meeting active borrowers. Attend consistently and let it be known you have capital to deploy.</li>
        <li><strong>Referrals</strong> — Satisfied borrowers refer other borrowers. Your reputation as a reliable, professional lender is your most valuable marketing asset.</li>
        <li><strong>Real estate agents</strong> — Investor-focused agents often know which buyers are looking for private financing.</li>
        <li><strong>Mortgage brokers</strong> — They see loan applications that don't fit conventional criteria — exactly your target borrower.</li>
        <li><strong>Online platforms</strong> — Connected Investors, BiggerPockets, and similar platforms connect lenders with borrowers.</li>
      </ul>
      <h2>Building Your Reputation</h2>
      <ul>
        <li>Start with small loans — $25,000–$50,000 — while you build experience and confidence</li>
        <li>Close deals quickly and reliably. Speed is a major competitive advantage over institutional lenders.</li>
        <li>Communicate proactively throughout the loan. Don't wait for borrowers to call you.</li>
        <li>Never misrepresent your experience or capital. Let your actual track record grow organically.</li>
      </ul>
      <h2>Tips for Long-Term Success</h2>
      <div class="checklist-row"><span class="check-num">1</span><div><div class="check-title">Always use an attorney</div><div class="check-items">Every loan, every time. No exceptions.</div></div></div>
      <div class="checklist-row"><span class="check-num">2</span><div><div class="check-title">Stay educated</div><div class="check-items">Market conditions change. Keep learning even after your first loan is funded.</div></div></div>
      <div class="checklist-row"><span class="check-num">3</span><div><div class="check-title">Diversify</div><div class="check-items">Don't put all your lending capital into a single deal or a single borrower.</div></div></div>
      <div class="checklist-row"><span class="check-num">4</span><div><div class="check-title">Know your exit</div><div class="check-items">What happens if the borrower defaults? Have a plan before you fund.</div></div></div>
      <div class="checklist-row"><span class="check-num">5</span><div><div class="check-title">Be transparent</div><div class="check-items">Build a business you're proud of. Your integrity is your brand.</div></div></div>
    `
  },

  '6-1': {
    num: '6.1',
    title: 'Why Mid-Term Rentals Are the Goldilocks Strategy',
    body: `
      <div class="highlight-box">
        "Not too short. Not too long. Mid-term rentals hit the sweet spot — premium income, stable occupancy, and manageable operations. That's the Goldilocks method."
      </div>
      <h2>The Problem With the Extremes</h2>
      <div class="strategy-block">
        <div class="s-label">Too Short — Airbnb / Short-Term Rentals</div>
        <h4>High income. Full-time management job.</h4>
        <p>Short-term rentals can generate excellent revenue — but they require daily management: check-ins, check-outs, cleaning coordination, guest communications, pricing adjustments. For a working nurse, this is a second job, not passive income.</p>
      </div>
      <div class="strategy-block">
        <div class="s-label">Too Long — Traditional 12-Month Leases</div>
        <h4>Low management. Low income.</h4>
        <p>Long-term tenants provide stability, but the income ceiling is the local market rate. No premium for furnishing. No flexibility to adjust pricing. And one bad tenant locked in for a year.</p>
      </div>
      <h2>The Goldilocks Zone — 30 to 90 Days</h2>
      <p>Mid-term rentals to healthcare travelers, corporate relocators, and insurance-displaced families generate:</p>
      <ul>
        <li>20–40% more revenue than long-term rentals</li>
        <li>Significantly less management than short-term rentals</li>
        <li>Stable, predictable occupancy with quality tenants</li>
        <li>Premium rates justified by furnished, all-inclusive accommodations</li>
      </ul>
      <h2>The Travel Nurse Market</h2>
      <p>There are over 500,000 travel nurses in the United States. Every one of them needs housing for their 13-week assignments. They are reliable, income-verified, employed, and desperately underserved by the standard rental market. As a nurse, you are uniquely positioned to serve this market better than any outside investor.</p>
    `
  },

  '6-2': {
    num: '6.2',
    title: 'Setting Up Your MTR for Travel Nurses',
    body: `
      <h2>You Already Know What They Need</h2>
      <p>You've been a nurse. You've worked 12-hour shifts. You know what it feels like to come home exhausted and need a space that actually works. That empathy is your competitive advantage.</p>
      <h2>The Non-Negotiables for Travel Nurse MTRs</h2>
      <ul>
        <li><strong>Blackout curtains</strong> — Night shift nurses sleep during the day. This is not optional.</li>
        <li><strong>Quiet environment</strong> — Avoid properties near airports, highways, or venues with late-night noise</li>
        <li><strong>Safety</strong> — Well-lit exterior, secure entry, safe neighborhood. Nurses, especially women, prioritize this.</li>
        <li><strong>Quality bed and bedding</strong> — They're sleeping on hospital floors and on call rooms. A comfortable bed is a selling point.</li>
        <li><strong>Full kitchen</strong> — Meal prep saves money on 13-week assignments. Stock it with the basics.</li>
        <li><strong>High-speed WiFi</strong> — Non-negotiable. Many travel nurses work remotely between assignments or study for certifications.</li>
        <li><strong>Washer and dryer in unit</strong> — Scrubs require frequent washing. Shared laundry is a dealbreaker for many travelers.</li>
        <li><strong>Proximity to the hospital</strong> — Under 20 minutes is ideal. Under 10 is premium.</li>
      </ul>
      <h2>Furnishing Your MTR</h2>
      <p>Budget $3,000–$8,000 to furnish a standard 1–2 bedroom MTR. This is a one-time investment that pays for itself within 1–2 months of occupancy at premium rates. Prioritize bed quality, couch comfort, kitchen functionality, and fast WiFi above everything else.</p>
      <div class="highlight-box">You're not just renting a space. You're providing a home for a healthcare professional who is away from their family doing critical work. Price and deliver accordingly.</div>
    `
  },

  '6-3': {
    num: '6.3',
    title: 'Pricing, Platforms, and Finding Tenants',
    body: `
      <h2>Where Travel Nurses Look for Housing</h2>
      <ul>
        <li><strong>Furnished Finder</strong> — The dominant platform for travel nurse housing. List here first. Monthly subscription for landlords (~$99/year). Highly targeted audience.</li>
        <li><strong>Airbnb (monthly stays)</strong> — Filter settings allow 30-day minimum stays. Reaches a broader corporate/relocation audience in addition to healthcare travelers.</li>
        <li><strong>VRBO</strong> — Similar to Airbnb for monthly stays</li>
        <li><strong>Corporate housing agencies</strong> — Reach out to local corporate housing companies who place employees in temporary housing</li>
        <li><strong>Direct hospital outreach</strong> — Contact the housing coordinator at hospitals near your property. Many actively maintain lists of recommended housing for their travel staff.</li>
        <li><strong>Travel nurse Facebook groups</strong> — "Travel Nurse Housing [City]" groups exist for most major metros. Post directly.</li>
      </ul>
      <h2>Setting Your Rate</h2>
      <p>Search Furnished Finder for comparable listings within 5 miles of your property. Price based on:</p>
      <ul>
        <li>Bedroom and bathroom count</li>
        <li>Distance to nearest major hospital</li>
        <li>Amenities included (parking, laundry, WiFi, utilities)</li>
        <li>Quality of furnishings and photos</li>
      </ul>
      <p>A well-presented 2-bedroom near a medical center can command $2,500–$4,000/month — often $800–$1,500 above what the same unit would rent for on a long-term lease.</p>
      <h2>The Listing That Converts</h2>
      <p>Mention blackout curtains, in-unit laundry, hospital proximity, and your background as a nurse in your listing description. Travel nurses trust other healthcare professionals. That connection converts browsers into bookings.</p>
    `
  },

  '6-4': {
    num: '6.4',
    title: 'Managing MTRs Without It Becoming a Second Job',
    body: `
      <h2>The Goal: A Business That Runs Between Guests</h2>
      <p>The MTR model should complement your nursing schedule — not compete with it. The right systems make this possible even while working 3×12 shifts per week.</p>
      <h2>Automate Access</h2>
      <ul>
        <li><strong>Smart lock / keyless entry</strong> — Generate unique codes for each guest. No key handoffs, no coordination required. Change codes automatically between stays.</li>
        <li><strong>Digital welcome guide</strong> — Create a Notion page or PDF with WiFi passwords, appliance instructions, parking, hospital directions, and local recommendations. Send it before check-in.</li>
      </ul>
      <h2>Cleaning Between Stays</h2>
      <ul>
        <li>Build a relationship with one reliable cleaning service before your first booking</li>
        <li>Set a standard checklist and pay a fair rate — good cleaners make your 5-star reviews</li>
        <li>Schedule cleaning as part of your checkout process, not as a reactive task</li>
      </ul>
      <h2>Guest Communication</h2>
      <ul>
        <li>Use a single communication channel — text or the booking platform's messenger</li>
        <li>Respond within 2 hours during waking hours. Travel nurses move fast and book what responds first.</li>
        <li>Set clear house rules and communicate them before booking confirmation</li>
        <li>A brief check-in message 48 hours before arrival and one on check-in day handles 90% of guest needs proactively</li>
      </ul>
      <h2>Handling Issues</h2>
      <p>Build a short list of go-to vendors: a handyman, an HVAC tech, a plumber. When something breaks during a stay, your goal is resolution within 24 hours. Travel nurses are forgiving of problems — they're not forgiving of slow responses.</p>
      <div class="highlight-box">Well-managed MTRs run on about 3–5 hours per week. The investment in systems upfront saves you that time every month for years.</div>
    `
  }

};

function openLesson(id) {
  const lesson = LESSONS[id];
  if (!lesson) return;

  currentLessonId = id;

  document.getElementById('lesson-num-badge').textContent = lesson.num;
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('lesson-body').innerHTML = lesson.body;

  // Check if already complete
  const completed = LS.get('noc_completed_lessons', []);
  const btn = document.getElementById('lesson-complete-btn');
  const note = document.getElementById('lesson-complete-note');

  if (completed.includes(id)) {
    btn.textContent = '✓ Completed';
    btn.style.background = 'var(--gray-light)';
    btn.style.color = 'var(--gray-mid)';
    btn.onclick = closeLesson;
    note.textContent = 'You have already completed this lesson.';
  } else {
    btn.textContent = '✓ Mark Complete & Return';
    btn.style.background = '';
    btn.style.color = '';
    btn.onclick = markLessonComplete;
    note.textContent = '';
  }

  navigateTo('lesson');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeLesson() {
  navigateTo('learn');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function markLessonComplete() {
  if (!currentLessonId) return;

  const completed = LS.get('noc_completed_lessons', []);
  if (!completed.includes(currentLessonId)) {
    completed.push(currentLessonId);
    LS.set('noc_completed_lessons', completed);
  }

  // Update lesson item in DOM
  const lessonId = currentLessonId;
  document.querySelectorAll('.lesson-item').forEach(item => {
    const onclick = item.getAttribute('onclick') || '';
    if (onclick.includes(`'${lessonId}'`)) {
      item.classList.add('completed');
    }
  });

  closeLesson();
}

// On load: restore completed lesson states in UI
function restoreCompletedLessons() {
  const completed = LS.get('noc_completed_lessons', []);
  completed.forEach(id => {
    document.querySelectorAll('.lesson-item').forEach(item => {
      const onclick = item.getAttribute('onclick') || '';
      if (onclick.includes(`'${id}'`)) {
        item.classList.add('completed');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', restoreCompletedLessons);

/* ----------------------------------------------------------
   DEAL WORKSPACE
   ---------------------------------------------------------- */

let activeDealId = null;

// Due diligence checklists per strategy
const DD_CHECKLISTS = {
  default: [
    { group: 'Property Research', items: [
      { id: 'prop-address', label: 'Property address confirmed', sub: 'Verify legal address matches listing' },
      { id: 'prop-photos', label: 'Photos reviewed', sub: 'Interior, exterior, neighborhood' },
      { id: 'prop-walkthrough', label: 'In-person visit completed' },
      { id: 'prop-condition', label: 'Property condition assessed', sub: 'Note any visible repairs needed' },
    ]},
    { group: 'Title & Legal', items: [
      { id: 'title-search', label: 'Title search completed', sub: 'No undisclosed liens or claims' },
      { id: 'title-insurance', label: 'Title insurance quoted' },
      { id: 'legal-zoning', label: 'Zoning confirmed for intended use' },
      { id: 'legal-permits', label: 'Open permits or violations checked' },
    ]},
    { group: 'Financials', items: [
      { id: 'fin-comps', label: 'Comparable sales pulled', sub: 'At least 3 comps within 0.5 miles, last 6 months' },
      { id: 'fin-rent-comps', label: 'Rental comps researched' },
      { id: 'fin-taxes', label: 'Annual property taxes confirmed' },
      { id: 'fin-insurance', label: 'Insurance quote obtained' },
      { id: 'fin-numbers', label: 'Deal numbers run in calculator' },
    ]},
    { group: 'Financing', items: [
      { id: 'loan-preapproved', label: 'Pre-approval or funding confirmed' },
      { id: 'loan-terms', label: 'Loan terms reviewed and acceptable' },
      { id: 'loan-closing-costs', label: 'Closing costs estimated' },
    ]},
    { group: 'Next Steps', items: [
      { id: 'next-offer', label: 'Offer strategy determined' },
      { id: 'next-attorney', label: 'Real estate attorney identified' },
      { id: 'next-inspector', label: 'Inspector lined up' },
    ]}
  ],
  'Tax Lien': [
    { group: 'Property Information', items: [
      { id: 'tl-address', label: 'Property address & legal description confirmed' },
      { id: 'tl-type', label: 'Property type verified (residential preferred)' },
      { id: 'tl-photos', label: 'Exterior photos reviewed or drive-by completed' },
      { id: 'tl-condition', label: 'Condition assessed from exterior' },
    ]},
    { group: 'Tax & Lien Research', items: [
      { id: 'tl-amount', label: 'Total tax amount owed confirmed', sub: 'Including all penalties and fees' },
      { id: 'tl-history', label: 'Full tax history reviewed' },
      { id: 'tl-other-liens', label: 'Additional liens checked', sub: 'IRS, HOA, mechanics liens' },
      { id: 'tl-redemption', label: 'Redemption period and rate confirmed' },
      { id: 'tl-state-rules', label: 'State-specific auction rules reviewed' },
    ]},
    { group: 'Market Research', items: [
      { id: 'tl-comps', label: 'Comparable property values researched' },
      { id: 'tl-neighborhood', label: 'Neighborhood trends assessed' },
      { id: 'tl-equity', label: 'Equity position calculated', sub: 'Lien amount vs property value' },
    ]},
    { group: 'Auction Prep', items: [
      { id: 'tl-registered', label: 'Registered for auction' },
      { id: 'tl-maxbid', label: 'Maximum bid set and committed to' },
      { id: 'tl-funds', label: 'Funds accessible within 24–48 hours of winning' },
      { id: 'tl-cashiers', label: 'Cashier\'s check or wire ready if required' },
    ]},
    { group: 'Exit Strategy', items: [
      { id: 'tl-exit', label: 'Exit strategy defined', sub: 'Collect interest, foreclose, or sell lien' },
      { id: 'tl-attorney', label: 'Real estate attorney identified for potential foreclosure' },
    ]}
  ],
  'Tax Deed': [
    { group: 'Property Research', items: [
      { id: 'td-address', label: 'Property address & legal description confirmed' },
      { id: 'td-driveby', label: 'Drive-by or exterior inspection completed' },
      { id: 'td-condition', label: 'Condition estimated from exterior', sub: 'Budget conservatively for repairs' },
      { id: 'td-occupied', label: 'Occupancy status confirmed' },
    ]},
    { group: 'Title & Legal', items: [
      { id: 'td-title', label: 'Title search completed', sub: 'Check for surviving liens after tax sale' },
      { id: 'td-irs', label: 'IRS liens researched', sub: 'IRS has 120-day right of redemption' },
      { id: 'td-hoa', label: 'HOA liens checked' },
      { id: 'td-title-insurance', label: 'Title insurance plan confirmed post-purchase' },
    ]},
    { group: 'Financial Analysis', items: [
      { id: 'td-arv', label: 'ARV calculated conservatively', sub: 'Minimum 3 comps, last 6 months' },
      { id: 'td-rehab', label: 'Rehab estimate completed', sub: 'Add 20% contingency buffer' },
      { id: 'td-maxbid', label: 'Maximum bid calculated from numbers', sub: 'Not from emotion' },
      { id: 'td-allcosts', label: 'All costs factored in', sub: 'Taxes owed, closing, rehab, holding costs' },
    ]},
    { group: 'Auction Prep', items: [
      { id: 'td-registered', label: 'Registered for auction' },
      { id: 'td-rules', label: 'Bidding rules and payment terms reviewed' },
      { id: 'td-funds', label: 'Funds secured and accessible' },
      { id: 'td-committed', label: 'Committed to maximum bid — will not exceed it' },
    ]},
    { group: 'Exit Strategy', items: [
      { id: 'td-exit', label: 'Exit strategy defined before bidding', sub: 'Flip, rent, or wholesale' },
      { id: 'td-contractor', label: 'Contractor or GC identified' },
      { id: 'td-timeline', label: 'Realistic project timeline set' },
    ]}
  ],
  'Private Money Lending': [
    { group: 'Borrower Evaluation', items: [
      { id: 'pml-track', label: 'Borrower track record verified', sub: 'Completed deals, references checked' },
      { id: 'pml-experience', label: 'Experience with this property type confirmed' },
      { id: 'pml-skin', label: 'Borrower contributing own capital', sub: 'Skin in the game' },
      { id: 'pml-communication', label: 'Communication style assessed', sub: 'Responsive, transparent, professional' },
    ]},
    { group: 'Deal Analysis', items: [
      { id: 'pml-arv', label: 'ARV independently verified', sub: 'Pull your own comps — not the borrower\'s' },
      { id: 'pml-ltv', label: 'LTV calculated and acceptable', sub: 'Target under 65–70% LTV' },
      { id: 'pml-rehab', label: 'Rehab scope and budget reviewed' },
      { id: 'pml-market', label: 'Market demand assessed for exit strategy' },
      { id: 'pml-exit', label: 'Borrower exit strategy is clear and realistic' },
    ]},
    { group: 'Legal Documents', items: [
      { id: 'pml-attorney', label: 'Real estate attorney hired' },
      { id: 'pml-note', label: 'Promissory note drafted and reviewed' },
      { id: 'pml-mortgage', label: 'Mortgage or Deed of Trust executed', sub: 'Recorded with county' },
      { id: 'pml-title', label: 'Title search completed — lien position confirmed' },
      { id: 'pml-insurance', label: 'Property insurance confirmed with lender listed' },
    ]},
    { group: 'Funding', items: [
      { id: 'pml-terms', label: 'Loan terms agreed and documented', sub: 'Rate, term, payment structure' },
      { id: 'pml-funded', label: 'Funds wired or disbursed' },
      { id: 'pml-schedule', label: 'Payment schedule set up' },
    ]}
  ],
  'Shared Living': [
    { group: 'Property Assessment', items: [
      { id: 'sl-visited', label: 'Property visited in person' },
      { id: 'sl-bedrooms', label: 'Bedroom count and layout confirmed' },
      { id: 'sl-common', label: 'Common areas adequate (kitchen, laundry, living)' },
      { id: 'sl-accessible', label: 'Accessible layout confirmed (ranch-style preferred)' },
      { id: 'sl-neighborhood', label: 'Neighborhood safety assessed — visited at different times' },
    ]},
    { group: 'Legal & Zoning', items: [
      { id: 'sl-zoning', label: 'Zoning confirmed for shared living use' },
      { id: 'sl-federal', label: 'Federal fair housing protections reviewed', sub: 'FHAA, ADA, Rehab Act' },
      { id: 'sl-agreement', label: 'Licensee agreement template obtained', sub: 'NOT a standard lease' },
    ]},
    { group: 'Business Setup', items: [
      { id: 'sl-llc', label: 'LLC registered' },
      { id: 'sl-bank', label: 'Business bank account opened' },
      { id: 'sl-insurance', label: 'Landlord and liability insurance quoted' },
      { id: 'sl-policies', label: 'Policies & procedures manual drafted' },
    ]},
    { group: 'Financial Analysis', items: [
      { id: 'sl-roomrates', label: 'Room pricing researched — comparable homes in area' },
      { id: 'sl-revenue', label: 'Projected monthly revenue calculated' },
      { id: 'sl-expenses', label: 'All expenses estimated', sub: 'Lease/mortgage, utilities, supplies, WiFi' },
      { id: 'sl-cashflow', label: 'Net cash flow acceptable' },
    ]},
    { group: 'Operations', items: [
      { id: 'sl-furnishing', label: 'Furnishing plan and budget set' },
      { id: 'sl-keyless', label: 'Keyless entry system ordered' },
      { id: 'sl-cameras', label: 'Security cameras for common areas planned' },
      { id: 'sl-marketing', label: 'Marketing plan ready', sub: 'Craigslist, Facebook, referrals' },
    ]}
  ],
  'Mid-Term Rental': [
    { group: 'Property Setup', items: [
      { id: 'mtr-location', label: 'Distance to nearest hospital/medical center confirmed' },
      { id: 'mtr-quiet', label: 'Quiet environment confirmed — no major noise sources' },
      { id: 'mtr-safety', label: 'Neighborhood safety assessed' },
      { id: 'mtr-laundry', label: 'In-unit washer/dryer confirmed or planned' },
      { id: 'mtr-parking', label: 'Dedicated parking available' },
    ]},
    { group: 'Furnishing Checklist', items: [
      { id: 'mtr-bed', label: 'Quality mattress and bedding (blackout curtains essential)' },
      { id: 'mtr-kitchen', label: 'Fully stocked kitchen with cookware and basics' },
      { id: 'mtr-wifi', label: 'High-speed WiFi installed and tested' },
      { id: 'mtr-workspace', label: 'Desk or workspace area set up' },
      { id: 'mtr-furniture', label: 'Living room furniture — comfortable couch' },
    ]},
    { group: 'Financial Analysis', items: [
      { id: 'mtr-comps', label: 'Furnished Finder comps researched', sub: 'Comparable MTRs within 5 miles' },
      { id: 'mtr-rate', label: 'Monthly rate set', sub: '20–40% above unfurnished market rate' },
      { id: 'mtr-expenses', label: 'All expenses calculated', sub: 'Mortgage, utilities, WiFi, supplies, cleaning' },
      { id: 'mtr-cashflow', label: 'Net cash flow confirmed positive' },
      { id: 'mtr-furnishing-budget', label: 'Furnishing budget set and within plan' },
    ]},
    { group: 'Marketing & Listing', items: [
      { id: 'mtr-photos', label: 'Professional-quality photos taken' },
      { id: 'mtr-ff-listed', label: 'Listed on Furnished Finder' },
      { id: 'mtr-airbnb', label: 'Monthly stay listing on Airbnb created' },
      { id: 'mtr-hospital', label: 'Hospital housing coordinator contacted' },
      { id: 'mtr-fbgroup', label: 'Posted in local travel nurse Facebook groups' },
    ]},
    { group: 'Operations', items: [
      { id: 'mtr-lock', label: 'Smart lock installed' },
      { id: 'mtr-guide', label: 'Digital welcome guide created' },
      { id: 'mtr-cleaner', label: 'Cleaning service relationship established' },
      { id: 'mtr-maintenance', label: 'Go-to handyman identified' },
    ]}
  ],
  'House Hacking': [
    { group: 'Property Assessment', items: [
      { id: 'hh-units', label: 'Unit count and layout confirmed', sub: '2–4 units or rooms to rent' },
      { id: 'hh-visited', label: 'In-person visit completed' },
      { id: 'hh-condition', label: 'Condition of all units assessed' },
      { id: 'hh-neighborhood', label: 'Neighborhood rental demand confirmed' },
    ]},
    { group: 'Financing', items: [
      { id: 'hh-fha', label: 'FHA pre-approval obtained (3.5% down)' },
      { id: 'hh-occupancy', label: 'Owner-occupancy requirement understood', sub: 'Must live there at least 1 year with FHA' },
      { id: 'hh-closing-costs', label: 'Closing costs estimated and funded' },
      { id: 'hh-reserves', label: '3–6 months reserves confirmed' },
    ]},
    { group: 'Financial Analysis', items: [
      { id: 'hh-rent-comps', label: 'Rental comps for each unit researched' },
      { id: 'hh-mortgage', label: 'PITI calculated (Principal, Interest, Taxes, Insurance)' },
      { id: 'hh-cashflow', label: 'Net cash flow or housing cost reduction confirmed' },
      { id: 'hh-calculator', label: 'Deal run through House Hacking calculator' },
    ]},
    { group: 'Legal & Title', items: [
      { id: 'hh-title', label: 'Title search completed' },
      { id: 'hh-inspection', label: 'Professional inspection scheduled' },
      { id: 'hh-lease', label: 'Lease template obtained for tenant units' },
      { id: 'hh-attorney', label: 'Real estate attorney identified' },
    ]}
  ]
};

// Calculator templates per strategy
function getDWCalculator(deal) {
  const s = deal.strategy;
  if (s === 'Tax Lien') return dwCalcTaxLien(deal);
  if (s === 'Tax Deed' || s === 'House Hacking' || s === 'Buy and Hold') return dwCalcCashFlow(deal);
  if (s === 'Shared Living') return dwCalcSharedLiving(deal);
  if (s === 'Mid-Term Rental') return dwCalcMTR(deal);
  if (s === 'Private Money Lending') return dwCalcPrivateMoney(deal);
  return dwCalcCashFlow(deal);
}

function dwField(id, label, placeholder, prefix='') {
  const val = getActiveDealDetail(id) || '';
  return `
    <div class="form-group" style="margin-bottom:0.75rem">
      <label class="form-label">${label}</label>
      <div style="position:relative">
        ${prefix ? `<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--gray-mid);font-size:0.85rem">${prefix}</span>` : ''}
        <input type="number" class="form-input" id="dw-${id}"
          style="${prefix ? 'padding-left:1.5rem' : ''}"
          placeholder="${placeholder}"
          value="${val}"
          oninput="saveDealDetail('${id}', this.value); dwRecalc()"
        />
      </div>
    </div>`;
}

function dwCalcCashFlow(deal) {
  return `
    <div class="dw-calc-wrap">
      <div class="dw-calc-title">Cash Flow Analysis</div>
      <div class="dw-calc-note">Numbers save automatically as you type.</div>
      ${dwField('purchase', 'Purchase Price', '185000', '$')}
      ${dwField('arv', 'After Repair Value (ARV)', '220000', '$')}
      ${dwField('monthly-rent', 'Monthly Rent', '1800', '$')}
      ${dwField('monthly-mortgage', 'Est. Monthly Mortgage', '1100', '$')}
      ${dwField('taxes-insurance', 'Taxes + Insurance / mo', '250', '$')}
      ${dwField('vacancy', 'Vacancy Rate %', '5')}
      ${dwField('repairs', 'Repairs / mo', '100', '$')}
      ${dwField('management', 'Property Mgmt / mo', '0', '$')}
      ${dwField('down-payment', 'Down Payment', '10000', '$')}
      <div class="dw-results-grid" id="dw-results-area"></div>
      <div id="dw-verdict-area"></div>
    </div>`;
}

function dwCalcTaxLien(deal) {
  return `
    <div class="dw-calc-wrap">
      <div class="dw-calc-title">Tax Lien Analysis</div>
      <div class="dw-calc-note">Numbers save automatically as you type.</div>
      ${dwField('lien-amount', 'Lien Amount (your purchase price)', '8500', '$')}
      ${dwField('arv', 'Property Value / ARV', '95000', '$')}
      ${dwField('interest-rate', 'State Interest Rate %', '18')}
      ${dwField('redemption-months', 'Redemption Period (months)', '24')}
      <div class="dw-results-grid" id="dw-results-area"></div>
      <div id="dw-verdict-area"></div>
    </div>`;
}

function dwCalcSharedLiving(deal) {
  return `
    <div class="dw-calc-wrap">
      <div class="dw-calc-title">Shared Living Analysis</div>
      <div class="dw-calc-note">Numbers save automatically as you type.</div>
      ${dwField('rooms', 'Number of Rooms', '5')}
      ${dwField('room-rate', 'Monthly Rate per Room', '850', '$')}
      ${dwField('occupancy', 'Expected Occupancy %', '85')}
      ${dwField('lease-cost', 'Mortgage or Lease / mo', '2000', '$')}
      ${dwField('utilities', 'Utilities / mo', '400', '$')}
      ${dwField('supplies', 'Supplies + Misc / mo', '150', '$')}
      ${dwField('down-payment', 'Initial Cash Invested', '5000', '$')}
      <div class="dw-results-grid" id="dw-results-area"></div>
      <div id="dw-verdict-area"></div>
    </div>`;
}

function dwCalcMTR(deal) {
  return `
    <div class="dw-calc-wrap">
      <div class="dw-calc-title">Mid-Term Rental Analysis</div>
      <div class="dw-calc-note">Numbers save automatically as you type.</div>
      ${dwField('monthly-rate', 'Monthly Rental Rate', '3200', '$')}
      ${dwField('mortgage-lease', 'Mortgage or Lease / mo', '1600', '$')}
      ${dwField('furnishing', 'Furnishing Cost (one-time)', '5000', '$')}
      ${dwField('utilities', 'Utilities / mo', '200', '$')}
      ${dwField('supplies', 'Supplies + Cleaning / mo', '200', '$')}
      ${dwField('occupancy', 'Expected Occupancy %', '80')}
      <div class="dw-results-grid" id="dw-results-area"></div>
      <div id="dw-verdict-area"></div>
    </div>`;
}

function dwCalcPrivateMoney(deal) {
  return `
    <div class="dw-calc-wrap">
      <div class="dw-calc-title">Private Lending Analysis</div>
      <div class="dw-calc-note">Numbers save automatically as you type.</div>
      ${dwField('loan-amount', 'Loan Amount', '50000', '$')}
      ${dwField('arv', 'Property ARV', '200000', '$')}
      ${dwField('rate', 'Annual Interest Rate %', '12')}
      ${dwField('term', 'Loan Term (months)', '6')}
      ${dwField('points', 'Points Charged (optional)', '2')}
      <div class="dw-results-grid" id="dw-results-area"></div>
      <div id="dw-verdict-area"></div>
    </div>`;
}

function dwRecalc() {
  if (!activeDealId) return;
  const deal = state.deals.find(d => d.id === activeDealId);
  if (!deal) return;
  const s = deal.strategy;
  const res = document.getElementById('dw-results-area');
  const verd = document.getElementById('dw-verdict-area');
  if (!res) return;

  const g = id => parseFloat(document.getElementById(`dw-${id}`)?.value) || 0;
  const ri = (label, val, full) => `<div class="dw-result-item${full?' full':''}"><div class="dw-result-label">${label}</div><div class="dw-result-value">${val}</div></div>`;
  const verdict = (cls, txt) => `<div class="dw-verdict ${cls}">${txt}</div>`;

  if (s === 'Tax Lien') {
    const lien = g('lien-amount'), arv = g('arv'), rate = g('interest-rate'), months = g('redemption-months');
    const annual = lien * (rate/100);
    const total  = lien * (rate/100) * (months/12);
    const ltv    = arv > 0 ? (lien/arv*100) : 0;
    res.innerHTML = ri('Annual Interest', fmt(annual)) + ri('Total If Redeemed', fmt(total)) + ri('Effective Rate', rate.toFixed(1)+'%') + ri('Lien-to-Value', ltv.toFixed(1)+'%', true);
    verd.innerHTML = ltv < 25 ? verdict('good','✓ Strong Protection — Substantial equity cushion') : ltv < 50 ? verdict('ok','⚠ Moderate — Adequate equity, proceed with diligence') : verdict('bad','✗ High Risk — Limited equity protection');
  } else if (s === 'Private Money Lending') {
    const loan = g('loan-amount'), arv = g('arv'), rate = g('rate'), term = g('term'), points = g('points');
    const monthly = loan * (rate/100/12);
    const totalInt = monthly * term;
    const ptsFee = loan * (points/100);
    const ltv = arv > 0 ? (loan/arv*100) : 0;
    res.innerHTML = ri('Monthly Interest', fmt(monthly)) + ri('Total Interest', fmt(totalInt)) + ri('Points Income', fmt(ptsFee)) + ri('LTV Ratio', ltv.toFixed(1)+'%');
    verd.innerHTML = ltv <= 65 ? verdict('good','✓ Strong — LTV under 65%. Excellent protection') : ltv <= 75 ? verdict('ok','⚠ Acceptable — Monitor closely and document everything') : verdict('bad','✗ High Risk — LTV above 75%. Revisit deal terms');
  } else if (s === 'Shared Living') {
    const rooms = g('rooms'), rate2 = g('room-rate'), occ = g('occupancy'), lease = g('lease-cost'), utils = g('utilities'), supplies = g('supplies'), invested = g('down-payment');
    const gross = rooms * rate2 * (occ/100);
    const expenses = lease + utils + supplies;
    const net = gross - expenses;
    const annual = net * 12;
    const coc = invested > 0 ? (annual/invested*100) : 0;
    res.innerHTML = ri('Gross Revenue', fmt(gross)) + ri('Total Expenses', fmt(expenses)) + ri('Net / Month', fmt(net)) + ri('Annual Net', fmt(annual)) + ri('Cash-on-Cash', coc.toFixed(1)+'%', true);
    verd.innerHTML = net >= 1500 ? verdict('good','✓ Excellent — Strong cash flow for shared living') : net >= 500 ? verdict('ok','⚠ Solid — Positive but tighten expenses if possible') : net > 0 ? verdict('ok','⚠ Marginal — Works but leaves little room for vacancy') : verdict('bad','✗ Negative Cash Flow — Renegotiate lease or reprice rooms');
  } else if (s === 'Mid-Term Rental') {
    const rate3 = g('monthly-rate'), mortgage = g('mortgage-lease'), furnishing = g('furnishing'), utils2 = g('utilities'), supplies2 = g('supplies'), occ2 = g('occupancy');
    const effectiveRev = rate3 * (occ2/100);
    const monthlyExpenses = mortgage + utils2 + supplies2;
    const net2 = effectiveRev - monthlyExpenses;
    const monthsToRecoup = net2 > 0 ? Math.ceil(furnishing/net2) : 0;
    res.innerHTML = ri('Effective Revenue', fmt(effectiveRev)) + ri('Monthly Expenses', fmt(monthlyExpenses)) + ri('Net / Month', fmt(net2)) + ri('Annual Net', fmt(net2*12)) + ri('Furnishing Recouped In', monthsToRecoup > 0 ? monthsToRecoup+' months' : '—', true);
    verd.innerHTML = net2 >= 1000 ? verdict('good','✓ Excellent MTR — Strong Goldilocks returns') : net2 >= 400 ? verdict('ok','⚠ Solid — Consider raising rate or cutting expenses') : net2 > 0 ? verdict('ok','⚠ Marginal — Worth running but close to break-even') : verdict('bad','✗ Negative — Reprice or reconsider this property');
  } else {
    // Cash flow (House Hacking, Buy and Hold, Tax Deed, Other)
    const purchase = g('purchase'), arv2 = g('arv'), rent = g('monthly-rent'), mortgage2 = g('monthly-mortgage'), taxins = g('taxes-insurance'), vacancy2 = g('vacancy'), repairs2 = g('repairs'), mgmt = g('management'), down = g('down-payment');
    const vacancyCost = rent * (vacancy2/100);
    const effectiveRent = rent - vacancyCost;
    const totalExp = mortgage2 + taxins + repairs2 + mgmt;
    const netCF = effectiveRent - totalExp;
    const annualCF = netCF * 12;
    const coc2 = down > 0 ? (annualCF/down*100) : 0;
    const grm = rent > 0 ? (purchase/(rent*12)).toFixed(1) : '—';
    res.innerHTML = ri('Net Cash Flow / mo', fmt(netCF)) + ri('Annual Cash Flow', fmt(annualCF)) + ri('Cash-on-Cash', coc2.toFixed(1)+'%') + ri('Gross Rent Multiplier', grm);
    verd.innerHTML = netCF >= 300 ? verdict('good','✓ Strong Deal — Meets cash flow target') : netCF >= 0 ? verdict('ok','⚠ Break-Even — Acceptable for appreciation play') : verdict('bad','✗ Negative Cash Flow — Renegotiate price or terms');
  }
}

// Deal detail field persistence
function getActiveDealDetail(fieldId) {
  if (!activeDealId) return '';
  const details = LS.get(`noc_deal_details_${activeDealId}`, {});
  return details[fieldId] || '';
}
function saveDealDetail(fieldId, value) {
  if (!activeDealId) return;
  const details = LS.get(`noc_deal_details_${activeDealId}`, {});
  details[fieldId] = value;
  LS.set(`noc_deal_details_${activeDealId}`, details);
}
function saveDealField(field, value) {
  if (!activeDealId) return;
  const deal = state.deals.find(d => d.id === activeDealId);
  if (!deal) return;
  deal[field] = value;
  LS.set('noc_deals', state.deals);
  renderDeals();
}

// Due diligence
function getDDChecklist(strategy) {
  return DD_CHECKLISTS[strategy] || DD_CHECKLISTS['default'];
}
function renderDDChecklist(deal) {
  const container = document.getElementById('dw-diligence-list');
  if (!container) return;
  const checklist = getDDChecklist(deal.strategy);
  const checked = LS.get(`noc_deal_dd_${activeDealId}`, []);
  const totalItems = checklist.reduce((sum, g) => sum + g.items.length, 0);
  const doneCount = checked.length;
  const pct = totalItems > 0 ? Math.round(doneCount/totalItems*100) : 0;

  let html = `<div class="dw-dd-progress">
    <span class="dw-dd-progress-label">${doneCount} / ${totalItems}</span>
    <div class="dw-dd-progress-bar-wrap"><div class="dw-dd-progress-bar" style="width:${pct}%"></div></div>
    <span class="dw-dd-progress-label">${pct}%</span>
  </div>`;

  checklist.forEach(group => {
    html += `<div class="dw-dd-group"><div class="dw-dd-group-title">${group.group}</div>`;
    group.items.forEach(item => {
      const done = checked.includes(item.id);
      html += `<div class="dw-dd-item${done?' checked':''}" onclick="toggleDD('${item.id}')">
        <div class="dw-dd-check"></div>
        <div>
          <div class="dw-dd-label">${item.label}</div>
          ${item.sub ? `<div class="dw-dd-sub">${item.sub}</div>` : ''}
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  container.innerHTML = html;
}
function toggleDD(itemId) {
  if (!activeDealId) return;
  const checked = LS.get(`noc_deal_dd_${activeDealId}`, []);
  const idx = checked.indexOf(itemId);
  if (idx >= 0) checked.splice(idx, 1); else checked.push(itemId);
  LS.set(`noc_deal_dd_${activeDealId}`, checked);
  const deal = state.deals.find(d => d.id === activeDealId);
  renderDDChecklist(deal);
}

// Timeline
function renderTimeline() {
  const container = document.getElementById('dw-timeline-list');
  if (!container) return;
  const entries = LS.get(`noc_deal_timeline_${activeDealId}`, []);
  if (entries.length === 0) {
    container.innerHTML = '<p class="dw-timeline-empty">No entries yet. Status changes are logged automatically.</p>';
    return;
  }
  container.innerHTML = entries.map(e => `
    <div class="dw-timeline-item">
      <div class="dw-timeline-dot${e.system?' system':''}"></div>
      <div class="dw-timeline-content">
        <div class="dw-timeline-text">${escHtml(e.text)}</div>
        <div class="dw-timeline-date">${e.date}</div>
      </div>
    </div>`).reverse().join('');
}
function addTimelineEntry(text, system=false) {
  if (!activeDealId) return;
  const input = document.getElementById('dw-timeline-input');
  const entryText = text || (input ? input.value.trim() : '');
  if (!entryText) return;
  const entries = LS.get(`noc_deal_timeline_${activeDealId}`, []);
  entries.push({ text: entryText, date: new Date().toLocaleString('en-US', {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}), system });
  LS.set(`noc_deal_timeline_${activeDealId}`, entries);
  if (input && !text) input.value = '';
  renderTimeline();
}
function logStatusChange(newStatus) {
  addTimelineEntry(`Status changed to: ${newStatus}`, true);
}

// Open/close workspace
function openDealWorkspace(id) {
  const deal = state.deals.find(d => d.id === id);
  if (!deal) return;
  activeDealId = id;

  document.getElementById('dw-deal-title').textContent = deal.name;
  document.getElementById('dw-strategy-badge').textContent = deal.strategy || 'Deal';
  document.getElementById('dw-added-date').textContent = 'Added ' + deal.createdAt;

  const statusSel = document.getElementById('dw-status-select');
  if (statusSel) statusSel.value = deal.status || 'Researching';

  // Load calculator
  document.getElementById('dw-calculator-area').innerHTML = getDWCalculator(deal);
  dwRecalc();

  // Load DD
  renderDDChecklist(deal);

  // Load notes
  const notesArea = document.getElementById('dw-notes-area');
  if (notesArea) {
    notesArea.value = deal.notes || '';
    notesArea.oninput = () => { deal.notes = notesArea.value; LS.set('noc_deals', state.deals); };
  }

  // Load timeline
  renderTimeline();

  // Reset to financials tab
  switchDWTab('financials', document.querySelector('.dw-tab'));

  navigateTo('deal-workspace');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDealWorkspace() {
  activeDealId = null;
  navigateTo('deals');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchDWTab(tab, btn) {
  ['financials','diligence','notes','timeline'].forEach(t => {
    const el = document.getElementById(`dw-tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.dw-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function confirmDeleteDeal() {
  if (!activeDealId) return;
  const deal = state.deals.find(d => d.id === activeDealId);
  if (!deal) return;
  if (confirm(`Delete "${deal.name}"? This cannot be undone.`)) {
    // Clean up associated data
    localStorage.removeItem(`noc_deal_details_${activeDealId}`);
    localStorage.removeItem(`noc_deal_dd_${activeDealId}`);
    localStorage.removeItem(`noc_deal_timeline_${activeDealId}`);
    state.deals = state.deals.filter(d => d.id !== activeDealId);
    LS.set('noc_deals', state.deals);
    closeDealWorkspace();
  }
}
