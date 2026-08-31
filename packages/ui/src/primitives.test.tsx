// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BotStatusIndicator, CurrencyDisplay, Progress } from './index';

describe('financial UI primitives', () => {
  it('formats currency with stable financial numerals', () => {
    render(<CurrencyDisplay value={1284.5} />);
    expect(screen.getByText('$1,284.50')).toHaveClass('rx-number');
  });
  it('exposes progress semantics and clamps unsafe values', () => {
    render(<Progress value={120} label="Risk capacity" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
  it('communicates bot status with text, not color alone', () => {
    render(<BotStatusIndicator status="RISK_BLOCKED" />);
    expect(screen.getByText(/RISK BLOCKED/)).toBeVisible();
  });
});
