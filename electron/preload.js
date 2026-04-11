const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  fs: {
    readFile: (filePath) => ipcRenderer.invoke("fs:read-file", filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke("fs:write-file", filePath, content),
    ensureDir: (dirPath) => ipcRenderer.invoke("fs:ensure-dir", dirPath),
    listDir: (dirPath) => ipcRenderer.invoke("fs:list-dir", dirPath),
    exists: (filePath) => ipcRenderer.invoke("fs:exists", filePath),
  },
  vault: {
    getPath: () => ipcRenderer.invoke("vault:get-path"),
    selectFolder: () => ipcRenderer.invoke("vault:select-folder"),
  },
});
