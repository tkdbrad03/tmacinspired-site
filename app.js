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
  const map  = { rental: 0, shared: 1, taxlien: 2 };
  if (tabs[map[calcId]]) tabs[map[calcId]].classList.add('active');
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
      <button class="deal-delete-btn" onclick="deleteDeal(${deal.id})" aria-label="Delete deal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
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
