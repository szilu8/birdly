import { useEffect, useState } from 'react';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const POST_LIFE = 24 * HOUR;
export const FADE_START = 20 * HOUR;

/** Másodpercenként (vagy a megadott időközönként) frissülő "most". */
export function useNow(intervalMs = SECOND): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const ts = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

/** Visszaszámláló: "3 ó 12 p", "12 p 5 mp", "40 mp" */
export function formatCountdown(ms: number): string {
  const v = Math.max(0, ms);
  const h = Math.floor(v / HOUR);
  const m = Math.floor((v % HOUR) / MINUTE);
  const s = Math.floor((v % MINUTE) / SECOND);
  if (h >= 48) return `${Math.floor(h / 24)} nap ${h % 24} ó`;
  if (h > 0) return `${h} ó ${m} p`;
  if (m > 0) return `${m} p ${s} mp`;
  return `${s} mp`;
}

/** Időtartam másodpercben → "1 óra", "15 perc", "32 óra" */
export function formatSpan(seconds: number): string {
  if (seconds >= 3600) {
    const h = seconds / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} óra`;
  }
  return `${Math.round(seconds / 60)} perc`;
}

export function formatAgo(ms: number): string {
  if (ms < MINUTE) return 'épp most';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} perce`;
  return `${Math.floor(ms / HOUR)} órája`;
}
