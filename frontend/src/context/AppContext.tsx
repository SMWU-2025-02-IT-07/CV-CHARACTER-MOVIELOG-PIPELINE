'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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
  characterData: CharacterData;
  setCharacterData: (data: CharacterData) => void;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  finalVideoUrl: string;
  setFinalVideoUrl: (url: string) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: '',
    who: '',
    where: '',
    what: '',
    how: '',
    image: null,
    imageUrl: '',
  });
  
  const [scenarioId, setScenarioId] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('');

  const resetAll = () => {
    setCharacterData({
      name: '',
      who: '',
      where: '',
      what: '',
      how: '',
      image: null,
      imageUrl: '',
    });
    setScenarioId('');
    setScenes([]);
    setFinalVideoUrl('');
  };

  return (
    <AppContext.Provider value={{
      characterData,
      setCharacterData,
      scenarioId,
      setScenarioId,
      scenes,
      setScenes,
      finalVideoUrl,
      setFinalVideoUrl,
      resetAll,
    }}>
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
