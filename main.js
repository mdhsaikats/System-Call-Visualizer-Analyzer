const { app, BrowserWindow } = require("electron");
const path = require("path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets/icon.png"),
  });

  win.loadFile("renderer/index.html");
};

app.whenReady().then(() => {
  createWindow();
});
