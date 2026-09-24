const test = require('node:test');
const assert = require('node:assert/strict');

const { formatCurrency } = require('./budget-rollup.js');

test('formatCurrency applies consistent USD formatting for common edge cases', () => {
  assert.equal(formatCurrency(4322.1), '$4,322.10');
  assert.equal(formatCurrency(42), '$42.00');
  assert.equal(formatCurrency(0), '$0.00');
  assert.equal(formatCurrency(-1697.13), '-$1,697.13');
  assert.equal(formatCurrency(5.5), '$5.50');
  assert.equal(formatCurrency('12.3'), '$12.30');
  assert.equal(formatCurrency(null), '$0.00');
  assert.equal(formatCurrency(undefined), '$0.00');
  assert.equal(formatCurrency(''), '$0.00');
});
