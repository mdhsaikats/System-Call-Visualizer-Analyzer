const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const readline = require("readline");
const os = require("os");

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

let win;
let straceProcess = null;

// ======= Performance Code ========
// Performance data collection utilities
const perfCollector = {
  previousCpuUsage: null,
  lastDiskStats: null,
  lastNetStats: null,

  getCpuUsage: async () => {
    return new Promise((resolve) => {
      // macOS: Get CPU usage from top command
      if (process.platform === "darwin") {
        exec("top -b -l 1 -n 1 | head -n 4", (err, stdout) => {
          if (err) {
            resolve(0);
            return;
          }
          const lines = stdout.split("\n");
          for (let line of lines) {
            if (line.includes("CPU usage")) {
              const match = line.match(/CPU usage: (\d+)% user/);
              if (match) {
                resolve(parseFloat(match[1]));
                return;
              }
            }
          }
          // Fallback: use os.loadavg()
          const loadAvg = os.loadavg()[0];
          const cpuCount = os.cpus().length;
          resolve(Math.min((loadAvg / cpuCount) * 100, 100));
        });
      } else {
        // Linux fallback
        exec("grep 'cpu ' /proc/stat", (err, stdout) => {
          if (err) {
            resolve(0);
            return;
          }
          const parts = stdout.split(/\s+/);
          if (parts.length >= 5) {
            const user = parseInt(parts[1]);
            const nice = parseInt(parts[2]);
            const system = parseInt(parts[3]);
            const idle = parseInt(parts[4]);
            const total = user + nice + system + idle;
            const usage = ((total - idle) / total) * 100;
            resolve(Math.min(usage, 100));
          } else {
            resolve(0);
          }
        });
      }
    });
  },

  getMemoryUsage: async () => {
    return new Promise((resolve) => {
      if (process.platform === "darwin") {
        exec("vm_stat", (err, stdout) => {
          if (err) {
            const freeMemory = os.freemem();
            const totalMemory = os.totalmem();
            const usedMemory = totalMemory - freeMemory;
            const percentage = (usedMemory / totalMemory) * 100;
            resolve({
              used: usedMemory,
              total: totalMemory,
              percentage: percentage,
              cached: 0,
            });
            return;
          }

          try {
            const lines = stdout.split("\n");
            const totalMemory = os.totalmem();
            let freePages = 0;
            let wiredPages = 0;
            let activePages = 0;

            for (let line of lines) {
              if (line.includes("Pages free")) {
                const match = line.match(/(\d+)\./);
                freePages = parseInt(match[1]) * 4096 || 0;
              }
              if (line.includes("Pages wired down")) {
                const match = line.match(/(\d+)\./);
                wiredPages = parseInt(match[1]) * 4096 || 0;
              }
              if (line.includes("Pages active")) {
                const match = line.match(/(\d+)\./);
                activePages = parseInt(match[1]) * 4096 || 0;
              }
            }

            const usedMemory = totalMemory - freePages;
            const percentage = (usedMemory / totalMemory) * 100;

            resolve({
              used: usedMemory,
              total: totalMemory,
              percentage: Math.min(percentage, 100),
              cached: 0,
            });
          } catch (e) {
            resolve({
              used: totalMemory * 0.7,
              total: totalMemory,
              percentage: 70,
              cached: 0,
            });
          }
        });
      } else {
        // Linux
        exec("grep MemAvailable /proc/meminfo", (err, stdout) => {
          if (err) {
            const total = os.totalmem();
            const free = os.freemem();
            resolve({
              used: total - free,
              total: total,
              percentage: ((total - free) / total) * 100,
              cached: 0,
            });
            return;
          }

          const freeMemory = os.freemem();
          const totalMemory = os.totalmem();
          const usedMemory = totalMemory - freeMemory;
          resolve({
            used: usedMemory,
            total: totalMemory,
            percentage: (usedMemory / totalMemory) * 100,
            cached: 0,
          });
        });
      }
    });
  },

  getDiskIO: async () => {
    return new Promise((resolve) => {
      const now = Date.now();
      if (process.platform === "darwin") {
        exec("iostat -c 2 -w 1 -d disk0 | tail -n 1", (err, stdout) => {
          if (err) return resolve({ read: 0, write: 0 });
          const parts = stdout.trim().split(/\s+/);
          resolve({
            read: parseFloat(parts[0]) || 0,
            write: parseFloat(parts[1]) || 0,
          });
        });
      } else {
        // Linux: Parse /proc/diskstats for real-time reads/writes
        exec(
          "cat /proc/diskstats | awk '{read+=$6; write+=$10} END {print read, write}'",
          (err, stdout) => {
            if (err) return resolve({ read: 0, write: 0 });

            const parts = stdout.trim().split(/\s+/);
            const currentReadSectors = parseInt(parts[0]) || 0;
            const currentWriteSectors = parseInt(parts[1]) || 0;
            // Sector size is typically 512 bytes
            const currentReadBytes = currentReadSectors * 512;
            const currentWriteBytes = currentWriteSectors * 512;

            let readRate = 0,
              writeRate = 0;

            if (perfCollector.lastDiskStats) {
              const timeDiff = (now - perfCollector.lastDiskStats.time) / 1000;
              if (timeDiff > 0) {
                readRate =
                  (currentReadBytes - perfCollector.lastDiskStats.read) /
                  timeDiff;
                writeRate =
                  (currentWriteBytes - perfCollector.lastDiskStats.write) /
                  timeDiff;
              }
            }

            perfCollector.lastDiskStats = {
              time: now,
              read: currentReadBytes,
              write: currentWriteBytes,
            };

            resolve({
              read: Math.max(0, readRate / 1024), // Return in KB/s
              write: Math.max(0, writeRate / 1024),
            });
          },
        );
      }
    });
  },

  getNetworkStats: async () => {
    return new Promise((resolve) => {
      const now = Date.now();
      if (process.platform === "darwin") {
        exec(
          "netstat -ib | grep -e 'en[0-9]' | head -n 1 | awk '{print $7, $10}'",
          (err, stdout) => {
            if (err) return resolve({ inbound: 0, outbound: 0 });
            const parts = stdout.trim().split(/\s+/);
            resolve({
              inbound: parseFloat(parts[0]) || 0,
              outbound: parseFloat(parts[1]) || 0,
            });
          },
        );
      } else {
        // Linux: Parse /proc/net/dev for real-time packet info
        exec(
          "cat /proc/net/dev | awk 'NR>2 {inbound+=$2; outbound+=$10} END {print inbound, outbound}'",
          (err, stdout) => {
            if (err) return resolve({ inbound: 0, outbound: 0 });

            const parts = stdout.trim().split(/\s+/);
            const currentIn = parseInt(parts[0]) || 0;
            const currentOut = parseInt(parts[1]) || 0;

            let inRate = 0,
              outRate = 0;

            if (perfCollector.lastNetStats) {
              const timeDiff = (now - perfCollector.lastNetStats.time) / 1000;
              if (timeDiff > 0) {
                inRate =
                  (currentIn - perfCollector.lastNetStats.inbound) / timeDiff;
                outRate =
                  (currentOut - perfCollector.lastNetStats.outbound) / timeDiff;
              }
            }

            perfCollector.lastNetStats = {
              time: now,
              inbound: currentIn,
              outbound: currentOut,
            };

            resolve({
              inbound: Math.max(0, inRate / 1024), // Return in KB/s
              outbound: Math.max(0, outRate / 1024),
            });
          },
        );
      }
    });
  },

  getTopCPUProcesses: async () => {
    return new Promise((resolve) => {
      if (process.platform === "darwin") {
        exec("ps -eo pid,comm,%cpu,%mem -r | head -n 6", (err, stdout) => {
          if (err) {
            resolve([]);
            return;
          }
          try {
            const lines = stdout.trim().split("\n").slice(1);
            const processes = lines
              .map((line) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4) {
                  return {
                    pid: parts[0],
                    name: parts[1],
                    cpu: parseFloat(parts[2]),
                    memory: parseFloat(parts[3]),
                  };
                }
                return null;
              })
              .filter((p) => p !== null);
            resolve(processes.slice(0, 10));
          } catch (e) {
            resolve([]);
          }
        });
      } else {
        exec("ps aux --sort=-%cpu | head -n 11 | tail -n 10", (err, stdout) => {
          if (err) {
            resolve([]);
            return;
          }
          try {
            const lines = stdout.trim().split("\n");
            const processes = lines
              .map((line) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 11) {
                  return {
                    pid: parts[1],
                    name: parts[10],
                    cpu: parseFloat(parts[2]),
                    memory: parseFloat(parts[3]),
                  };
                }
                return null;
              })
              .filter((p) => p !== null);
            resolve(processes);
          } catch (e) {
            resolve([]);
          }
        });
      }
    });
  },

  getStackTraces: async () => {
    return new Promise((resolve) => {
      if (process.platform === "darwin") {
        // macOS: Use sample command to get stack traces
        exec(
          "sample -n 1000 -o /tmp/sample.txt 2>/dev/null; cat /tmp/sample.txt",
          { maxBuffer: 10 * 1024 * 1024 },
          (err, stdout) => {
            if (err) {
              resolve(buildFlameGraphData([]));
              return;
            }

            try {
              const stacks = parseStackTraces(stdout);
              resolve(stacks);
            } catch (e) {
              resolve(buildFlameGraphData([]));
            }
          },
        );
      } else {
        // Linux: Use perf if available
        exec(
          "perf record -F 100 -p $$ -- sleep 1 2>/dev/null && perf report --stdio 2>/dev/null | head -n 50",
          { maxBuffer: 10 * 1024 * 1024 },
          (err, stdout) => {
            if (err) {
              resolve(buildFlameGraphData([]));
              return;
            }

            try {
              const stacks = parseStackTraces(stdout);
              resolve(stacks);
            } catch (e) {
              resolve(buildFlameGraphData([]));
            }
          },
        );
      }
    });
  },
};

// Helper functions for stack trace parsing
function parseStackTraces(output) {
  const stacks = {};
  const lines = output.split("\n");

  for (const line of lines) {
    // Match common kernel/system function names
    const match = line.match(/\s+([a-zA-Z0-9_]+)\s+\[.*\]\s*([\d.]+)%/);
    if (match) {
      const func = match[1];
      const percent = parseFloat(match[2]) || 0;

      if (!stacks[func]) {
        stacks[func] = percent;
      } else {
        stacks[func] += percent;
      }
    }
  }

  // Convert to structured format
  const stackArray = Object.entries(stacks)
    .map(([name, percent]) => ({ name, percent }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 15); // Top 15 functions

  return buildFlameGraphData(stackArray);
}

function buildFlameGraphData(functions) {
  const totalPercent = functions.reduce((sum, f) => sum + f.percent, 0);

  // Root level
  const result = {
    root: {
      name: "all",
      percent: 100,
      width: 100,
    },
    level1: [],
    level2: [],
    level3: [],
  };

  if (functions.length === 0) return result;

  // Level 1: Split between system and user space
  let sysPercent = 0;
  let userPercent = 0;

  functions.forEach((f) => {
    if (
      f.name.includes("sys_") ||
      f.name.includes("vfs_") ||
      f.name.includes("tcp_") ||
      f.name.includes("ext4_")
    ) {
      sysPercent += f.percent;
    } else {
      userPercent += f.percent;
    }
  });

  if (sysPercent > 0) {
    result.level1.push({
      name: "sys_entry",
      percent: Math.round(sysPercent),
      width: (sysPercent / totalPercent) * 100,
    });
  }

  if (userPercent > 0) {
    result.level1.push({
      name: "user_space",
      percent: Math.round(userPercent),
      width: (userPercent / totalPercent) * 100,
    });
  }

  // Level 2 & 3: Detailed functions
  functions.forEach((f, idx) => {
    const width = (f.percent / totalPercent) * 100;

    if (idx < 4) {
      result.level2.push({
        name: f.name,
        percent: Math.round(f.percent),
        width: width,
        color: idx === 0 ? "high" : idx === 1 ? "medium" : "low",
      });
    } else if (idx < 8) {
      result.level3.push({
        name: f.name,
        percent: Math.round(f.percent),
        width: width,
        color: idx % 3 === 0 ? "high" : idx % 3 === 1 ? "medium" : "low",
      });
    }
  });

  return result;
}

// Syscall latency distribution data
let latencyHistory = [];
let latencyBuckets = {
  epoll: [],
  read: [],
  write: [],
  futex: [],
  open: [],
  fsync: [],
  mmap: [],
};

// Function to track syscall latencies
function trackSyscallLatency(syscallName, latencyMs) {
  // Categorize syscalls into buckets
  let category = "other";

  if (syscallName.includes("epoll")) category = "epoll";
  else if (syscallName.includes("read")) category = "read";
  else if (syscallName.includes("write")) category = "write";
  else if (syscallName.includes("futex")) category = "futex";
  else if (syscallName.includes("open")) category = "open";
  else if (syscallName.includes("fsync")) category = "fsync";
  else if (syscallName.includes("mmap")) category = "mmap";

  if (latencyBuckets[category]) {
    latencyBuckets[category].push(latencyMs);

    // Keep only last 1000 samples per bucket to avoid memory issues
    if (latencyBuckets[category].length > 1000) {
      latencyBuckets[category].shift();
    }
  }
}

// Function to calculate percentiles
function calculatePercentile(data, percentile) {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Function to get syscall latency distribution
function getSyscallLatencyDistribution() {
  const distribution = {};

  for (const [syscall, latencies] of Object.entries(latencyBuckets)) {
    if (latencies.length > 0) {
      distribution[syscall] = {
        count: latencies.length,
        p50: calculatePercentile(latencies, 50),
        p95: calculatePercentile(latencies, 95),
        p99: calculatePercentile(latencies, 99),
        avg: latencies.reduce((a, b) => a + b) / latencies.length,
        max: Math.max(...latencies),
        min: Math.min(...latencies),
      };
    } else {
      distribution[syscall] = {
        count: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        max: 0,
        min: 0,
      };
    }
  }

  return distribution;
}

// ===== IPC Handlers for Performance Data =====
ipcMain.handle("get-performance-data", async () => {
  try {
    const [cpuUsage, memoryUsage, diskIO, networkStats, topProcesses] =
      await Promise.all([
        perfCollector.getCpuUsage(),
        perfCollector.getMemoryUsage(),
        perfCollector.getDiskIO(),
        perfCollector.getNetworkStats(),
        perfCollector.getTopCPUProcesses(),
      ]);

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskIO,
      network: networkStats,
      topProcesses: topProcesses,
      timestamp: new Date(),
    };
  } catch (err) {
    console.error("Error collecting performance data:", err);
    return {
      cpu: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      disk: { read: 0, write: 0 },
      network: { inbound: 0, outbound: 0 },
      topProcesses: [],
      timestamp: new Date(),
    };
  }
});

ipcMain.handle("get-syscall-latency-distribution", async () => {
  try {
    return getSyscallLatencyDistribution();
  } catch (err) {
    console.error("Error getting syscall latency distribution:", err);
    return {
      epoll: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      read: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      write: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      futex: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      open: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      fsync: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
      mmap: { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 },
    };
  }
});

ipcMain.handle("get-stack-traces", async () => {
  try {
    return await perfCollector.getStackTraces();
  } catch (err) {
    console.error("Error getting stack traces:", err);
    return buildFlameGraphData([]);
  }
});

// ====== Performance Code End =====

// ===== Dashboards Code =====

// ===== State buffers for real-time trace =====
let recentSyscallsBuffer = [];
let lastSecondCalls = 0;
let lastSecondLatencySum = 0;
let totalCallsGlobal = 0;
let totalLatencyGlobal = 0;
let errorCountGlobal = 0;

//for chart
let ioCountSecond = 0;
let netCountSecond = 0;

function startPerfTrace() {
  console.log("Starting real perf trace...");
  // Changed from hardcoded ubuntu-specific path to standard system path
  const perf = spawn("pkexec", ["perf", "trace", "-a"]);

  perf.on("error", (err) => {
    console.error(
      "Failed to start perf trace. Is 'perf' installed and in PATH?",
      err,
    );
  });

  const rl = readline.createInterface({
    input: perf.stderr, // perf trace routes its standard output to stderr
    crlfDelay: Infinity,
  });

  // Example perf trace format:
  // 3698.225 ( 0.015 ms): node/1234 mmap(...) = 0
  const regex =
    /^\s*([\d.]+)\s*\(\s*([\d.]+)\s*ms\):\s*([^\/]+)\/(\d+)\s+([a-zA-Z0-9_]+)\((.*)\)\s*=\s*(.*)$/;

  rl.on("line", (line) => {
    const match = line.match(regex);
    if (!match) return;

    const timeRaw = parseFloat(match[1]);
    const latencyMs = parseFloat(match[2]);
    const processName = match[3].trim();
    const pid = match[4];
    const syscall = match[5];
    const argsRaw = match[6];
    const retVal = match[7].trim();

    if (syscall.includes("read") || syscall.includes("write")) {
      ioCountSecond++;
    } else if (
      syscall.includes("recv") ||
      syscall.includes("send") ||
      syscall.includes("socket") ||
      syscall.includes("connect")
    ) {
      netCountSecond++;
    }

    lastSecondCalls++;
    lastSecondLatencySum += latencyMs;
    totalCallsGlobal++;
    totalLatencyGlobal += latencyMs;

    // Track syscall latency distribution
    trackSyscallLatency(syscall, latencyMs);

    // Check roughly for error (standard linux return pattern)
    // Often errors are returned as -1 or -ENOENT instead of just negative numbers in some hooks, but perf trace usually formats them with '-E...' or '-1'
    const isError = retVal.startsWith("-") && !retVal.startsWith("-EAGAIN");
    if (isError) errorCountGlobal++;

    const now = new Date();

    recentSyscallsBuffer.unshift({
      time: now.toISOString().substr(11, 12),
      pid: pid,
      process: processName,
      syscall: syscall,
      args: argsRaw.length > 60 ? argsRaw.substring(0, 57) + "..." : argsRaw,
      returnVal: retVal,
      latency: latencyMs.toFixed(3),
      isError: isError,
    });

    if (recentSyscallsBuffer.length > 5) {
      recentSyscallsBuffer.pop();
    }
  });

  perf.on("close", (code) => {
    console.log(
      `perf trace process exited with code ${code}. Did you run with root permissions?`,
    );
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
    const currentLatency =
      callsPerSec > 0 ? lastSecondLatencySum / callsPerSec : 0;
    const globalAvgLatency =
      totalCallsGlobal > 0 ? totalLatencyGlobal / totalCallsGlobal : 0;
    const errorRate =
      totalCallsGlobal > 0 ? (errorCountGlobal / totalCallsGlobal) * 100 : 0;

    // Copy to send via IPC
    const recentSyscalls = [...recentSyscallsBuffer];

    // Grab the counts and reset them for the next second
    const currentIo = ioCountSecond;
    const currentNet = netCountSecond;
    ioCountSecond = 0;
    netCountSecond = 0;

    // Reset loop aggregators
    lastSecondCalls = 0;
    lastSecondLatencySum = 0;

    getTopProcesses((processes) => {
      const top3 = processes.slice(0, 3);

      // --- Anomaly Detection Logic ---
      const activeAnomalies = [];
      // High Error Rate (> 5%)
      if (errorRate > 5) {
        activeAnomalies.push({
          title: "High Error Rate",
          description: `Kernel returning errors for ${errorRate.toFixed(1)}% of calls.`,
        });
      }
      // Latency Spike (> 10ms average per second)
      if (currentLatency > 10) {
        activeAnomalies.push({
          title: "Latency Spike",
          description: `Syscall latency jumped to ${currentLatency.toFixed(2)}ms.`,
        });
      }
      // Syscall Storm (> 8000 calls/sec)
      if (callsPerSec > 8000) {
        activeAnomalies.push({
          title: "Syscall Storm Detected",
          description: `Unusual volume: ${callsPerSec} calls/sec.`,
        });
      }

      if (win && win.webContents) {
        win.webContents.send("syscalls", {
          callsPerSec: callsPerSec,
          latency: currentLatency,
          avgLatency: globalAvgLatency,
          errorRate: errorRate,
          topProcesses: top3,
          recentSyscalls: recentSyscalls,
          ioCount: currentIo,
          networkCount: currentNet,
          anomalies: activeAnomalies,
        });
      }
    });
  }, 1000);
}

// ======== Dashboard Code End ==========

// ===== Process Tree =====

// Helper to calculate uptime string (HH:MM:SS) from elapsed seconds
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Helper to build the nested tree from a flat list
function buildProcessTree(processes) {
  const map = {};
  const roots = [];

  processes.forEach((p) => (map[p.pid] = { ...p, children: [] }));

  processes.forEach((p) => {
    if (map[p.ppid] && p.ppid !== p.pid) {
      map[p.ppid].children.push(map[p.pid]);
    } else {
      roots.push(map[p.pid]);
    }
  });

  return roots;
}

async function getLinuxProcessData() {
  return new Promise((resolve) => {
    // Linux ps command grabbing: PID, PPID, USER, GROUP, NICE, THREADS, ELAPSED SECONDS, CPU%, MEM%, STAT, COMMAND_NAME, FULL_ARGS
    const cmd =
      "ps -eo pid,ppid,user,group,ni,nlwp,etimes,%cpu,%mem,stat,comm,args --no-headers";

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
      if (err) {
        resolve({ tree: [], flat: [], stats: {} });
        return;
      }

      try {
        const processes = [];
        const stats = { total: 0, threads: 0, running: 0, sleeping: 0 };

        stdout
          .trim()
          .split("\n")
          .forEach((line) => {
            // Robust regex to split the first 11 columns and group the rest into the full argument string
            const match = line
              .trim()
              .match(
                /^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)\s+(\S+)\s+(.*)$/,
              );
            if (!match) return;

            const p = {
              pid: parseInt(match[1]),
              ppid: parseInt(match[2]),
              user: match[3],
              group: match[4],
              nice: parseInt(match[5]),
              threads: parseInt(match[6]),
              uptime: formatUptime(parseInt(match[7])),
              cpu: parseFloat(match[8]),
              memory: parseFloat(match[9]),
              state: match[10],
              name: match[11],
              args: match[12],
            };

            processes.push(p);

            // Update overall stats
            stats.total++;
            stats.threads += p.threads;
            if (p.state.startsWith("R")) stats.running++;
            else if (p.state.startsWith("S")) stats.sleeping++;
          });

        resolve({
          tree: buildProcessTree(processes),
          flat: processes,
          stats: stats,
        });
      } catch (e) {
        console.error("Failed to parse process data:", e);
        resolve({ tree: [], flat: [], stats: {} });
      }
    });
  });
}

// Register the IPC handler
ipcMain.handle("get-process-tree", async () => {
  return await getLinuxProcessData();
});

// ========== Process Tree Code End =================

/*----------------------------------------------------*/
//System Calls code
/*----------------------------------------------------*/

ipcMain.on("start-trace", (event, targetPid) => {
  if (straceProcess) {
    event.reply("trace-error", "Trace already in progress");
    return; // Already tracing
  }

  // If no PID is provided, trace the current Electron main process
  const pidToTrace = targetPid || process.pid;

  // strace flags:
  // -f : follow child processes
  // -tt : microsecond timestamps
  // -T : time spent in syscall
  // -p : attach to PID
  // -e trace=all : trace all syscalls
  try {
    straceProcess = spawn("strace", ["-f", "-tt", "-T", "-p", pidToTrace], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    straceProcess.on("error", (err) => {
      console.error("Failed to spawn strace:", err.message);
      event.reply("trace-error", `Failed to start strace: ${err.message}`);
      straceProcess = null;
    });

    // strace outputs to stderr, not stdout
    straceProcess.stderr.on("data", (data) => {
      const lines = data.toString().split("\n");

      lines.forEach((line) => {
        if (!line.trim()) return;

        // Skip non-syscall lines (signals, unfinished, resumed, etc.)
        if (
          line.includes("+++") ||
          line.includes("---") ||
          line.includes("resumed") ||
          line.includes("unfinished")
        ) {
          return;
        }

        // Updated regex to optionally capture the `[pid XXX]` flag generated by `-f`
        // Standard: timestamp [pid 1234] syscall(args) = return <time>
        // Example: 14:22:01.045892 [pid 12345] futex(0x7f, FUTEX_WAIT, 0, NULL) = -11 EAGAIN <0.001240>
        const match = line.match(
          /^(\d{2}:\d{2}:\d{2}\.\d+)\s+(?:\[pid\s+(\d+)\]\s+)?([a-zA-Z0-9_]+)\((.*?)\)\s+=\s+(.*?)(?:\s+<([0-9.]+)>)?$/,
        );

        if (match) {
          try {
            const timestamp = match[1];
            // If the pid is in the log (due to -f) use it, otherwise use the target PID
            const parsedPid = match[2] || String(pidToTrace);
            const syscallName = match[3];
            const argsRaw = match[4];
            const returnVal = match[5].trim();
            const latencyStr = match[6];

            let latencyMs = "N/A";
            if (latencyStr) {
              const latency = parseFloat(latencyStr);
              // strace outputs latency in seconds, convert to milliseconds
              latencyMs = (latency * 1000).toFixed(3);
            }

            const syscallData = {
              timestamp: timestamp,
              cpu: "CPU0", // strace doesn't easily provide CPU core without perf
              pid: parsedPid,
              syscall: syscallName,
              args:
                argsRaw.length > 100
                  ? argsRaw.substring(0, 97) + "..."
                  : argsRaw,
              returnValue: returnVal,
              latency: latencyMs,
              isError: returnVal.startsWith("-"),
            };

            if (win && win.webContents && !win.isDestroyed()) {
              win.webContents.send("syscall-data", syscallData);
            }
          } catch (parseErr) {
            console.error("Error parsing syscall data:", parseErr);
          }
        }
      });
    });

    straceProcess.stderr.on("error", (err) => {
      console.error("strace stderr error:", err);
      event.reply("trace-error", `stderr error: ${err.message}`);
    });

    straceProcess.on("close", (code) => {
      console.log(`strace process exited with code ${code}`);
      straceProcess = null;
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.send("trace-stopped", code);
      }
    });

    event.reply("trace-started", `Tracing PID ${pidToTrace}`);
  } catch (err) {
    console.error("Error starting trace:", err);
    event.reply("trace-error", `Error: ${err.message}`);
    straceProcess = null;
  }
});

ipcMain.on("stop-trace", (event) => {
  if (straceProcess) {
    try {
      straceProcess.kill("SIGTERM");
      // Fallback: force kill after 2 seconds
      setTimeout(() => {
        if (straceProcess) {
          straceProcess.kill("SIGKILL");
        }
      }, 2000);
      event.reply("trace-stopping", "Stopping trace...");
    } catch (err) {
      console.error("Error stopping trace:", err);
      event.reply("trace-error", `Error stopping trace: ${err.message}`);
      straceProcess = null;
    }
  } else {
    event.reply("trace-error", "No active trace");
  }
});

// Cleanup on app exit
app.on("before-quit", () => {
  if (straceProcess) {
    try {
      straceProcess.kill("SIGKILL");
    } catch (err) {
      console.error("Error killing strace on app exit:", err);
    }
    straceProcess = null;
  }
});
