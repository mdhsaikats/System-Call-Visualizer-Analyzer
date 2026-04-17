const { app, BrowserWindow } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const readline = require("readline");

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

  win.loadFile("renderer/index.html");
  win.maximize();
};

app.whenReady().then(() => {
  createWindow();
  startSysCallMonitor();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// State buffers for real-time trace
let recentSyscallsBuffer = [];
let lastSecondCalls = 0;
let lastSecondLatencySum = 0;
let totalCallsGlobal = 0;
let totalLatencyGlobal = 0;
let errorCountGlobal = 0;

function startPerfTrace() {
  console.log("Starting real perf trace...");
  // Launching perf trace directly. Run the Electron app as root instead of relying on sudo.
  const perf = spawn('perf', ['trace', '-a']);

  perf.on('error', (err) => {
    console.error("Failed to start perf trace. Is 'perf' installed and in PATH?", err);
  });

  const rl = readline.createInterface({
    input: perf.stderr, // perf trace routes its standard output to stderr
    crlfDelay: Infinity
  });

  // Example perf trace format:
  // 3698.225 ( 0.015 ms): node/1234 mmap(...) = 0
  const regex = /^\s*([\d.]+)\s*\(\s*([\d.]+)\s*ms\):\s*([^\/]+)\/(\d+)\s+([a-zA-Z0-9_]+)\((.*)\)\s*=\s*(.*)$/;

  rl.on('line', (line) => {
    const match = line.match(regex);
    if (!match) return;

    const timeRaw = parseFloat(match[1]);
    const latencyMs = parseFloat(match[2]);
    const processName = match[3].trim();
    const pid = match[4];
    const syscall = match[5];
    const argsRaw = match[6];
    const retVal = match[7].trim();

    lastSecondCalls++;
    lastSecondLatencySum += latencyMs;
    totalCallsGlobal++;
    totalLatencyGlobal += latencyMs;

    // Check roughly for error (standard linux return pattern)
    // Often errors are returned as -1 or -ENOENT instead of just negative numbers in some hooks, but perf trace usually formats them with '-E...' or '-1'
    const isError = retVal.startsWith('-') && !retVal.startsWith('-EAGAIN');
    if (isError) errorCountGlobal++;

    const now = new Date();

    recentSyscallsBuffer.unshift({
      time: now.toISOString().substr(11, 12),
      pid: pid,
      process: processName,
      syscall: syscall,
      args: argsRaw.length > 60 ? argsRaw.substring(0, 57) + '...' : argsRaw,
      returnVal: retVal,
      latency: latencyMs.toFixed(3),
      isError: isError,
    });

    if (recentSyscallsBuffer.length > 5) {
      recentSyscallsBuffer.pop();
    }
  });

  perf.on('close', (code) => {
    console.log(`perf trace process exited with code ${code}. Did you run with root permissions?`);
  });
}

function getTopProcesses(callback) {
  // pcpu=CPU%, pid=Id, nlwp=HandleCount(approx via thread count), rss=WorkingSet64(in KB)
  exec(
    `ps -eo comm,pcpu,pid,nlwp,rss --sort=-pcpu | head -n 6`,
    (err, stdout) => {
      if (err) {
        callback([]);
        return;
      }

      try {
        const lines = stdout.trim().split("\n").slice(1);
        const data = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          return {
            Name: parts[0],
            CPU: parseFloat(parts[1]) || 0,
            Id: parseInt(parts[2], 10),
            HandleCount: parseInt(parts[3], 10),
            WorkingSet64: parseInt(parts[4], 10) * 1024,
          };
        });
        callback(data);
      } catch {
        callback([]);
      }
    },
  );
}

function startSysCallMonitor() {
  startPerfTrace();

  setInterval(() => {
    const callsPerSec = lastSecondCalls;
    const currentLatency = callsPerSec > 0 ? (lastSecondLatencySum / callsPerSec) : 0;
    const globalAvgLatency = totalCallsGlobal > 0 ? (totalLatencyGlobal / totalCallsGlobal) : 0;
    const errorRate = totalCallsGlobal > 0 ? (errorCountGlobal / totalCallsGlobal) * 100 : 0;

    // Copy to send via IPC
    const recentSyscalls = [...recentSyscallsBuffer];

    // Reset loop aggregators
    lastSecondCalls = 0;
    lastSecondLatencySum = 0;

    getTopProcesses((processes) => {
      const top3 = processes.slice(0, 3);

      if (win && win.webContents) {
        win.webContents.send("syscalls", {
          callsPerSec: callsPerSec,
          latency: currentLatency,
          avgLatency: globalAvgLatency,
          errorRate: errorRate,
          topProcesses: top3,
          recentSyscalls: recentSyscalls,
        });
      }
    });
  }, 1000);
}
