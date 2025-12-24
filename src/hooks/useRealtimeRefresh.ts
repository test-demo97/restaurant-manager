import { useEffect } from 'react';

export function useRealtimeRefresh(handler: () => any | Promise<any>, events?: string[]) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const evs = events && events.length > 0 ? events : [
      'orders-updated',
      'table-sessions-updated',
      'reservations-updated',
      'tables-updated',
      'settings-updated',
    ];

    const fn = () => {
      try {
        // Call the handler but don't await (handler can be async)
        void handler();
      } catch (e) {
        // ignore
      }
    };

    for (const e of evs) window.addEventListener(e, fn);
    return () => {
      for (const e of evs) window.removeEventListener(e, fn);
    };
  }, [handler, JSON.stringify(events || [])]);
}
