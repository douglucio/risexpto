'use client';

import { useState } from 'react';

type Item = { id: string; title: string; body: string; readAt?: string | null };

export function NotificationsPanel({ items }: { items: Item[] }) {
  const [notifications, setNotifications] = useState(items);
  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    if (response.ok) setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  }
  return <div className="content-stack">{notifications.map((item) => <article key={item.id} className="rx-card"><h2>{item.title}</h2><p>{item.body}</p>{item.readAt ? <small>Read</small> : <button className="rx-button" onClick={() => { void markRead(item.id); }}>Mark as read</button>}</article>)}</div>;
}
