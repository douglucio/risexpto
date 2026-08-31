import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cx('rx-button', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('rx-input', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('rx-input', 'rx-select', className)} {...props}>
      {children}
    </select>
  );
}

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode };
export function Checkbox({ label, ...props }: ChoiceProps) {
  return (
    <label className="rx-choice">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
export function Radio({ label, ...props }: ChoiceProps) {
  return (
    <label className="rx-choice">
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}
export function Switch({ label, ...props }: ChoiceProps) {
  return (
    <label className="rx-switch">
      <input type="checkbox" role="switch" {...props} />
      <span aria-hidden="true" />
      <b>{label}</b>
    </label>
  );
}

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="rx-field">
      <span>{label}</span>
      {children}
      <small className={error ? 'rx-field-error' : ''}>{error ?? hint}</small>
    </label>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rx-card', className)} {...props} />;
}

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="rx-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="rx-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rx-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="rx-dialog-title">{title}</h2>
          <Button aria-label="Close dialog" onClick={onClose}>
            ×
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="rx-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="rx-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <Button aria-label="Close drawer" onClick={onClose}>
            ×
          </Button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="rx-tooltip" data-tooltip={label}>
      {children}
    </span>
  );
}
export function Popover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="rx-popover">
      <summary>{label}</summary>
      <div>{children}</div>
    </details>
  );
}
export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="rx-popover rx-dropdown">
      <summary>{label}</summary>
      <div role="menu">{children}</div>
    </details>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'positive' | 'negative' | 'warning';
  children: ReactNode;
}) {
  return <span className={`rx-badge rx-badge-${tone}`}>{children}</span>;
}
export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'positive' | 'negative' | 'warning';
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`rx-alert rx-alert-${tone}`} role={tone === 'negative' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
export function Toast({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rx-toast" role="status">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('rx-skeleton', className)} aria-hidden="true" />;
}
export function Tabs({
  tabs,
  active,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
}) {
  return (
    <div className="rx-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={active === tab.id}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="rx-progress">
      <span>
        <b>{label}</b>
        <small>{safe}%</small>
      </span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
      >
        <i style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
export function Pagination({ page, pages }: { page: number; pages: number }) {
  return (
    <nav className="rx-pagination" aria-label="Pagination">
      <Button disabled={page <= 1}>Previous</Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button disabled={page >= pages}>Next</Button>
    </nav>
  );
}
