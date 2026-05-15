type StorageChangeMap = Record<string, chrome.storage.StorageChange>;

type ExtensionApi = {
  runtime: {
    onInstalled: {
      addListener(callback: () => void): void;
    };
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
    };
    onChanged: {
      addListener(
        callback: (changes: StorageChangeMap, areaName: string) => void
      ): void;
    };
  };
};

type BrowserGlobal = typeof globalThis & {
  browser?: ExtensionApi;
  chrome?: typeof chrome;
};

const globals = globalThis as BrowserGlobal;

export const extensionApi = (globals.browser ?? globals.chrome) as ExtensionApi;
