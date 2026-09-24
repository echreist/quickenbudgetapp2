const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateMonthlyNetSavingsRollup,
  calculateMonthPacing,
  calculateSafeToSpend,
  calculateSinkingFundProgress,
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

test('operating cash surplus is separated from retained net savings after transfer allocations', () => {
  const rollup = calculateMonthlyNetSavingsRollup({
    income: { planned: 6200, actual: 5800 },
    expenses: { planned: 4400, actual: 3900 },
    savingsTransfers: { planned: 950, actual: 1100 },
  });

  assert.equal(rollup.operatingSurplusPlanned, 1800);
  assert.equal(rollup.operatingSurplusActual, 1900);
  assert.equal(rollup.plannedNet, 850);
  assert.equal(rollup.actualNet, 800);
  assert.equal(rollup.netVariance, -50);
  assert.equal(rollup.netVarianceState, 'unfavorable');
  assert.ok(Math.abs(rollup.actualSavingsRate - 13.793103448275862) < 0.0001);
});

test('expenseTransfers alias still produces the same retained-savings path', () => {
  const rollup = calculateMonthlyNetSavingsRollup({
    income: { planned: 6200, actual: 5800 },
    expenses: { planned: 4400, actual: 3900 },
    expenseTransfers: { planned: 950, actual: 1100 },
  });

  assert.equal(rollup.operatingSurplusActual, 1900);
  assert.equal(rollup.actualNet, 800);
  assert.equal(rollup.netVariance, -50);
  assert.equal(rollup.savingsTransfersActual, 1100);
});

test('month pacing flags overspending and tracks daily progress correctly', () => {
  const pacing = calculateMonthPacing({
    budgetMonth: 30,
    budgetYear: 2026,
    currentDay: 18,
    actualExpenses: 6400,
    budgetedExpenses: 5200,
  });

  assert.equal(pacing.daysInMonth, 30);
  assert.equal(pacing.currentDay, 18);
  assert.equal(pacing.monthElapsedPct, 60);
  assert.ok(pacing.isOverPacing);
  assert.equal(pacing.status, 'warning');
  assert.equal(pacing.badgeText, 'Over Pacing by +63.1%');

  const startOfMonth = calculateMonthPacing({
    budgetMonth: 30,
    budgetYear: 2026,
    currentDay: 1,
    actualExpenses: 1000,
    budgetedExpenses: 5000,
  });
  assert.equal(startOfMonth.monthElapsedPct, 3.3333333333333335);
  assert.equal(startOfMonth.badgeText, 'Over Pacing by +16.7%');

  const endOfMonth = calculateMonthPacing({
    budgetMonth: 30,
    budgetYear: 2026,
    currentDay: 30,
    actualExpenses: 5000,
    budgetedExpenses: 5000,
  });
  assert.equal(endOfMonth.monthElapsedPct, 100);
  assert.equal(endOfMonth.pacingDelta, 0);
});

test('safe-to-spend and sinking fund progress guard zero and negative scenarios', () => {
  const safeToSpend = calculateSafeToSpend({
    totalBudgetedExpenses: 5000,
    actualFixedExpenses: 3900,
    actualDiscretionaryExpenses: 2100,
    budgetMonth: 30,
    budgetYear: 2026,
    currentDay: 18,
  });
  const fundProgress = calculateSinkingFundProgress({
    name: 'Emergency Reserve',
    target_amount: 15000,
    current_balance: 8200,
    monthly_allocated: 1200,
  });

  assert.equal(safeToSpend.safeToSpend, -1000);
  assert.equal(safeToSpend.daysRemaining, 13);
  assert.equal(safeToSpend.dailyAllowance, -76.92307692307692);
  assert.equal(fundProgress.progressPct, 54.666666666666664);
  assert.equal(fundProgress.remainingAmount, 6800);
  assert.equal(fundProgress.isComplete, false);
});

test('sinking fund calculations accept the modern currentBalance and targetAmount fields', () => {
  const fundProgress = calculateSinkingFundProgress({
    name: 'Travel Fund',
    currentBalance: 1900,
    targetAmount: 3500,
    monthlyAllocated: 600,
  });

  assert.equal(fundProgress.name, 'Travel Fund');
  assert.equal(fundProgress.currentBalance, 1900);
  assert.equal(fundProgress.targetAmount, 3500);
  assert.equal(fundProgress.progressPct, 54.285714285714285);
  assert.equal(fundProgress.remainingAmount, 1600);
  assert.equal(fundProgress.isComplete, false);
});
