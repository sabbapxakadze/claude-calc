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