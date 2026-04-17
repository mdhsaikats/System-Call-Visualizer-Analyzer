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
});
