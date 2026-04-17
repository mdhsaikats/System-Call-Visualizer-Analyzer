// scaliton.js
function renderSkeleton() {
  const syscalls = document.getElementById("syscalls");
  if (syscalls) syscalls.innerHTML = `<div class="h-8 bg-zinc-700/50 rounded w-24 animate-pulse"></div>`;
  
  const avgLatency = document.getElementById("avgLatency");
  if (avgLatency) avgLatency.innerHTML = `<div class="h-8 bg-zinc-700/50 rounded w-20 animate-pulse inline-block"></div>`;
  
  const latency = document.getElementById("latency");
  if (latency) latency.innerHTML = `<div class="h-4 bg-zinc-700/50 rounded w-12 animate-pulse inline-block mt-1"></div>`;
  
  const errorRate = document.getElementById("errorRate");
  if (errorRate) errorRate.innerHTML = `<div class="h-8 bg-zinc-700/50 rounded w-16 animate-pulse inline-block"></div>`;
  
  const list = document.getElementById("topProcesses");
  if (list) {
    list.innerHTML = "";
    for(let i=0; i<3; i++) {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between";
        li.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
            <div class="h-4 bg-zinc-700/50 rounded w-16 animate-pulse"></div>
        </div>
        <div class="h-4 bg-zinc-700/50 rounded w-8 animate-pulse"></div>
        `;
        list.appendChild(li);
    }
  }

  const tableBody = document.getElementById("recentSyscallsBlock");
  if (tableBody) {
    tableBody.innerHTML = "";
    for(let i=0; i<5; i++) {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-zinc-800/30 transition-colors group";
        tr.innerHTML = `
            <td class="px-5 py-3.5"><div class="h-3 bg-zinc-700/50 rounded w-16 animate-pulse"></div></td>
            <td class="px-5 py-3.5 flex items-center gap-2">
                <div class="h-4 bg-zinc-700/50 rounded w-8 animate-pulse"></div>
                <div class="h-3 bg-zinc-700/50 rounded w-12 animate-pulse"></div>
            </td>
            <td class="px-5 py-3.5"><div class="h-5 bg-zinc-700/50 rounded w-20 animate-pulse"></div></td>
            <td class="px-5 py-3.5"><div class="h-3 bg-zinc-700/50 rounded w-48 animate-pulse"></div></td>
            <td class="px-5 py-3.5"><div class="flex flex-col items-end gap-1">
                <div class="h-3 bg-zinc-700/50 rounded w-8 animate-pulse"></div>
                <div class="h-2 bg-zinc-700/50 rounded w-12 animate-pulse"></div>
            </div></td>
        `;
        tableBody.appendChild(tr);
    }
  }

  // Anomalies List Skeleton
  const alertsList = document.getElementById("alertsList");
  if (alertsList) {
    alertsList.innerHTML = "";
    for(let i=0; i<3; i++) {
        const div = document.createElement("div");
        div.className = "p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50 flex gap-3";
        div.innerHTML = `
            <div class="mt-0.5"><div class="w-4 h-4 bg-zinc-700/50 rounded animate-pulse"></div></div>
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <div class="h-3 bg-zinc-700/50 rounded w-24 animate-pulse"></div>
                    <div class="h-2 bg-zinc-700/50 rounded w-12 animate-pulse"></div>
                </div>
                <div class="h-3 bg-zinc-700/50 rounded w-full animate-pulse mt-1"></div>
            </div>
        `;
        alertsList.appendChild(div);
    }
  }

  // Chart Svg Area Skeleton
  const chartSvgArea = document.getElementById("chartSvgArea");
  if (chartSvgArea) {
    chartSvgArea.innerHTML = `<div class="absolute inset-0 flex items-center justify-center pt-2 pl-2"><div class="w-full h-full bg-zinc-800/20 rounded animate-pulse border border-white/[0.02]"></div></div>`;
  }
}

// Make it available globally if needed
window.renderSkeleton = renderSkeleton;
