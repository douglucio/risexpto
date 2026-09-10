'use client';

import { useState } from 'react';
import { Alert, Button } from '@risexpto/ui';
import { translate } from '@risexpto/i18n';
import { useLocale } from './locale-provider';

export function BotControls({
  id,
  status,
  tradingMode,
}: {
  id: string;
  status: string;
  tradingMode: string;
}) {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(nextStatus: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bots/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(t('workspace.updateBotError'));
      setCurrentStatus(nextStatus);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('workspace.updateBotError'));
    } finally {
      setBusy(false);
    }
  }

  async function cycle() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bots/${encodeURIComponent(id)}/cycle`, {
        method: 'POST',
        body: '{}',
      });
      if (!response.ok) throw new Error(t('workspace.enqueueCycleError'));
      setMessage(t('workspace.cycleQueued'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('workspace.enqueueCycleError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content-stack">
      {tradingMode === 'PAPER' && currentStatus === 'READY' ? (
        <Button disabled={busy} onClick={() => void change('RUNNING')}>
          {t('workspace.start')}
        </Button>
      ) : null}
      {tradingMode === 'PAPER' && currentStatus === 'RUNNING' ? (
        <>
          <Button disabled={busy} onClick={() => void cycle()}>
            {t('workspace.runCycle')}
          </Button>
          <Button disabled={busy} onClick={() => void change('PAUSED')}>
            {t('workspace.pause')}
          </Button>
        </>
      ) : null}
      {tradingMode === 'PAPER' && currentStatus === 'PAUSED' ? (
        <Button disabled={busy} onClick={() => void change('RUNNING')}>
          {t('workspace.resume')}
        </Button>
      ) : null}
      {tradingMode === 'PAPER' && (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') ? (
        <Button disabled={busy} onClick={() => void change('STOPPED')}>
          {t('workspace.stop')}
        </Button>
      ) : null}
      {message ? (
        <Alert tone="negative" title={t('workspace.botAction')}>
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
