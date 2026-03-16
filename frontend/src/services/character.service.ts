export interface CharacterProfile {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type CharacterProfileInput = Omit<CharacterProfile, 'id' | 'createdAt' | 'updatedAt'>;

export interface CharacterStore {
  list(): Promise<CharacterProfile[]>;
  get(id: string): Promise<CharacterProfile | undefined>;
  upsert(character: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>>): Promise<CharacterProfile>;
  delete(id: string): Promise<void>;
}

const CHARACTERS_STORAGE_KEY = 'gen-scene-characters';

function nowIso() {
  return new Date().toISOString();
}

export class LocalStorageCharacterStore implements CharacterStore {
  async list(): Promise<CharacterProfile[]> {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as CharacterProfile[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<CharacterProfile | undefined> {
    const chars = await this.list();
    return chars.find((c) => c.id === id);
  }

  async upsert(character: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>>): Promise<CharacterProfile> {
    const current = await this.list();
    const now = nowIso();

    let record: CharacterProfile;
    if (character.id) {
      const existing = current.find((c) => c.id === character.id);
      if (existing) {
        record = {
          ...existing,
          ...character,
          updatedAt: now,
        };
        const updated = current.map((c) => (c.id === record.id ? record : c));
        window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(updated));
        return record;
      }
    }

    record = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()),
      ...character,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...current, record];
    window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(updated));
    return record;
  }

  async delete(id: string): Promise<void> {
    const current = await this.list();
    const updated = current.filter((c) => c.id !== id);
    window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(updated));
  }
}

let store: CharacterStore = new LocalStorageCharacterStore();

export function setCharacterStore(next: CharacterStore) {
  store = next;
}

export async function listCharacters() {
  return store.list();
}

export async function getCharacter(id: string) {
  return store.get(id);
}

export async function upsertCharacter(character: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>>) {
  return store.upsert(character);
}

export async function deleteCharacter(id: string) {
  return store.delete(id);
}
