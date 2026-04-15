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
}

// Make it available globally if needed
window.renderSkeleton = renderSkeleton;
