'use client';

import Link from 'next/link';
import { translate } from '@risexpto/i18n';
import { useLocale } from '../components/locale-provider';
import { PublicPricing } from '../components/public-pricing';
import { marketingObserverOptions } from '../lib/marketing-observer';
import { useEffect, useState } from 'react';

export default function MarketingPage() {
  const { locale, setLocale } = useLocale();
  const [activeSection, setActiveSection] = useState('');
  const t = (key: string) => translate(key, locale);
  useEffect(() => {
    const sections = ['how-it-works', 'security', 'pricing']
      .map((id) => document.getElementById(id))
      .filter((item): item is HTMLElement => Boolean(item));
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, marketingObserverOptions);
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const navClass = (section: string) => (activeSection === section ? 'is-active' : undefined);
  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Marketing navigation">
        <Link href="/" className="marketing-brand">
          <span>R</span>
          <b>RiseXPTO</b>
        </Link>
        <div>
          <Link className={navClass('how-it-works')} href="#how-it-works">
            {t('marketing.how')}
          </Link>
          <Link className={navClass('security')} href="#security">
            {t('marketing.security')}
          </Link>
          <Link className={navClass('pricing')} href="#pricing">
            {t('marketing.pricing')}
          </Link>
          <select
            aria-label="Language / Idioma / Idioma"
            value={locale}
            onChange={(event) => setLocale(event.target.value as typeof locale)}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="pt-BR">🇧🇷 PT</option>
            <option value="es">🇪🇸 ES</option>
          </select>
          <Link href={`/login?locale=${encodeURIComponent(locale)}`} className="marketing-login">
            {t('marketing.login')}
          </Link>
        </div>
      </nav>
      <section className="marketing-hero">
        <div>
          <p className="marketing-eyebrow">{t('marketing.eyebrow')}</p>
          <h1>{t('marketing.hero')}</h1>
          <p className="marketing-lede">{t('marketing.lede')}</p>
          <div className="marketing-actions">
            <Link href={`/login?locale=${encodeURIComponent(locale)}`} className="marketing-button">
              {t('marketing.paper')}
            </Link>
            <a href="#how-it-works" className="marketing-secondary">
              {t('marketing.see')}
            </a>
          </div>
          <p className="marketing-note">{t('marketing.note')}</p>
        </div>
        <div className="marketing-preview" aria-label={t('marketing.previewLabel')}>
          <div className="preview-top">
            <span>{t('marketing.portfolio')}</span>
            <b>● PAPER</b>
          </div>
          <strong>$128,420.36</strong>
          <small>{t('marketing.illustrative')}</small>
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
              <small>{t('marketing.riskCapacity')}</small>
              <b>{t('marketing.withinLimits')}</b>
            </span>
            <span>
              <small>{t('marketing.activeBots')}</small>
              <b>04</b>
            </span>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="marketing-section">
        <p className="marketing-eyebrow">{t('marketing.loop')}</p>
        <h2>{t('marketing.context')}</h2>
        <div className="marketing-cards">
          {(['Risk', 'Paper', 'Custody'] as const).map((benefit, index) => (
            <article key={benefit}>
              <span className="card-number">0{index + 1}</span>
              <h3>{t(`marketing.benefit${benefit}`)}</h3>
              <p>{t(`marketing.benefit${benefit}Text`)}</p>
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
          <li>{t('marketing.securityTrade')}</li>
          <li>{t('marketing.securityCredentials')}</li>
          <li>{t('marketing.securityEngine')}</li>
          <li>{t('marketing.securityAudit')}</li>
        </ul>
      </section>
      <section id="pricing" className="marketing-pricing">
        <p className="marketing-eyebrow">{t('marketing.simple')}</p>
        <h2>{t('marketing.begin')}</h2>
        <p>{t('marketing.pricingDescription')}</p>
        <PublicPricing />
        <Link href="/login" className="marketing-button">
          {t('marketing.workspace')}
        </Link>
      </section>
      <footer className="marketing-footer">
        <span>© 2026 RiseXPTO</span>
        <span>{t('marketing.footerDisclaimer')}</span>
      </footer>
    </main>
  );
}
