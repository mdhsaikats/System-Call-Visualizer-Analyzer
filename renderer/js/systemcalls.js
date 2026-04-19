document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  lucide.createIcons();

  const startBtn = document.getElementById("startSimBtn");
  const stopBtn = document.getElementById("stopSimBtn");
  const pauseBtn = document.getElementById("pauseTraceBtn");
  const tableBody = document.getElementById("syscallsTableBody");
  
  let isTracing = false;
  let isPaused = false;
  let rowCount = 0;
  const MAX_ROWS = 200; // Prevent DOM lag

  // --- Start / Stop Logic ---
  
  startBtn.addEventListener("click", () => {
    if (isTracing) return;
    // Clear dummy loading data on first start
    if (rowCount === 0) tableBody.innerHTML = ''; 
    
    // Call the Electron API to start strace (traces own process by default)
    window.electronAPI.startTrace();
    isTracing = true;
    startBtn.classList.replace("bg-emerald-600", "bg-zinc-600");
  });

  stopBtn.addEventListener("click", () => {
    if (!isTracing) return;
    window.electronAPI.stopTrace();
    isTracing = false;
    startBtn.classList.replace("bg-zinc-600", "bg-emerald-600");
  });

  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.innerHTML = isPaused 
      ? `<i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Resume Trace`
      : `<i data-lucide="pause" class="w-3.5 h-3.5 fill-current"></i> Pause Trace`;
    lucide.createIcons();
  });

  // --- Real-time Data Handling ---
  
  window.electronAPI.onSyscallData((data) => {
    if (isPaused) return;

    // Create a new row
    const tr = document.createElement("tr");
    tr.className = "hover:bg-zinc-800/30 cursor-pointer transition-colors border-b border-white/[0.02]";
    
    // Attach the raw data to the row for the Inspector view
    tr.dataset.raw = JSON.stringify(data);

    tr.innerHTML = `
      <td class="px-4 py-2.5 text-zinc-400">${data.timestamp}</td>
      <td class="px-4 py-2.5 text-zinc-500">${data.cpu}</td>
      <td class="px-4 py-2.5 text-zinc-300">${data.pid}</td>
      <td class="px-4 py-2.5 text-emerald-400 font-semibold">${data.syscall}</td>
      <td class="px-4 py-2.5 text-zinc-400 truncate max-w-xs" title="${data.args}">${data.args}</td>
      <td class="px-4 py-2.5 text-right ${data.returnValue.includes('-') ? 'text-red-400' : 'text-zinc-300'}">${data.returnValue}</td>
      <td class="px-4 py-2.5 text-right text-zinc-500">${data.latency}</td>
    `;

    // Click event to open the bottom Inspector
    tr.addEventListener("click", () => updateInspector(data));

    // Prepend to top of table
    tableBody.insertBefore(tr, tableBody.firstChild);
    rowCount++;

    // Prune old rows to maintain performance
    if (rowCount > MAX_ROWS) {
      tableBody.removeChild(tableBody.lastChild);
      rowCount--;
    }
  });

  window.electronAPI.onTraceStopped(() => {
    isTracing = false;
    startBtn.classList.replace("bg-zinc-600", "bg-emerald-600");
  });

  // --- Inspector UI Update ---
  
  function updateInspector(data) {
    // 1. Update Header
    document.querySelector(".h-10 .font-mono.text-zinc-300").textContent = data.syscall;

    // 2. Update Execution Context (Left Column)
    const contextHtml = `
      <div class="flex flex-col gap-1">
        <span class="text-zinc-500">Timestamp</span>
        <span class="text-zinc-200">${data.timestamp}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-zinc-500">Process</span>
        <div class="flex items-center gap-2">
          <span class="text-zinc-200">node</span>
          <span class="text-zinc-500">PID: ${data.pid}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-zinc-500">Execution Time</span>
        <span class="text-white">${data.latency}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-zinc-500">Return State</span>
        <span class="${data.returnValue.includes('-') ? 'text-red-400' : 'text-zinc-200'}">${data.returnValue}</span>
      </div>
    `;
    document.querySelectorAll(".flex-1.flex.overflow-hidden .w-1\\/3")[0].querySelector(".space-y-3").innerHTML = contextHtml;

    // 3. Update Parsed Arguments (Middle Column)
    // Roughly splitting args by comma for the UI representation
    const argsArray = data.args.split(',').map(arg => arg.trim());
    let argsHtml = '';
    argsArray.forEach((arg, index) => {
      argsHtml += `
        <div class="flex mb-1.5">
          <span class="text-zinc-500 w-16 shrink-0">arg${index}:</span>
          <span class="${arg === 'NULL' ? 'text-zinc-500 italic' : 'text-zinc-200 break-all'}">${arg}</span>
        </div>
      `;
    });
    
    document.querySelectorAll(".flex-1.flex.overflow-hidden .w-1\\/3")[1].querySelector(".bg-zinc-950\\/50").innerHTML = argsHtml;
  }
});