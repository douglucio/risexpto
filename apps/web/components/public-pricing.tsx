'use client';

import { useEffect, useState } from 'react';
import { useLocale } from './locale-provider';
import { formatCurrency, translate } from '@risexpto/i18n';

type Plan = { plan: string; displayName: string; monthlyPrice: number; currency: string; features: string[]; recommended: boolean };
export function PublicPricing() {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void fetch('/api/public/plans').then(async (response) => response.ok ? setPlans(await response.json() as Plan[]) : setError(true)).catch(() => setError(true)); }, []);
  if (error) return <p className="pricing-status">{t('pricing.error')}</p>;
  if (!plans) return <p className="pricing-status" role="status">{t('pricing.loading')}</p>;
  if (plans.length === 0) return <p className="pricing-status">{t('pricing.empty')}</p>;
  return <div className="pricing-grid">{plans.map((plan) => <article key={plan.plan} className={plan.recommended ? 'pricing-card is-recommended' : 'pricing-card'}><div><h3>{plan.displayName}</h3><strong>{formatCurrency(plan.monthlyPrice, plan.currency, locale)}</strong><small>{t('pricing.month')}</small></div><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article>)}</div>;
}
