'use strict';

// ─── State ────────────────────────────────────────────────────────
const state = {
  current:      '0',
  previous:     '',
  operator:     null,
  expression:   '',
  justEvaled:   false,
  sciMode:      false,
  historyOpen:  false,
  history:      JSON.parse(localStorage.getItem('calc-history') || '[]'),
  openParens:   0,          // track open parens for sci mode
};

// ADD TEST CUSTOM COMMENT

// ─── DOM refs ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const resultEl   = $('result');
const exprEl     = $('expression');
const previewEl  = $('preview');
const sciGrid    = $('sciGrid');
const modeToggle = $('modeToggle');
const histPanel  = $('historyPanel');
const histToggle = $('historyToggle');
const histList   = $('historyList');
const clearHist  = $('clearHistory');

// ─── Display ─────────────────────────────────────────────────────
function updateDisplay() {
  const val = state.current;

  // auto-shrink long numbers
  resultEl.classList.toggle('shrink', val.length > 10);
  resultEl.textContent = formatNumber(val);
  exprEl.textContent   = state.expression;

  // live preview while typing operator + second number
  if (state.operator && !state.justEvaled && state.previous && state.current !== '0') {
    const preview = computePreview();
    previewEl.textContent = preview !== null ? '= ' + formatNumber(String(preview)) : '';
  } else {
    previewEl.textContent = '';
  }
}

function formatNumber(str) {
  if (str === 'Error' || str.includes('Infinity')) return str;
  const [int, dec] = str.split('.');
  const formatted = parseInt(int, 10).toLocaleString('en-US');
  return dec !== undefined ? formatted + '.' + dec : formatted;
}

function computePreview() {
  try {
    const a = parseFloat(state.previous);
    const b = parseFloat(state.current);
    if (isNaN(a) || isNaN(b)) return null;
    switch (state.operator) {
      case '+': return round(a + b);
      case '−': return round(a - b);
      case '×': return round(a * b);
      case '÷': return b === 0 ? null : round(a / b);
      default:  return null;
    }
  } catch { return null; }
}

function round(n) {
  return Math.round(n * 1e10) / 1e10;
}

// ─── Actions ─────────────────────────────────────────────────────
function inputNumber(digit) {
  if (state.justEvaled) { state.current = digit; state.justEvaled = false; return; }
  if (state.current === '0' && digit !== '.') {
    state.current = digit;
  } else if (digit === '.' && state.current.includes('.')) {
    return; // only one decimal
  } else {
    state.current = state.current + digit;
  }
}

function inputDecimal() { inputNumber('.'); }

function inputOperator(op) {
  if (state.operator && !state.justEvaled) {
    // chain: evaluate before setting new operator
    calculate(false);
  }
  state.previous   = state.current;
  state.operator   = op;
  state.expression = formatNumber(state.current) + ' ' + op;
  state.justEvaled = false;
  state.current    = '0';

  // highlight active operator button
  document.querySelectorAll('.btn-op').forEach(b => {
    b.classList.toggle('active-op', b.dataset.value === op);
  });
}

function calculate(final = true) {
  if (!state.operator || state.previous === '') return;

  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  let result;

  switch (state.operator) {
    case '+': result = a + b; break;
    case '−': result = a - b; break;
    case '×': result = a * b; break;
    case '÷':
      if (b === 0) { state.current = 'Error'; flashResult(); clearOp(); return; }
      result = a / b;
      break;
    default: return;
  }

  result = round(result);
  // comment for me

  if (final) {
    const expr = `${formatNumber(state.previous)} ${state.operator} ${formatNumber(state.current)}`;
    addHistory(expr, String(result));

    state.expression = expr + ' =';
    state.current    = String(result);
    state.previous   = '';
    state.operator   = null;
    state.justEvaled = true;
    clearOp();
    flashResult();
  } else {
    state.current = String(result);
  }
}

function clearAll() {
  state.current    = '0';
  state.previous   = '';
  state.operator   = null;
  state.expression = '';
  state.justEvaled = false;
  state.openParens = 0;
  clearOp();
}

function toggleSign() {
  if (state.current === '0' || state.current === 'Error') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
}

function applyPercent() {
  const n = parseFloat(state.current);
  if (isNaN(n)) return;
  state.current = String(round(state.operator && state.previous
    ? parseFloat(state.previous) * n / 100
    : n / 100));
}

function handleSci(value) {
  // Handle smart parenthesis toggle
  if (value === '(') {
    if (state.openParens > 0) {
      // close an open paren
      state.expression += state.current + ')';
      state.openParens--;
    } else {
      // open new paren
      if (state.justEvaled) { state.expression = state.current; state.justEvaled = false; }
      state.expression += '(';
      state.current = '0';
      state.openParens++;
    }
    return;
  }

  // Constants
  if (value === 'Math.PI') { state.current = String(round(Math.PI)); return; }
  if (value === 'Math.E')  { state.current = String(round(Math.E)); return; }

  // Power operator
  if (value === '**') {
    state.previous   = state.current;
    state.operator   = '^';
    state.expression = formatNumber(state.current) + ' ^';
    state.current    = '0';
    state.justEvaled = false;

    // patch calculate for ^ operator
    state._powerMode = true;

    document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
    return;
  }

  // Functions: sin, cos, tan, log, ln, sqrt
  try {
    const arg = parseFloat(state.current);
    let result;
    const fnName = value.replace('Math.', '').replace('(', '');

    switch (fnName) {
      case 'sin':   result = round(Math.sin(arg * Math.PI / 180)); break; // degrees
      case 'cos':   result = round(Math.cos(arg * Math.PI / 180)); break;
      case 'tan':   result = round(Math.tan(arg * Math.PI / 180)); break;
      case 'log10': result = round(Math.log10(arg)); break;
      case 'log':   result = round(Math.log(arg)); break;
      case 'sqrt':  result = arg < 0 ? NaN : round(Math.sqrt(arg)); break;
      default: return;
    }

    if (!isFinite(result) || isNaN(result)) { state.current = 'Error'; flashResult(); return; }

    const expr = `${fnName}(${arg})`;
    addHistory(expr, String(result));
    state.expression = expr + ' =';
    state.current    = String(result);
    state.justEvaled = true;
    flashResult();
  } catch { state.current = 'Error'; flashResult(); }
}

// patch calculate for power mode
const _origCalculate = calculate;
function calculateWithPower(final = true) {
  if (state._powerMode) {
    const a = parseFloat(state.previous);
    const b = parseFloat(state.current);
    const result = round(Math.pow(a, b));
    if (final) {
      const expr = `${formatNumber(state.previous)} ^ ${formatNumber(state.current)}`;
      addHistory(expr, String(result));
      state.expression = expr + ' =';
      state.current    = String(result);
      state.previous   = '';
      state.operator   = null;
      state.justEvaled = true;
      state._powerMode = false;
      flashResult();
    } else {
      state.current = String(result);
    }
    return;
  }
  _origCalculate(final);
}

// override calculate reference
window._calculate = calculateWithPower;

// ─── Helpers ─────────────────────────────────────────────────────
function clearOp() {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
}

function flashResult() {
  resultEl.classList.remove('flash');
  void resultEl.offsetWidth; // reflow
  resultEl.classList.add('flash');
  setTimeout(() => resultEl.classList.remove('flash'), 350);
}

// ─── History ─────────────────────────────────────────────────────
function addHistory(expr, result) {
  state.history.unshift({ expr, result, ts: Date.now() });
  if (state.history.length > 30) state.history.pop();
  localStorage.setItem('calc-history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    histList.innerHTML = '<li class="history-empty">No history yet</li>';
    return;
  }
  histList.innerHTML = state.history.map((item, i) => `
    <li class="history-item" data-index="${i}">
      <div class="h-expr">${escHtml(item.expr)}</div>
      <div class="h-result">${escHtml(item.result)}</div>
    </li>
  `).join('');

  histList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      state.current    = state.history[idx].result;
      state.expression = state.history[idx].expr + ' =';
      state.justEvaled = true;
      updateDisplay();
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Ripple Effect ───────────────────────────────────────────────
function attachRipple(btn) {
  btn.addEventListener('pointerdown', e => {
    const rect = btn.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%';
    const ry = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
    btn.style.setProperty('--rx', rx);
    btn.style.setProperty('--ry', ry);
    btn.classList.add('ripple');
    setTimeout(() => btn.classList.remove('ripple'), 500);
  });
}

// ─── Event Delegation ────────────────────────────────────────────
document.getElementById('calculator').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const { action, value } = btn.dataset;

  switch (action) {
    case 'number':   inputNumber(value); break;
    case 'decimal':  inputDecimal(); break;
    case 'operator': inputOperator(value); break;
    case 'equals':   window._calculate(true); break;
    case 'clear':    clearAll(); break;
    case 'sign':     toggleSign(); break;
    case 'percent':  applyPercent(); break;
    case 'sci':      handleSci(value); break;
  }

  updateDisplay();
});

// ─── Mode Toggle ─────────────────────────────────────────────────
modeToggle.addEventListener('click', () => {
  state.sciMode = !state.sciMode;
  modeToggle.classList.toggle('active', state.sciMode);
  sciGrid.classList.toggle('open', state.sciMode);
  document.getElementById('calculator').classList.toggle('sci-open', state.sciMode);
});

// ─── History Toggle ───────────────────────────────────────────────
histToggle.addEventListener('click', () => {
  state.historyOpen = !state.historyOpen;
  histPanel.classList.toggle('open', state.historyOpen);
});

clearHist.addEventListener('click', () => {
  state.history = [];
  localStorage.removeItem('calc-history');
  renderHistory();
});

// close history when clicking outside
document.addEventListener('click', e => {
  if (state.historyOpen &&
      !histPanel.contains(e.target) &&
      !histToggle.contains(e.target)) {
    state.historyOpen = false;
    histPanel.classList.remove('open');
  }
});

// ─── Keyboard Support ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) return;

  const key = e.key;
  e.preventDefault();

  if (key >= '0' && key <= '9')  { inputNumber(key); }
  else if (key === '.')           { inputDecimal(); }
  else if (key === '+')           { inputOperator('+'); }
  else if (key === '-')           { inputOperator('−'); }
  else if (key === '*')           { inputOperator('×'); }
  else if (key === '/')           { inputOperator('÷'); }
  else if (key === 'Enter' || key === '=') { window._calculate(true); }
  else if (key === 'Escape')      { clearAll(); }
  else if (key === 'Backspace')   {
    if (state.current.length > 1 && !state.justEvaled) {
      state.current = state.current.slice(0, -1) || '0';
    } else {
      state.current = '0';
    }
  }
  else if (key === '%')           { applyPercent(); }

  updateDisplay();
  pulseMatchingBtn(key);
});

function pulseMatchingBtn(key) {
  const map = {
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    '+':'+','−':'-','*':'×','/':'÷','=':'=',
    'Enter':'=',
  };
  const label = map[key];
  if (!label) return;
  document.querySelectorAll('.btn').forEach(b => {
    const match = b.dataset.value === label || b.textContent.trim() === label;
    if (match) {
      b.classList.add('ripple');
      setTimeout(() => b.classList.remove('ripple'), 400);
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────
document.querySelectorAll('.btn').forEach(attachRipple);
renderHistory();
updateDisplay();

// Add subtle keyboard hint
const hint = document.createElement('p');
hint.className = 'key-hint';
hint.textContent = 'Keyboard supported · ⚛ for scientific mode';
document.getElementById('calculator').appendChild(hint);
