type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memoryStorage = new Map<string, string>();

function createMemoryStorage(): StorageLike {
  return {
    getItem(key) {
      return memoryStorage.get(key) ?? null;
    },
    setItem(key, value) {
      memoryStorage.set(key, value);
    },
    removeItem(key) {
      memoryStorage.delete(key);
    },
  };
}

export const storage: StorageLike =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage
    : createMemoryStorage();

export function readJson<T>(key: string, fallback: T): T {
  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function clearKey(key: string): void {
  storage.removeItem(key);
}
