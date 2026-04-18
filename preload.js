const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  onSyscalls: (callback) => {
    ipcRenderer.on("syscalls", (event, value) => {
      callback(value);
    });
  },
  getPerformanceData: async () => {
    return await ipcRenderer.invoke("get-performance-data");
  },
  getSyscallLatencyDistribution: async () => {
    return await ipcRenderer.invoke("get-syscall-latency-distribution");
  },
  getStackTraces: async () => {
    return await ipcRenderer.invoke("get-stack-traces");
  },
  getProcessTree: () => ipcRenderer.invoke("get-process-tree"),
  startSimulatedSyscalls: (intervalMs) =>
    ipcRenderer.invoke("start-simulated-syscalls", intervalMs),
  stopSimulatedSyscalls: () => ipcRenderer.invoke("stop-simulated-syscalls"),
  getRecentSyscalls: () => ipcRenderer.invoke("get-recent-syscalls"),
  onSimulatedSyscalls: (callback) => {
    ipcRenderer.on("syscalls-simulated", (event, value) => {
      callback(value);
    });
  },
});
