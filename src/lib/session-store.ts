/**
 * Client-side session store (localStorage).
 * Holds the space profile, scan history, saved products and compare list.
 * Uploaded images are kept in memory only — never persisted.
 */
import { useCallback, useEffect, useState } from "react";
import type { Scan, SpaceProfile } from "@/types/domain";

const KEY = "kohler-ai-session-v1";

export interface SessionState {
  profile: SpaceProfile | null;
  scans: Scan[];
  saved: string[];
  compare: string[];
}

const EMPTY: SessionState = { profile: null, scans: [], saved: [], compare: [] };

function read(): SessionState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as SessionState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<(s: SessionState) => void>();

function write(next: SessionState) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l(next));
}

export function useSession() {
  const [state, setState] = useState<SessionState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
    const listener = (s: SessionState) => setState(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((patch: Partial<SessionState>) => {
    const next = { ...read(), ...patch };
    write(next);
  }, []);

  const setProfile = useCallback((profile: SpaceProfile) => update({ profile }), [update]);

  const addScan = useCallback(
    (scan: Scan) => {
      const current = read();
      update({ scans: [scan, ...current.scans].slice(0, 20) });
    },
    [update],
  );

  const toggleSaved = useCallback(
    (sku: string) => {
      const current = read();
      update({
        saved: current.saved.includes(sku)
          ? current.saved.filter((s) => s !== sku)
          : [...current.saved, sku],
      });
    },
    [update],
  );

  const toggleCompare = useCallback(
    (sku: string) => {
      const current = read();
      if (current.compare.includes(sku)) {
        update({ compare: current.compare.filter((s) => s !== sku) });
        return true;
      }
      if (current.compare.length >= 3) return false;
      update({ compare: [...current.compare, sku] });
      return true;
    },
    [update],
  );

  const clearCompare = useCallback(() => update({ compare: [] }), [update]);

  return { ...state, hydrated, setProfile, addScan, toggleSaved, toggleCompare, clearCompare };
}
