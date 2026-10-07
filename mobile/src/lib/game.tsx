import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchBirds, fetchEggs, fetchFriends, fetchNextFreeEggAt, fetchSpecies } from './api';
import type { Bird, Egg, FriendEntry, Species } from './types';

/** A bejelentkezett felhasználó madarai, tojásai, ismerősei – több képernyő is használja. */
type GameState = {
  species: Record<string, Species>;
  speciesList: Species[];
  birds: Bird[];
  eggs: Egg[];
  nextFreeEggAt: string | null;
  friends: FriendEntry[];
  loaded: boolean;
  reload: () => Promise<void>;
};

const GameContext = createContext<GameState | null>(null);

const loadAll = () => Promise.all([fetchSpecies(), fetchBirds(), fetchEggs(), fetchNextFreeEggAt(), fetchFriends()]);

export function GameProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [nextFreeEggAt, setNextFreeEggAt] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((data: Awaited<ReturnType<typeof loadAll>>) => {
    const [sp, b, e, next, f] = data;
    setSpeciesList(sp);
    setBirds(b);
    setEggs(e);
    setNextFreeEggAt(next);
    setFriends(f);
    setLoaded(true);
  }, []);

  const reload = useCallback(async () => {
    if (userId) apply(await loadAll());
  }, [userId, apply]);

  // Felhasználóváltáskor a szülő új `key`-jel újra létrehozza a providert, így az állapot tiszta.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadAll()
      .then((data) => {
        if (!cancelled) apply(data);
      })
      .catch((e) => console.warn('Adatok betöltése sikertelen', e));
    return () => {
      cancelled = true;
    };
  }, [userId, apply]);

  const value = useMemo(() => {
    const species = Object.fromEntries(speciesList.map((s) => [s.id, s]));
    return { species, speciesList, birds, eggs, nextFreeEggAt, friends, loaded, reload };
  }, [speciesList, birds, eggs, nextFreeEggAt, friends, loaded, reload]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame csak GameProvider-en belül használható');
  return ctx;
}
