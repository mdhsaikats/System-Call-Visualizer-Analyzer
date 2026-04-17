// Initialize Lucide Icons
lucide.createIcons();

import { logout, observeAuth, auth } from "./auth.js";

// Hide main content until auth is checked
document.body.style.visibility = "hidden";

const loadingOverlay = document.getElementById("loadingOverlay");
const emailBox = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");
const sysCallBox = document.getElementById("syscalls");

// Show loading initially
if (loadingOverlay) loadingOverlay.style.display = "flex";

/**
 * 🔐 AUTH STATE LISTENER (MAIN)
 * Handles login/logout UI updates
 */
observeAuth((user) => {
  // If NOT logged in → redirect to login page
  if (!user) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    document.body.style.visibility = "visible";

    if (emailBox) emailBox.textContent = "No Email..";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);

    return;
  }

  // ✅ USER IS LOGGED IN
  if (loadingOverlay) loadingOverlay.style.display = "none";
  document.body.style.visibility = "visible";

  if (emailBox) {
    emailBox.textContent = user.email; // show logged-in email
  }
});

/**
 * 🚪 LOGOUT HANDLER
 */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logout();
      console.log("Logged out successfully");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}

// Unified and safe onSyscalls listener
if (window.api && typeof window.api.onSyscalls === "function") {
  window.api.onSyscalls((data) => {
    console.log("[onSyscalls] data received:", data);
    // Defensive: handle both number and object payloads
    let callsPerSec = 0;
    if (typeof data === "number") {
      callsPerSec = data;
    } else if (data && typeof data.callsPerSec === "number") {
      callsPerSec = data.callsPerSec;
    }
    if (sysCallBox)
      sysCallBox.textContent = `${Number(callsPerSec).toFixed(2)} calls/sec`;

    const latencyBox = document.getElementById("latency");
    const avgLatencyBox = document.getElementById("avgLatency");
    const errorRateBox = document.getElementById("errorRate");

    if (latencyBox) {
      const latency =
        data && typeof data.latency === "number" ? data.latency : 0;
      latencyBox.textContent = `${latency.toFixed(2)} ms`;
    }
    if (avgLatencyBox) {
      const avgLatency =
        data && typeof data.avgLatency === "number" ? data.avgLatency : 0;
      avgLatencyBox.textContent = `${avgLatency.toFixed(2)}`;
    }
    if (errorRateBox) {
      const errorRate =
        data && typeof data.errorRate === "number" ? data.errorRate : 0;
      errorRateBox.textContent = `${errorRate.toFixed(2)}%`;
    }

    // 2. Update the SVG Chart
    if (
      data &&
      typeof data.ioCount === "number" &&
      typeof data.networkCount === "number"
    ) {
      updateChart(data.ioCount, data.networkCount);
    }
  });
}

// ... keep your existing auth and logout logic above ...

// --- CHART RENDERING LOGIC ---

// --- CHART RENDERING LOGIC ---
const MAX_DATA_POINTS = 50;
let chartHistory = [];
const svgElement = document.querySelector("#chartSvgArea svg");

function updateChart(ioCount, netCount) {
  console.log("[updateChart] called with:", { ioCount, netCount });
  if (!svgElement) {
    console.warn("[updateChart] svgElement not found!");
    return;
  }

  chartHistory.push({ io: ioCount, net: netCount });
  if (chartHistory.length > MAX_DATA_POINTS) {
    chartHistory.shift();
  }

  // Auto-scale the Y-axis based on the highest recent value
  const maxVal = Math.max(...chartHistory.flatMap((p) => [p.io, p.net]), 100);
  const Y_SCALE = maxVal * 1.2; // Add 20% padding at the top of the chart

  let ioPathD = "";
  let netPathD = "";

  chartHistory.forEach((point, index) => {
    const x = (index / (MAX_DATA_POINTS - 1)) * 100;
    const ioY = 100 - (point.io / Y_SCALE) * 100;
    const netY = 100 - (point.net / Y_SCALE) * 100;

    if (index === 0) {
      ioPathD += `M ${x},${ioY} `;
      netPathD += `M ${x},${netY} `;
    } else {
      ioPathD += `L ${x},${ioY} `;
      netPathD += `L ${x},${netY} `;
    }
  });

  // Inject the dynamically generated paths
  svgElement.innerHTML = `
    <path 
      d="${ioPathD}" 
      fill="none" 
      stroke="#71717a" 
      stroke-width="1.5" 
      stroke-dasharray="4 2" 
      vector-effect="non-scaling-stroke"
    />
    
    <path 
      d="${netPathD}" 
      fill="none" 
      stroke="#ffffff" 
      stroke-width="2" 
      class="drop-shadow-md"
      vector-effect="non-scaling-stroke"
    />
  `;
}

// (Removed duplicate onSyscalls listener)
