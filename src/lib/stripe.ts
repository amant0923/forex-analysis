import Stripe from "stripe";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

// Lazy initialization — only created when actually called at runtime
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as any)[prop];
  },
});

export const PLANS = {
  essential_monthly: {
    name: "Essential",
    price: 1900, // cents
    interval: "month" as const,
    tier: "essential" as const,
  },
  essential_annual: {
    name: "Essential Annual",
    price: 18200, // $182/yr (20% off)
    interval: "year" as const,
    tier: "essential" as const,
  },
  premium_monthly: {
    name: "Premium",
    price: 3900,
    interval: "month" as const,
    tier: "premium" as const,
  },
  premium_annual: {
    name: "Premium Annual",
    price: 37400, // $374/yr (20% off)
    interval: "year" as const,
    tier: "premium" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
