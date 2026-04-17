// Performance Dashboard Handler
class PerformanceDashboard {
  constructor() {
    this.historyData = [];
    this.maxHistoryLength = 60; // Keep 60 seconds of history
    this.updateInterval = 1000; // Update every second
    this.init();
  }

  async init() {
    this.startDataCollection();
    lucide.createIcons();
  }

  startDataCollection() {
    setInterval(async () => {
      try {
        const perfData = await window.api.getPerformanceData();
        this.updateDashboard(perfData);
      } catch (err) {
        console.error("Error fetching performance data:", err);
      }
    }, this.updateInterval);

    // Initial load
    this.collectData();
  }

  async collectData() {
    try {
      const perfData = await window.api.getPerformanceData();
      this.updateDashboard(perfData);
    } catch (err) {
      console.error("Error collecting performance data:", err);
    }
  }

  updateDashboard(perfData) {
    // Add to history for charts
    this.historyData.push({
      timestamp: new Date(),
      cpu: perfData.cpu,
      memory: perfData.memory.percentage,
      diskRead: perfData.disk.read,
      diskWrite: perfData.disk.write,
      networkIn: perfData.network.inbound,
      networkOut: perfData.network.outbound,
    });

    if (this.historyData.length > this.maxHistoryLength) {
      this.historyData.shift();
    }

    // Update metric cards
    this.updateMetricCards(perfData);

    // Update charts
    this.updateResourceChart();
    this.updateLatencyChart(); // This will fetch real data

    // Update top processes
    this.updateTopProcesses(perfData.topProcesses);
  }

  updateMetricCards(perfData) {
    // CPU Utilization
    const cpuElement = document.querySelector("[data-metric='cpu']");
    if (cpuElement) {
      const cpuValue = cpuElement.querySelector("[data-value]");
      const cpuBar = cpuElement.querySelector("[data-bars]");
      if (cpuValue) {
        cpuValue.textContent = perfData.cpu.toFixed(1) + "%";
      }
      if (cpuBar) {
        this.updateMiniBar(cpuBar, perfData.cpu);
      }
    }

    // Memory Usage
    const memElement = document.querySelector("[data-metric='memory']");
    if (memElement) {
      const memValue = memElement.querySelector("[data-value]");
      const memTotal = memElement.querySelector("[data-total]");
      const memUsed = memElement.querySelector("[data-used]");
      const memBar = memElement.querySelector("[data-bar]");

      if (memValue) {
        const memGb = (perfData.memory.used / (1024 * 1024 * 1024)).toFixed(1);
        const totalGb = (perfData.memory.total / (1024 * 1024 * 1024)).toFixed(0);
        memValue.textContent = memGb;
        memTotal.textContent = `/ ${totalGb} GB`;
      }
      if (memUsed) {
        memUsed.textContent = perfData.memory.percentage.toFixed(0) + "%";
      }
      if (memBar) {
        memBar.style.width = perfData.memory.percentage + "%";
      }
    }

    // Disk I/O
    const diskElement = document.querySelector("[data-metric='disk']");
    if (diskElement) {
      const diskRead = diskElement.querySelector("[data-read]");
      const diskWrite = diskElement.querySelector("[data-write]");
      if (diskRead) {
        diskRead.textContent = perfData.disk.read.toFixed(0);
      }
      if (diskWrite) {
        diskWrite.textContent = perfData.disk.write.toFixed(0);
      }
    }

    // Network
    const netElement = document.querySelector("[data-metric='network']");
    if (netElement) {
      const netIn = netElement.querySelector("[data-in]");
      const netOut = netElement.querySelector("[data-out]");
      if (netIn) {
        netIn.textContent = perfData.network.inbound.toFixed(1);
      }
      if (netOut) {
        netOut.textContent = perfData.network.outbound.toFixed(1);
      }
    }
  }

  updateMiniBar(container, percentage) {
    const bars = container.querySelectorAll("div");
    if (bars.length === 0) return;

    bars.forEach((bar, index) => {
      const height = 30 + (index * 10) + Math.random() * 20;
      bar.style.height = Math.min(height, 100) + "%";
    });
  }

  updateResourceChart() {
    const chartContainer = document.getElementById("resourceChartSvg");
    if (!chartContainer || this.historyData.length < 2) return;

    // Create SVG chart
    const width = 600;
    const height = 260;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    let svgContent = `<svg width="${width}" height="${height}" style="overflow: visible;" class="w-full h-full">`;

    // Draw grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight) / 4;
      svgContent += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>`;
    }

    // Draw CPU line (white)
    if (this.historyData.length > 1) {
      svgContent += this.generateChartLine(
        this.historyData,
        (d) => d.cpu,
        100,
        padding,
        chartWidth,
        chartHeight,
        "white"
      );

      // Draw Memory line (dashed)
      svgContent += this.generateChartLine(
        this.historyData,
        (d) => d.memory,
        100,
        padding,
        chartWidth,
        chartHeight,
        "rgba(255,255,255,0.5)",
        true
      );
    }

    svgContent += "</svg>";
    chartContainer.innerHTML = svgContent;
  }

  generateChartLine(data, accessor, maxValue, padding, width, height, color, dashed = false) {
    if (data.length < 2) return "";

    let points = [];
    data.forEach((item, index) => {
      const x = padding + (index / (data.length - 1)) * width;
      const y = padding + height - (accessor(item) / maxValue) * height;
      points.push(`${x},${y}`);
    });

    const strokeDasharray = dashed ? "5,5" : "none";
    return `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${strokeDasharray}"/>`;
  }

  updateLatencyChart() {
    const chartContainer = document.getElementById("latencyChartBody");
    if (!chartContainer) return;

    // Fetch real syscall latency data
    window.api.getSyscallLatencyDistribution().then((distribution) => {
      const syscalls = ["epoll", "read", "write", "futex", "open", "fsync", "mmap"];
      
      let chartHtml = `<div class="w-full h-full flex items-end justify-between px-2 gap-1 pb-2">`;

      // Find the max p50 value for scaling
      let maxLatency = 0;
      for (const syscall of syscalls) {
        if (distribution[syscall] && distribution[syscall].p50 > maxLatency) {
          maxLatency = distribution[syscall].p50;
        }
      }
      
      // Use at least 5ms as the scale
      maxLatency = Math.max(maxLatency, 5);

      for (const syscall of syscalls) {
        const data = distribution[syscall] || { count: 0, p50: 0, p95: 0, p99: 0 };
        const heightPercent = (data.p50 / maxLatency) * 100;
        
        chartHtml += `
          <div class="flex-1 flex flex-col items-center gap-1 group">
            <div class="relative w-full">
              <div class="w-full bg-white hover:bg-zinc-100 rounded-t transition-colors cursor-pointer" 
                   style="height: ${Math.max(heightPercent, 5)}%; min-height: 15px;" 
                   title="p50: ${data.p50.toFixed(2)}ms | p95: ${data.p95.toFixed(2)}ms | p99: ${data.p99.toFixed(2)}ms | Count: ${data.count}">
              </div>
            </div>
            <span class="text-[8px] text-zinc-500 group-hover:text-zinc-300 transition-colors">${syscall}</span>
            <span class="text-[7px] text-zinc-600">${data.p50.toFixed(2)}ms</span>
          </div>
        `;
      }

      chartHtml += "</div>";
      chartContainer.innerHTML = chartHtml;
    }).catch((err) => {
      console.error("Error fetching syscall latency distribution:", err);
    });
  }

  updateTopProcesses(topProcesses) {
    const tableBody = document.getElementById("topCpuTableBody");
    if (!tableBody) return;

    if (!topProcesses || topProcesses.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="3" class="px-4 py-3 text-center text-zinc-500">No process data available</td></tr>';
      return;
    }

    let html = "";
    topProcesses.slice(0, 10).forEach((proc) => {
      const cpuPercent = (proc.cpu || 0).toFixed(1);
      const memPercent = (proc.memory || 0).toFixed(1);

      html += `
        <tr class="hover:bg-zinc-800/40 transition-colors border-b border-white/[0.02]">
          <td class="px-4 py-3 text-zinc-300 truncate max-w-[150px]" title="${proc.name}">
            ${proc.name}
          </td>
          <td class="px-4 py-3 text-zinc-500 text-right">${proc.pid}</td>
          <td class="px-4 py-3 text-right">
            <span class="text-white font-semibold">${cpuPercent}%</span>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  updateFlameGraph() {
    const flameGraphContainer = document.getElementById("flameGraphContainer");
    if (!flameGraphContainer) return;

    // Fetch real stack trace data
    window.api.getStackTraces().then((stackData) => {
      this.renderFlameGraph(flameGraphContainer, stackData);
    }).catch((err) => {
      console.error("Error fetching stack traces:", err);
    });
  }

  renderFlameGraph(container, stackData) {
    let html = "";

    // Root level
    html += `
      <div class="w-full bg-zinc-800 border border-zinc-700/50 hover:border-white/50 hover:bg-zinc-700 transition-colors px-2 py-1 rounded-sm text-center text-zinc-400"
           title="${stackData.root.name} (${stackData.root.percent}%)">
        ${stackData.root.name} (${stackData.root.percent}%)
      </div>
    `;

    // Level 1
    if (stackData.level1 && stackData.level1.length > 0) {
      html += `<div class="w-full flex gap-[1px]">`;
      stackData.level1.forEach((item) => {
        html += `
          <div class="bg-zinc-700 border border-zinc-600/50 hover:border-white/50 hover:bg-zinc-600 transition-colors px-2 py-1 rounded-sm text-zinc-300 truncate text-center"
               style="width: ${item.width}%;" 
               title="${item.name} (${item.percent}%)">
            ${item.name} (${item.percent}%)
          </div>
        `;
      });
      html += `</div>`;
    }

    // Level 2
    if (stackData.level2 && stackData.level2.length > 0) {
      html += `<div class="w-full flex gap-[1px]">`;
      stackData.level2.forEach((item, idx) => {
        const bgColor = item.color === "high" ? "bg-white text-black font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
                       : item.color === "medium" ? "bg-zinc-600 text-zinc-200" 
                       : "bg-zinc-700 text-zinc-400";
        html += `
          <div class="${bgColor} border border-zinc-500/50 hover:border-white/50 transition-colors px-2 py-1 rounded-sm truncate text-center"
               style="width: ${item.width}%; min-width: 40px;" 
               title="${item.name} (${item.percent}%)">
            ${item.name}
          </div>
        `;
      });
      html += `</div>`;
    }

    // Level 3
    if (stackData.level3 && stackData.level3.length > 0) {
      html += `<div class="w-full flex gap-[1px]">`;
      stackData.level3.forEach((item) => {
        const bgColor = item.color === "high" ? "bg-zinc-600 text-zinc-200" 
                       : item.color === "medium" ? "bg-zinc-700 text-zinc-400" 
                       : "bg-zinc-800 text-zinc-500";
        html += `
          <div class="${bgColor} border border-zinc-600/50 hover:border-white/50 transition-colors px-2 py-1 rounded-sm text-zinc-400 truncate text-center"
               style="width: ${item.width}%; min-width: 35px;" 
               title="${item.name} (${item.percent}%)">
            ${item.name}
          </div>
        `;
      });
      html += `</div>`;
    }

    // Reset the container to flex-col-reverse layout and populate
    container.innerHTML = html;
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new PerformanceDashboard();
  
  // Update flame graph every 3 seconds
  setInterval(() => {
    dashboard.updateFlameGraph();
  }, 3000);
  
  // Initial flame graph load
  setTimeout(() => {
    dashboard.updateFlameGraph();
  }, 500);
});
