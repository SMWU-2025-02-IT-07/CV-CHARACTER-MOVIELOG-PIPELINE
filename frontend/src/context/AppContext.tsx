'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type {
  CharacterProfile,
  CharacterProfileInput,
} from '@/services/character.service';
import {
  deleteCharacter,
  listCharacters,
  upsertCharacter,
} from '@/services/character.service';
import { Dispatch, SetStateAction } from 'react';

interface CharacterData {
  name: string;
  who: string;
  where: string;
  what: string;
  how: string;
  image: File | null;
  imageUrl: string;
}

interface Scene {
  id: number;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  title?: string;
  duration: number;
}

interface AppContextType {
  hydrated: boolean;
  characterData: CharacterData;
  setCharacterData: Dispatch<SetStateAction<CharacterData>>;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  finalVideoUrl: string;
  setFinalVideoUrl: (url: string) => void;
  characters: CharacterProfile[];
  loadCharacters: () => Promise<void>;
  saveCharacter: (input: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>>) => Promise<CharacterProfile>;
  deleteCharacter: (id: string) => Promise<void>;
  resetAll: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const APP_STATE_STORAGE_KEY = 'gen-scene-app-state';

const defaultCharacterData: CharacterData = {
  name: '',
  who: '',
  where: '',
  what: '',
  how: '',
  image: null,
  imageUrl: '',
};

interface PersistedAppState {
  characterData: Omit<CharacterData, 'image'>;
  scenarioId: string;
  scenes: Scene[];
  finalVideoUrl: string;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [characterData, setCharacterData] = useState<CharacterData>(defaultCharacterData);
  const [scenarioId, setScenarioId] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('');
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);

  const loadCharacters = useCallback(async () => {
    try {
      const list = await listCharacters();
      setCharacters(list);
    } catch (error) {
      console.error('Failed to load saved characters:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const saved = JSON.parse(raw) as Partial<PersistedAppState>;

      if (saved.characterData) {
        setCharacterData({
          ...defaultCharacterData,
          ...saved.characterData,
          image: null,
        });
      }
      if (saved.scenarioId) {
        setScenarioId(saved.scenarioId);
      }
      if (Array.isArray(saved.scenes)) {
        setScenes(saved.scenes);
      }
      if (typeof saved.finalVideoUrl === 'string') {
        setFinalVideoUrl(saved.finalVideoUrl);
      }
    } catch (error) {
      console.error('Failed to restore app state:', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const stateToPersist: PersistedAppState = {
      characterData: {
        name: characterData.name,
        who: characterData.who,
        where: characterData.where,
        what: characterData.what,
        how: characterData.how,
        imageUrl: characterData.imageUrl,
      },
      scenarioId,
      scenes,
      finalVideoUrl,
    };

    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [hydrated, characterData, scenarioId, scenes, finalVideoUrl]);

  useEffect(() => {
    if (!hydrated) return;
    loadCharacters();
  }, [hydrated]);

  const saveCharacter = useCallback(
    async (input: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>>) => {
      const saved = await upsertCharacter(input);
      setCharacters((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    },
    []
  );

  const removeCharacter = useCallback(async (id: string) => {
    await deleteCharacter(id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetAll = () => {
    setCharacterData(defaultCharacterData);
    setScenarioId('');
    setScenes([]);
    setFinalVideoUrl('');
    window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
  };

  return (
    <AppContext.Provider
      value={{
        hydrated,
        characterData,
        setCharacterData,
        scenarioId,
        setScenarioId,
        scenes,
        setScenes,
        finalVideoUrl,
        setFinalVideoUrl,
        characters,
        loadCharacters,
        saveCharacter,
        deleteCharacter: removeCharacter,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
