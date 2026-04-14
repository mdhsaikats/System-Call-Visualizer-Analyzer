const { app, BrowserWindow } = require("electron");
const path = require("path");

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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
