'use strict';

// Pure utility functions extracted from calculator.js for testing

function round(n) {
  return Math.round(n * 1e10) / 1e10;
}

function formatNumber(str) {
  if (str === 'Error' || str.includes('Infinity')) return str;
  const [int, dec] = str.split('.');
  const formatted = parseInt(int, 10).toLocaleString('en-US');
  return dec !== undefined ? formatted + '.' + dec : formatted;
}

function calculate(a, op, b) {
  switch (op) {
    case '+': return round(a + b);
    case '−': return round(a - b);
    case '×': return round(a * b);
    case '÷': return b === 0 ? null : round(a / b);
    default:  return null;
  }
}

// ─── round ────────────────────────────────────────────────────────
describe('round', () => {
  test('rounds to 10 decimal places', () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
  });

  test('leaves integers unchanged', () => {
    expect(round(42)).toBe(42);
  });

  test('handles negative numbers', () => {
    expect(round(-1.0000000001)).toBe(-1);
  });
});

// ─── formatNumber ─────────────────────────────────────────────────
describe('formatNumber', () => {
  test('formats thousands with comma', () => {
    expect(formatNumber('1000')).toBe('1,000');
  });

  test('preserves decimal part', () => {
    expect(formatNumber('1234.56')).toBe('1,234.56');
  });

  test('returns Error unchanged', () => {
    expect(formatNumber('Error')).toBe('Error');
  });

  test('returns Infinity unchanged', () => {
    expect(formatNumber('Infinity')).toBe('Infinity');
  });

  test('formats single digit', () => {
    expect(formatNumber('5')).toBe('5');
  });
});

// ─── calculate ────────────────────────────────────────────────────
describe('calculate', () => {
  test('addition', () => {
    expect(calculate(2, '+', 3)).toBe(5);
  });

  test('subtraction', () => {
    expect(calculate(10, '−', 4)).toBe(6);
  });

  test('multiplication', () => {
    expect(calculate(3, '×', 7)).toBe(21);
  });

  test('division', () => {
    expect(calculate(10, '÷', 4)).toBe(2.5);
  });

  test('division by zero returns null', () => {
    expect(calculate(5, '÷', 0)).toBeNull();
  });

  test('floating point precision', () => {
    expect(calculate(0.1, '+', 0.2)).toBe(0.3);
  });

  test('negative result', () => {
    expect(calculate(3, '−', 10)).toBe(-7);
  });
});
