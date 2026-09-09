'use client';

import { useEffect, useState } from 'react';
import { useLocale } from './locale-provider';

type Plan = { plan: string; displayName: string; monthlyPrice: number; currency: string; features: string[]; recommended: boolean };
export function PublicPricing() {
  const { locale } = useLocale();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void fetch('/api/public/plans').then(async (response) => response.ok ? setPlans(await response.json() as Plan[]) : setError(true)).catch(() => setError(true)); }, []);
  if (error) return <p className="pricing-status">Pricing is temporarily unavailable. The workspace remains available in Paper Trading.</p>;
  if (!plans) return <p className="pricing-status">Loading plans…</p>;
  return <div className="pricing-grid">{plans.map((plan) => <article key={plan.plan} className={plan.recommended ? 'pricing-card is-recommended' : 'pricing-card'}><div><h3>{plan.displayName}</h3><strong>{new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(plan.monthlyPrice)}</strong><small>/ month · Stripe Test Mode</small></div><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article>)}</div>;
}
