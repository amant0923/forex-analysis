import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
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
