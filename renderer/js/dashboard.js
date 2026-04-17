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

if (window.api && typeof window.api.onSyscalls === "function") {
  window.api.onSyscalls((value) => {
    sysCallBox.textContent = `${value.toFixed(2)} calls/sec`;
  });
}

// ... keep your existing auth and logout logic above ...

// --- CHART RENDERING LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
  const MAX_DATA_POINTS = 50;
  let chartHistory = [];
  const svgElement = document.querySelector("#chartSvgArea svg");

  function updateChart(ioCount, netCount) {
    if (!svgElement) return;

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

  // --- IPC DATA LISTENER ---
  if (window.api && typeof window.api.onSyscalls === "function") {
    window.api.onSyscalls((data) => {
      // 1. Update the Main Metric Cards (Fixing the object bug)
      if (sysCallBox) sysCallBox.textContent = data.callsPerSec.toString();

      const latencyBox = document.getElementById("latency");
      if (latencyBox) latencyBox.textContent = `${data.latency.toFixed(2)} ms`;

      const avgLatencyBox = document.getElementById("avgLatency");
      if (avgLatencyBox)
        avgLatencyBox.textContent = `${data.avgLatency.toFixed(2)}`;

      const errorRateBox = document.getElementById("errorRate");
      if (errorRateBox)
        errorRateBox.textContent = `${data.errorRate.toFixed(2)}%`;

      // 2. Update the SVG Chart
      if (data.ioCount !== undefined && data.networkCount !== undefined) {
        updateChart(data.ioCount, data.networkCount);
      }
    });
  }
});
