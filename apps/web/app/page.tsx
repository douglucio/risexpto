import Link from 'next/link';

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
  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Marketing navigation">
        <Link href="/" className="marketing-brand">
          <span>R</span>
          <b>RiseXPTO</b>
        </Link>
        <div>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#security">Security</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/login" className="marketing-login">
            Log in
          </Link>
        </div>
      </nav>
      <section className="marketing-hero">
        <div>
          <p className="marketing-eyebrow">AUTOMATION WITH GUARDRAILS</p>
          <h1>Trade with a system you can understand.</h1>
          <p className="marketing-lede">
            RiseXPTO brings disciplined crypto automation, risk controls, and transparent monitoring
            into one focused workspace.
          </p>
          <div className="marketing-actions">
            <Link href="/login" className="marketing-button">
              Start in Paper Trading
            </Link>
            <a href="#how-it-works" className="marketing-secondary">
              See how it works →
            </a>
          </div>
          <p className="marketing-note">
            No custody. No withdrawal access. No promises of returns.
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
        <p className="marketing-eyebrow">A CONTROLLED LOOP</p>
        <h2>From signal to decision, every step has context.</h2>
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
          <p className="marketing-eyebrow">SECURITY IS THE PRODUCT</p>
          <h2>Automation should make decisions more disciplined, not more mysterious.</h2>
        </div>
        <ul>
          <li>Trade-only API permissions</li>
          <li>Encrypted exchange credentials</li>
          <li>Risk Engine before execution</li>
          <li>Full audit trail for actions</li>
        </ul>
      </section>
      <section id="pricing" className="marketing-pricing">
        <p className="marketing-eyebrow">SIMPLE START</p>
        <h2>Begin with Paper Trading.</h2>
        <p>
          Explore strategies, configure limits, and understand the workflow before considering live
          execution.
        </p>
        <Link href="/login" className="marketing-button">
          Create your workspace
        </Link>
      </section>
      <footer className="marketing-footer">
        <span>© 2026 RiseXPTO</span>
        <span>Past performance does not guarantee future results.</span>
      </footer>
    </main>
  );
}
