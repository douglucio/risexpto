'use client';

import Link from 'next/link';
import { translate } from '@risexpto/i18n';
import { useLocale } from '../components/locale-provider';
import { PublicPricing } from '../components/public-pricing';
import { useEffect, useState } from 'react';

const benefits = [
  [
    'Risk-first automation',
    'Every trade proposal is checked against hard limits before execution.',
  ],
  [
    'Paper Trading first',
    'Validate behavior with market data and simulated balances before going live.',
  ],
  [
    'Non-custodial by design',
    'Your assets stay on your exchange. Withdrawal permission is never required.',
  ],
];

export default function MarketingPage() {
  const { locale, setLocale } = useLocale();
  const [activeSection, setActiveSection] = useState('');
  const t = (key: string) => translate(key, locale);
  useEffect(() => {
    const sections = ['how-it-works', 'security', 'pricing'].map((id) => document.getElementById(id)).filter((item): item is HTMLElement => Boolean(item));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: '-5rem 0px -55% 0px', threshold: [0.1, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const navClass = (section: string) => activeSection === section ? 'is-active' : undefined;
  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Marketing navigation">
        <Link href="/" className="marketing-brand">
          <span>R</span>
          <b>RiseXPTO</b>
        </Link>
        <div>
          <Link className={navClass('how-it-works')} href="#how-it-works">{t('marketing.how')}</Link>
          <Link className={navClass('security')} href="#security">{t('marketing.security')}</Link>
          <Link className={navClass('pricing')} href="#pricing">{t('marketing.pricing')}</Link>
          <select aria-label="Language" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}><option value="en">EN</option><option value="pt-BR">PT</option><option value="es">ES</option></select>
          <Link href="/login" className="marketing-login">
            {t('marketing.login')}
          </Link>
        </div>
      </nav>
      <section className="marketing-hero">
        <div>
          <p className="marketing-eyebrow">AUTOMATION WITH GUARDRAILS</p>
          <h1>{t('marketing.hero')}</h1>
          <p className="marketing-lede">{t('marketing.lede')}</p>
          <div className="marketing-actions">
            <Link href="/login" className="marketing-button">
              {t('marketing.paper')}
            </Link>
            <a href="#how-it-works" className="marketing-secondary">
              {t('marketing.see')}
            </a>
          </div>
          <p className="marketing-note">
            {t('marketing.note')}
          </p>
        </div>
        <div className="marketing-preview" aria-label="Illustrative risk dashboard preview">
          <div className="preview-top">
            <span>PORTFOLIO OVERVIEW</span>
            <b>● PAPER</b>
          </div>
          <strong>$128,420.36</strong>
          <small>Illustrative workspace</small>
          <div className="preview-chart">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="preview-stats">
            <span>
              <small>Risk capacity</small>
              <b>Within limits</b>
            </span>
            <span>
              <small>Active bots</small>
              <b>04</b>
            </span>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="marketing-section">
        <p className="marketing-eyebrow">{t('marketing.loop')}</p>
        <h2>{t('marketing.context')}</h2>
        <div className="marketing-cards">
          {benefits.map(([title, text], index) => (
            <article key={title}>
              <span className="card-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="security" className="marketing-security">
        <div>
          <p className="marketing-eyebrow">{t('marketing.product')}</p>
          <h2>{t('marketing.securityHeadline')}</h2>
        </div>
        <ul>
          <li>Trade-only API permissions</li>
          <li>Encrypted exchange credentials</li>
          <li>Risk Engine before execution</li>
          <li>Full audit trail for actions</li>
        </ul>
      </section>
      <section id="pricing" className="marketing-pricing">
        <p className="marketing-eyebrow">{t('marketing.simple')}</p>
        <h2>{t('marketing.begin')}</h2>
        <p>
          Explore strategies, configure limits, and understand the workflow before considering live
          execution.
        </p>
        <PublicPricing />
        <Link href="/login" className="marketing-button">
          {t('marketing.workspace')}
        </Link>
      </section>
      <footer className="marketing-footer">
        <span>© 2026 RiseXPTO</span>
        <span>Past performance does not guarantee future results.</span>
      </footer>
    </main>
  );
}
