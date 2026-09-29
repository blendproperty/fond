'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

const SOUND_KEY = 'fond.staff.sound';
const NOTIFICATION_KEY = 'fond.staff.notifications';
type SoundState = 'starting' | 'ready' | 'blocked' | 'unavailable';

// A longer, clearly audible chime, with short fades to avoid speaker clicks.
function chime(context: AudioContext) {
  [0, 0.35, 0.7, 1.2, 1.55, 1.9].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + offset;
    oscillator.type = 'triangle';
    oscillator.frequency.value = index % 2 ? 880 : 1175;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.65, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  });
}

export function useStaffAlerts(active: boolean) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundState, setSoundState] = useState<SoundState>('starting');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [alertError, setAlertError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationsAllowed = useRef(true);
  const audio = useRef<AudioContext | null>(null);
  const enabled = useRef(true);
  const activeRef = useRef(active);
  const pending = useRef(false);
  const lastChime = useRef(0);
  activeRef.current = active;

  const play = useCallback(() => {
    if (!enabled.current || !activeRef.current) return;
    const context = audio.current;
    if (!context || context.state !== 'running') {
      pending.current = true;
      setSoundState(context ? 'blocked' : 'unavailable');
      return;
    }
    pending.current = false;
    if (Date.now() - lastChime.current < 2400) return;
    lastChime.current = Date.now();
    chime(context);
  }, []);

  const restore = useCallback(() => {
    if (!enabled.current) return;
    try {
      let context = audio.current;
      if (!context || context.state === 'closed') {
        context = new AudioContext();
        audio.current = context;
        const created = context;
        context.onstatechange = () => {
          if (audio.current !== created) return;
          setSoundState(created.state === 'running' ? 'ready' : 'blocked');
          if (created.state === 'running' && pending.current) play();
        };
      }
      setSoundState(context.state === 'running' ? 'ready' : 'blocked');
      // Do not await: autoplay-blocked resume can remain pending until a tap.
      if (context.state !== 'running') void context.resume().catch(() => {
        if (audio.current === context) setSoundState('blocked');
      });
      else if (pending.current) play();
    } catch { setSoundState('unavailable'); }
  }, [play]);

  useEffect(() => {
    try { enabled.current = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* Keep default on. */ }
    setSoundEnabled(enabled.current);
    try { notificationsAllowed.current = localStorage.getItem(NOTIFICATION_KEY) !== 'off'; } catch {}
    setNotificationsEnabled(notificationsAllowed.current);
    const refreshPermission = () => setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    const restoreVisible = () => {
      if (document.visibilityState === 'visible') { refreshPermission(); restore(); }
    };
    refreshPermission();
    restore();
    // Normal tablet interaction also unlocks/restarts audio after browser suspension.
    document.addEventListener('click', restore);
    document.addEventListener('keydown', restore);
    document.addEventListener('visibilitychange', restoreVisible);
    window.addEventListener('focus', restoreVisible);
    return () => {
      document.removeEventListener('click', restore);
      document.removeEventListener('keydown', restore);
      document.removeEventListener('visibilitychange', restoreVisible);
      window.removeEventListener('focus', restoreVisible);
      const context = audio.current;
      audio.current = null;
      if (context) { context.onstatechange = null; void context.close().catch(() => {}); }
    };
  }, [restore]);

  useEffect(() => {
    if (!active) { pending.current = false; void audio.current?.suspend().catch(() => {}); }
    else restore();
  }, [active, restore]);

  const testSound = useCallback(() => {
    enabled.current = true;
    setSoundEnabled(true);
    try { localStorage.setItem(SOUND_KEY, 'on'); } catch { /* Audio still works this session. */ }
    pending.current = true;
    restore();
  }, [restore]);

  const mute = useCallback(() => {
    enabled.current = false;
    pending.current = false;
    setSoundEnabled(false);
    try { localStorage.setItem(SOUND_KEY, 'off'); } catch { /* Keep this session's choice. */ }
    void audio.current?.suspend().catch(() => {});
  }, []);

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') { setPermission('unsupported'); return; }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      notificationsAllowed.current = result === 'granted';
      setNotificationsEnabled(notificationsAllowed.current);
      try { localStorage.setItem(NOTIFICATION_KEY, notificationsAllowed.current ? 'on' : 'off'); } catch {}
      setAlertError(result === 'denied' ? 'Notifications are blocked. Allow them in the tablet’s app or browser settings.' : '');
    } catch { setAlertError('Could not enable notifications. Check the tablet’s app or browser settings.'); }
  }, []);

  const disableNotifications = useCallback(() => {
    notificationsAllowed.current = false;
    setNotificationsEnabled(false);
    setAlertError('');
    try { localStorage.setItem(NOTIFICATION_KEY, 'off'); } catch {}
  }, []);

  const notify = useCallback(async (orders: {id: string; displayReference: string}[]) => {
    if (!activeRef.current || !notificationsAllowed.current || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      // Android requires persistent notifications through the service worker.
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      for (const order of orders) {
        if (!activeRef.current || !notificationsAllowed.current) return;
        const options: NotificationOptions = {body: `Order ${order.displayReference} is waiting on the staff board.`, tag: `fond-order-${order.id}`, icon: '/icons/icon-192.png', data: {url: '/staff'}};
        if (registration?.active) await registration.showNotification('New FOND order', options);
        else new Notification('New FOND order', options);
      }
    } catch { setAlertError('A tablet notification could not be shown. Keep the order board open and check notification permissions.'); }
  }, []);

  return {soundEnabled, soundState, permission, notificationsEnabled, disableNotifications, alertError, play, notify, testSound, mute, enableNotifications};
}
