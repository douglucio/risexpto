type BrandLockupProps = {
  variant?: 'compact' | 'auth' | 'header';
  className?: string;
};

export function BrandLockup({ variant = 'header', className = '' }: BrandLockupProps) {
  return (
    <img
      className={`rx-brand-lockup rx-brand-lockup--${variant} ${className}`.trim()}
      src="/brand/risexpto-auth.svg"
      alt="RiseXPTO"
    />
  );
}
