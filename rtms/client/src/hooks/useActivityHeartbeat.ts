import { useEffect, useRef } from 'react';
import api from '@/lib/api';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

/*
 * Tells the server this user is actively working. The tablet
 * sign page only works while a staff member is active.
 */
export function useActivityHeartbeat(enabled: boolean) {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const beat = () => {
      if (Date.now() - lastActivityRef.current > HEARTBEAT_INTERVAL_MS) {
        return;
      }

      api.post('/auth/heartbeat').catch((err) => {
        console.error('Failed to send activity heartbeat', err);
      });
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive));
    beat();

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, [enabled]);
}
