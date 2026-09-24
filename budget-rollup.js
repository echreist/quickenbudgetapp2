(function (global) {
  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function safeDivide(numerator, denominator) {
    if (!Number.isFinite(denominator) || denominator === 0) {
      return 0;
    }

    return Number(numerator) / Number(denominator);
  }

  function getDaysInMonth(month, year) {
    const normalizedMonth = Number(month);
    const normalizedYear = Number(year);

    if (!Number.isFinite(normalizedMonth) || !Number.isFinite(normalizedYear) || normalizedMonth < 1 || normalizedMonth > 12) {
      return 30;
    }

    return new Date(normalizedYear, normalizedMonth, 0).getDate();
  }

  function formatCurrency(value) {
    const raw = value === null || value === undefined || value === '' ? 0 : Number(value);
    const numericValue = Number.isFinite(raw) ? raw : 0;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(numericValue);
  }

  function resolveAmount(entry, keys = ['planned', 'budget', 'target', 'expected']) {
    if (!entry || typeof entry !== 'object') {
      return 0;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(entry, key) && entry[key] !== null && entry[key] !== undefined && entry[key] !== '') {
        return normalizeNumber(entry[key], 0);
      }
    }

    return 0;
  }

  function safePercent(numerator, denominator) {
    return safeDivide(numerator, denominator) * 100;
  }

  function getVarianceState(value) {
    const numericValue = normalizeNumber(value, 0);
    if (numericValue > 0) return 'favorable';
    if (numericValue < 0) return 'unfavorable';
    return 'neutral';
  }

  function getVarianceClass(input) {
    const state = typeof input === 'string' ? input : getVarianceState(input);
    switch (state) {
      case 'favorable':
        return 'text-emerald-600';
      case 'unfavorable':
        return 'text-rose-600';
      default:
        return 'text-slate-500';
    }
  }

  function calculateExpenseCategoryMix(expenseRows = []) {
    const rows = Array.isArray(expenseRows) ? expenseRows : [];
    const fixedKeywords = /(mortgage|rent|utility|utilities|insurance|loan|mortgage|phone|internet|cell|water|electric|gas|tax|escrow|medical|healthcare|childcare|maintenance)/i;
    const discretionaryKeywords = /(dining|restaurant|entertainment|shopping|travel|gift|hobby|coffee|leisure|fun|vacation|streaming)/i;

    const fixedRows = rows.filter((row) => {
      const name = String(row && row.name ? row.name : '').toLowerCase();
      return fixedKeywords.test(name) && !discretionaryKeywords.test(name);
    });

    const discretionaryRows = rows.filter((row) => {
      const name = String(row && row.name ? row.name : '').toLowerCase();
      return discretionaryKeywords.test(name) || (!fixedKeywords.test(name) && !name.includes('savings'));
    });

    const actualFixedExpenses = fixedRows.reduce((sum, row) => sum + toFiniteNumber(row.actual, 0), 0);
    const actualDiscretionaryExpenses = discretionaryRows.reduce((sum, row) => sum + toFiniteNumber(row.actual, 0), 0);
    const budgetFixedExpenses = fixedRows.reduce((sum, row) => sum + toFiniteNumber(row.budget, 0), 0);
    const budgetDiscretionaryExpenses = discretionaryRows.reduce((sum, row) => sum + toFiniteNumber(row.budget, 0), 0);

    return {
      fixedRows,
      discretionaryRows,
      actualFixedExpenses,
      actualDiscretionaryExpenses,
      budgetFixedExpenses,
      budgetDiscretionaryExpenses,
    };
  }

  function calculateMonthPacing({
    budgetMonth = new Date().getMonth() + 1,
    budgetYear = new Date().getFullYear(),
    currentDay = new Date().getDate(),
    actualExpenses = 0,
    budgetedExpenses = 0,
  } = {}) {
    const daysInMonth = getDaysInMonth(budgetMonth, budgetYear);
    const clampedCurrentDay = clamp(toFiniteNumber(currentDay, 1), 1, daysInMonth);
    const monthElapsedPct = safeDivide(clampedCurrentDay, daysInMonth) * 100;
    const spendPct = safeDivide(actualExpenses, budgetedExpenses) * 100;
    const pacingDelta = spendPct - monthElapsedPct;
    const isOverPacing = pacingDelta > 5;
    const badgeText = isOverPacing ? `Over Pacing by +${Math.abs(pacingDelta).toFixed(1)}%` : 'On Track';

    return {
      daysInMonth,
      currentDay: clampedCurrentDay,
      monthElapsedPct,
      spendPct,
      pacingDelta,
      isOverPacing,
      status: isOverPacing ? 'warning' : 'favorable',
      badgeText,
      daysRemaining: Math.max(1, daysInMonth - clampedCurrentDay + 1),
    };
  }

  function calculateSafeToSpend({
    totalBudgetedExpenses = 0,
    actualFixedExpenses = 0,
    actualDiscretionaryExpenses = 0,
    budgetMonth = new Date().getMonth() + 1,
    budgetYear = new Date().getFullYear(),
    currentDay = new Date().getDate(),
  } = {}) {
    const daysInMonth = getDaysInMonth(budgetMonth, budgetYear);
    const clampedCurrentDay = clamp(toFiniteNumber(currentDay, 1), 1, daysInMonth);
    const safeToSpend = (toFiniteNumber(totalBudgetedExpenses, 0) - toFiniteNumber(actualFixedExpenses, 0)) - toFiniteNumber(actualDiscretionaryExpenses, 0);
    const daysRemaining = Math.max(1, daysInMonth - clampedCurrentDay + 1);
    const dailyAllowance = safeDivide(safeToSpend, daysRemaining);

    return {
      safeToSpend,
      daysInMonth,
      currentDay: clampedCurrentDay,
      daysRemaining,
      dailyAllowance,
      isNegative: safeToSpend < 0,
    };
  }

  function calculateSinkingFundProgress(fund = {}) {
    const targetAmount = toFiniteNumber(fund.target_amount ?? fund.targetAmount ?? 0, 0);
    const currentBalance = toFiniteNumber(fund.current_balance ?? fund.currentBalance ?? 0, 0);
    const monthlyAllocated = toFiniteNumber(fund.monthly_allocated ?? fund.monthlyAllocated ?? 0, 0);

    return {
      name: fund.name || 'Sinking Fund',
      targetAmount,
      currentBalance,
      monthlyAllocated,
      progressPct: safeDivide(currentBalance, targetAmount) * 100,
      remainingAmount: targetAmount - currentBalance,
      isComplete: targetAmount > 0 && currentBalance >= targetAmount,
    };
  }

  function calculateMonthlyNetSavingsRollup(data = {}) {
    const income = data.income || {};
    const expenses = data.expenses || {};
    const savingsTransfers = data.savingsTransfers || data.expenseTransfers || {};

    const incomePlanned = resolveAmount(income, ['planned', 'budget', 'target', 'expected']);
    const incomeActual = normalizeNumber(income.actual ?? income.actualAmount ?? income.value ?? 0, 0);
    const expensePlanned = resolveAmount(expenses, ['planned', 'budget', 'target', 'expected']);
    const expenseActual = normalizeNumber(expenses.actual ?? expenses.actualAmount ?? expenses.value ?? 0, 0);
    const savingsPlanned = resolveAmount(savingsTransfers, ['planned', 'budget', 'target', 'expected']);
    const savingsActual = normalizeNumber(
      savingsTransfers.actual ?? savingsTransfers.actualAmount ?? savingsTransfers.value ?? 0,
      0,
    );

    const operatingSurplusPlanned = incomePlanned - expensePlanned;
    const operatingSurplusActual = incomeActual - expenseActual;
    const plannedNet = operatingSurplusPlanned - savingsPlanned;
    const actualNet = operatingSurplusActual - savingsActual;
    const netVariance = actualNet - plannedNet;
    const incomeVariance = incomeActual - incomePlanned;
    const expenseVariance = expenseActual - expensePlanned;
    const savingsVariance = savingsActual - savingsPlanned;

    return {
      incomePlanned,
      incomeActual,
      expensePlanned,
      expenseActual,
      savingsTransfersPlanned: savingsPlanned,
      savingsTransfersActual: savingsActual,
      operatingSurplusPlanned,
      operatingSurplusActual,
      plannedNet,
      actualNet,
      netVariance,
      incomeVariance,
      expenseVariance,
      savingsVariance,
      netVarianceState: getVarianceState(netVariance),
      incomeVarianceState: getVarianceState(incomeVariance),
      expenseVarianceState: getVarianceState(-expenseVariance),
      savingsTransfersState: getVarianceState(savingsVariance),
      plannedSavingsRate: safePercent(plannedNet, incomePlanned),
      actualSavingsRate: safePercent(actualNet, incomeActual),
      varianceSavingsRate: safePercent(netVariance, incomeActual),
    };
  }

  const api = {
    calculateMonthlyNetSavingsRollup,
    calculateExpenseCategoryMix,
    calculateMonthPacing,
    calculateSafeToSpend,
    calculateSinkingFundProgress,
    getVarianceState,
    getVarianceClass,
    formatCurrency,
  };

  global.BudgetRollup = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
