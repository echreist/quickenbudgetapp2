(function (global) {
  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
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
    if (!Number.isFinite(denominator) || denominator === 0) {
      return 0;
    }

    return (Number(numerator) / Number(denominator)) * 100;
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

  function calculateMonthlyNetSavingsRollup(data = {}) {
    const income = data.income || {};
    const expenses = data.expenses || {};

    const incomePlanned = resolveAmount(income, ['planned', 'budget', 'target', 'expected']);
    const incomeActual = normalizeNumber(income.actual ?? income.actualAmount ?? income.value ?? 0, 0);
    const expensePlanned = resolveAmount(expenses, ['planned', 'budget', 'target', 'expected']);
    const expenseActual = normalizeNumber(expenses.actual ?? expenses.actualAmount ?? expenses.value ?? 0, 0);

    const plannedNet = incomePlanned - expensePlanned;
    const actualNet = incomeActual - expenseActual;
    const netVariance = actualNet - plannedNet;
    const incomeVariance = incomeActual - incomePlanned;
    const expenseVariance = expenseActual - expensePlanned;

    return {
      incomePlanned,
      incomeActual,
      expensePlanned,
      expenseActual,
      plannedNet,
      actualNet,
      netVariance,
      incomeVariance,
      expenseVariance,
      netVarianceState: getVarianceState(netVariance),
      incomeVarianceState: getVarianceState(incomeVariance),
      expenseVarianceState: getVarianceState(-expenseVariance),
      plannedSavingsRate: safePercent(plannedNet, incomePlanned),
      actualSavingsRate: safePercent(actualNet, incomeActual),
      varianceSavingsRate: safePercent(netVariance, incomeActual),
    };
  }

  const api = {
    calculateMonthlyNetSavingsRollup,
    getVarianceState,
    getVarianceClass,
  };

  global.BudgetRollup = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
