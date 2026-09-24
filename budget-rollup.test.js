const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateMonthlyNetSavingsRollup,
  getVarianceState,
  getVarianceClass,
} = require('./budget-rollup.js');

test('mid-month state offsets income shortfall with disciplined expense savings', () => {
  const rollup = calculateMonthlyNetSavingsRollup({
    income: { planned: 6200, actual: 5400 },
    expenses: { planned: 4700, actual: 3700 },
  });

  assert.equal(rollup.plannedNet, 1500);
  assert.equal(rollup.actualNet, 1700);
  assert.equal(rollup.netVariance, 200);
  assert.equal(rollup.netVarianceState, 'favorable');
  assert.equal(rollup.incomeVariance, -800);
  assert.equal(rollup.incomeVarianceState, 'unfavorable');
  assert.equal(rollup.expenseVariance, -1000);
  assert.equal(rollup.expenseVarianceState, 'favorable');
  assert.ok(Math.abs(rollup.actualSavingsRate - 31.4814814815) < 0.0001);
  assert.equal(getVarianceState(200), 'favorable');
  assert.equal(getVarianceClass('favorable'), 'text-emerald-600');
});

test('overspending deficit state is unfavorable and negative', () => {
  const rollup = calculateMonthlyNetSavingsRollup({
    income: { planned: 6000, actual: 5500 },
    expenses: { planned: 4200, actual: 4800 },
  });

  assert.equal(rollup.plannedNet, 1800);
  assert.equal(rollup.actualNet, 700);
  assert.equal(rollup.netVariance, -1100);
  assert.equal(rollup.netVarianceState, 'unfavorable');
  assert.equal(rollup.incomeVariance, -500);
  assert.equal(rollup.expenseVariance, 600);
  assert.equal(rollup.expenseVarianceState, 'unfavorable');
  assert.ok(Math.abs(rollup.actualSavingsRate - 12.7272727273) < 0.0001);
  assert.equal(getVarianceClass('unfavorable'), 'text-rose-600');
});

test('zero-baseline edge cases do not divide by zero and stay neutral', () => {
  const rollup = calculateMonthlyNetSavingsRollup({
    income: { planned: 0, actual: 0 },
    expenses: { planned: 0, actual: 0 },
  });

  assert.equal(rollup.plannedNet, 0);
  assert.equal(rollup.actualNet, 0);
  assert.equal(rollup.netVariance, 0);
  assert.equal(rollup.netVarianceState, 'neutral');
  assert.equal(rollup.actualSavingsRate, 0);
  assert.equal(rollup.plannedSavingsRate, 0);
  assert.equal(getVarianceState(0), 'neutral');
  assert.equal(getVarianceClass('neutral'), 'text-slate-500');
});
