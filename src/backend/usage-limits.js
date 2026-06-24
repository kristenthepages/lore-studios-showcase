// Sanitized excerpt from Lore Studios.
// Enforces subscription-based daily and monthly generation limits.

const PLAN_LIMITS = {
  free: {
    perSession: 1,
    daily: 1,
    monthly: null,
  },
  starter: {
    perSession: 5,
    daily: null,
    monthly: 20,
  },
  creator: {
    perSession: 10,
    daily: null,
    monthly: 60,
  },
  pro: {
    perSession: 15,
    daily: 150,
    monthly: 400,
  },
  platinum: {
    perSession: 15,
    daily: 150,
    monthly: 600,
  },
};

export function getPlanLimits(plan = "free") {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function checkUsageLimits(user) {
  const plan = user.plan || "free";
  const limits = getPlanLimits(plan);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const dailyUsed =
    user.daily_reset_date === today
      ? user.daily_generations_used || 0
      : 0;

  const monthlyUsed =
    String(user.monthly_reset_date || "").slice(0, 7) ===
    currentMonth
      ? user.monthly_generations_used || 0
      : 0;

  if (
    limits.daily !== null &&
    dailyUsed >= limits.daily
  ) {
    return {
      allowed: false,
      reason: `Daily generation limit reached for the ${plan} plan`,
    };
  }

  if (
    limits.monthly !== null &&
    monthlyUsed >= limits.monthly
  ) {
    return {
      allowed: false,
      reason: `Monthly generation limit reached for the ${plan} plan`,
    };
  }

  return {
    allowed: true,
    usage: {
      dailyUsed,
      monthlyUsed,
    },
    limits,
  };
}

export function getNextUsageCounters(user) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const dailyUsed =
    user.daily_reset_date === today
      ? user.daily_generations_used || 0
      : 0;

  const monthlyUsed =
    String(user.monthly_reset_date || "").slice(0, 7) ===
    currentMonth
      ? user.monthly_generations_used || 0
      : 0;

  return {
    daily_generations_used: dailyUsed + 1,
    daily_reset_date: today,
    monthly_generations_used: monthlyUsed + 1,
    monthly_reset_date: today,
  };
}
