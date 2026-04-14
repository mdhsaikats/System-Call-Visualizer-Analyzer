const { app, BrowserWindow } = require("electron");
const path = require("path");

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load your HTML file
  win.loadFile("renderer/index.html");

  // Maximize window
  win.maximize();

  // Optional: Open DevTools
  // win.webContents.openDevTools();
};

// When Electron is ready
app.whenReady().then(() => {
  createWindow();
  startSysCallMonitor();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function getSystemCalls(callback) {
  exec(
    `powershell "Get-Counter '\\System\\System Calls/sec' | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue"`,
    (err, stdout) => {
      if (err) {
        callback(0);
        return;
      }

      const value = parseFloat(stdout.trim());
      callback(isNaN(value) ? 0 : value);
    },
  );
}

function startSysCallMonitor() {
  setInterval(() => {
    getSystemCalls((value) => {
      if (win && win.webContents) {
        win.webContents.send("syscalls", value);
      }
    });
  }, 1000);
}
