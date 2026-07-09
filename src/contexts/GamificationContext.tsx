import React, { createContext, useContext, useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import {
  subscribeToGamificationState,
  subscribeToPokedex,
  initializeGamificationState,
} from '../services/gamificationService';
import { GamificationState, PokedexEntry, DEFAULT_GAMIFICATION_STATE } from '../types';

const EMPTY_STATE: GamificationState = {
  ...DEFAULT_GAMIFICATION_STATE,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

interface GamificationContextValue {
  state: GamificationState;
  pokedex: PokedexEntry[];
}

const GamificationContext = createContext<GamificationContextValue>({
  state: EMPTY_STATE,
  pokedex: [],
});

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [state, setState] = useState<GamificationState>(EMPTY_STATE);
  const [pokedex, setPokedex] = useState<PokedexEntry[]>([]);

  useEffect(() => {
    const userId = currentUser?.uid;
    if (!userId || !settings.gamificationEnabled) {
      setState(EMPTY_STATE);
      setPokedex([]);
      return;
    }

    initializeGamificationState(userId);
    const unsubState = subscribeToGamificationState(userId, setState);
    const unsubPokedex = subscribeToPokedex(userId, setPokedex);
    return () => {
      unsubState();
      unsubPokedex();
    };
  }, [currentUser?.uid, settings.gamificationEnabled]);

  return (
    <GamificationContext.Provider value={{ state, pokedex }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  return useContext(GamificationContext);
}
