export type SavedPage = 'levelSelect' | 'celebration';

export type SavedFortune = {
  omen: { title: string; verse: string };
  thread: { name: string; color: string; meaning: string };
  role: { name: string; blessing: string };
};

export type SaveData = {
  version: 1;
  updatedAt: number;
  playerName: string;
  mentorId: string | null;
  completedLevels: number[];
  silkFortune: SavedFortune | null;
  page: SavedPage;
};

const SAVE_KEY = 'luanfu-onboarding-save-v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || data.version !== 1) return null;
    if (!Array.isArray(data.completedLevels)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: Omit<SaveData, 'version' | 'updatedAt'>): void {
  const payload: SaveData = {
    ...data,
    version: 1,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function hasSave(): boolean {
  return loadSave() != null;
}

export function formatSaveTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
