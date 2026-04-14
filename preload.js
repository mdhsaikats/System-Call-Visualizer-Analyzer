const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  onSyscalls: (callback) => {
    ipcRenderer.on("syscalls", (event, value) => {
      callback(value);
    });
  },
});
