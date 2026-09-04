'use client';

import { useState } from 'react';
import { Alert, Button } from '@risexpto/ui';

export function BotControls({ id, status, tradingMode }: { id: string; status: string; tradingMode: string }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(nextStatus: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/bots/${encodeURIComponent(id)}/status`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error('Could not update bot status');
      setCurrentStatus(nextStatus);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update bot status'); }
    finally { setBusy(false); }
  }

  async function cycle() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/bots/${encodeURIComponent(id)}/cycle`, { method: 'POST', body: '{}' });
      if (!response.ok) throw new Error('Could not enqueue bot cycle');
      setMessage('Paper cycle queued.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not enqueue bot cycle'); }
    finally { setBusy(false); }
  }

  return (
    <div className="content-stack">
      {tradingMode === 'PAPER' && currentStatus === 'READY' ? <Button disabled={busy} onClick={() => change('RUNNING')}>Start</Button> : null}
      {tradingMode === 'PAPER' && currentStatus === 'RUNNING' ? <>
        <Button disabled={busy} onClick={cycle}>Run cycle</Button>
        <Button disabled={busy} onClick={() => change('PAUSED')}>Pause</Button>
        </> : null}
      {tradingMode === 'PAPER' && currentStatus === 'PAUSED' ? <Button disabled={busy} onClick={() => change('RUNNING')}>Resume</Button> : null}
      {tradingMode === 'PAPER' && (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') ? <Button disabled={busy} onClick={() => change('STOPPED')}>Stop</Button> : null}
      {message ? <Alert tone="negative" title="Bot action">{message}</Alert> : null}
    </div>
  );
}
