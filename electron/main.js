const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const http = require("http");

const isDev = process.env.NODE_ENV === "development";
const PORT = 3000;

let mainWindow;
let serverProcess;

// ─── Vault path (persisted in a simple JSON config) ───
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

async function getVaultPath() {
  const config = await loadConfig();
  return config.vaultPath || process.env.OBSIDIAN_VAULT_PATH || "G:\\Meu Drive\\Obsidian";
}

// ─── IPC Handlers ───

ipcMain.handle("fs:read-file", async (_event, filePath) => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
});

ipcMain.handle("fs:write-file", async (_event, filePath, content) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
});

ipcMain.handle("fs:ensure-dir", async (_event, dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
});

ipcMain.handle("fs:list-dir", async (_event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
});

ipcMain.handle("fs:exists", async (_event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("vault:get-path", async () => {
  return await getVaultPath();
});

ipcMain.handle("vault:select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Selecionar Vault do Obsidian",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selected = result.filePaths[0];
  const config = await loadConfig();
  config.vaultPath = selected;
  await saveConfig(config);
  return selected;
});

// ─── Server ───

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) resolve();
          else if (Date.now() - start > timeout) reject(new Error("Timeout"));
          else setTimeout(check, 300);
        })
        .on("error", () => {
          if (Date.now() - start > timeout) reject(new Error("Timeout"));
          else setTimeout(check, 300);
        });
    };
    check();
  });
}

function startNextServer() {
  if (isDev) return Promise.resolve();

  const serverDir = path.join(__dirname, "..", ".next", "standalone");
  const serverScript = path.join(serverDir, "server.js");

  return new Promise((resolve, reject) => {
    serverProcess = spawn(process.execPath, [serverScript], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(PORT), HOSTNAME: "localhost" },
      stdio: "pipe",
    });

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[Next.js]", msg);
      if (msg.includes("Ready") || msg.includes("started")) resolve();
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[Next.js]", data.toString());
    });

    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) console.error(`Next.js exited with code ${code}`);
    });

    setTimeout(() => {
      waitForServer(`http://localhost:${PORT}`).then(resolve).catch(reject);
    }, 1000);
  });
}

// ─── Window ───

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Meu Consultório",
    icon: path.join(__dirname, "..", "public", "icon-allos.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.on("ready", async () => {
  try {
    await startNextServer();
    await waitForServer(`http://localhost:${PORT}`);
    createWindow();
  } catch (err) {
    console.error("Failed to start:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
