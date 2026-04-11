interface ElectronFsAPI {
  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  ensureDir: (dirPath: string) => Promise<void>;
  listDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>;
  exists: (filePath: string) => Promise<boolean>;
}

interface ElectronVaultAPI {
  getPath: () => Promise<string>;
  selectFolder: () => Promise<string | null>;
}

interface ElectronAPI {
  fs: ElectronFsAPI;
  vault: ElectronVaultAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
