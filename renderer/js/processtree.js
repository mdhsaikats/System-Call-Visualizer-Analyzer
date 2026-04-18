class ProcessTreeApp {
  constructor() {
    this.flatList = [];
    this.treeData = [];
    this.collapsed = new Set();
    this.selectedPid = null;
    this.searchQuery = "";
    this.currentView = "tree"; // "tree" | "flat"

    // Bind DOM Elements
    this.elements = {
      container: document.getElementById("processTreeBody"),
      searchInput: document.querySelector('input[placeholder^="Find process"]'),
      btnTree: document
        .querySelector('button i[data-lucide="list-tree"]')
        .closest("button"),
      btnFlat: document
        .querySelector('button i[data-lucide="list"]')
        .closest("button"),
      btnRefresh: document
        .querySelector('button i[data-lucide="refresh-cw"]')
        .closest("button"),
      inspectorPanel: document.querySelector(".w-\\[380px\\]"), // Targets the right-side inspector
      statsTotal: document.querySelector(
        ".p-4.border-t .flex:nth-child(1) .font-mono",
      ),
      statsThreads: document.querySelector(
        ".p-4.border-t .flex:nth-child(2) .font-mono",
      ),
    };

    this.init();
  }

  async init() {
    lucide.createIcons();
    this.bindEvents();
    await this.fetchData();

    // Auto-refresh every 3 seconds if not actively searching
    setInterval(() => {
      if (!this.searchQuery) this.fetchData();
    }, 3000);
  }

  bindEvents() {
    // Search
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderList();
      });
    }

    // View Toggles
    if (this.elements.btnTree) {
      this.elements.btnTree.addEventListener("click", () => {
        this.currentView = "tree";
        this.updateViewButtons();
        this.renderList();
      });
    }
    if (this.elements.btnFlat) {
      this.elements.btnFlat.addEventListener("click", () => {
        this.currentView = "flat";
        this.updateViewButtons();
        this.renderList();
      });
    }

    // Refresh
    if (this.elements.btnRefresh) {
      this.elements.btnRefresh.addEventListener("click", () =>
        this.fetchData(),
      );
    }
  }

  updateViewButtons() {
    const activeClasses = ["bg-zinc-800", "text-white", "shadow-sm"];
    const inactiveClasses = ["text-zinc-500"];

    if (this.currentView === "tree") {
      this.elements.btnTree.classList.add(...activeClasses);
      this.elements.btnTree.classList.remove(...inactiveClasses);
      this.elements.btnFlat.classList.remove(...activeClasses);
      this.elements.btnFlat.classList.add(...inactiveClasses);
    } else {
      this.elements.btnFlat.classList.add(...activeClasses);
      this.elements.btnFlat.classList.remove(...inactiveClasses);
      this.elements.btnTree.classList.remove(...activeClasses);
      this.elements.btnTree.classList.add(...inactiveClasses);
    }
  }

  async fetchData() {
    try {
      // Assumes preload.js exposes window.api.getProcessTree()
      const data = await window.api.getProcessTree();
      this.treeData = data.tree || [];
      this.flatList = data.flat || [];

      // Update sidebar stats
      if (this.elements.statsTotal)
        this.elements.statsTotal.textContent =
          data.stats.total.toLocaleString();
      if (this.elements.statsThreads)
        this.elements.statsThreads.textContent =
          data.stats.threads.toLocaleString();

      this.renderList();
    } catch (err) {
      console.error("Failed to load process data:", err);
    }
  }

  renderList() {
    if (!this.elements.container) return;

    let rowsToRender = [];

    if (this.currentView === "flat" || this.searchQuery) {
      rowsToRender = [...this.flatList];
      if (this.searchQuery) {
        rowsToRender = rowsToRender.filter(
          (p) =>
            p.name.toLowerCase().includes(this.searchQuery) ||
            String(p.pid).includes(this.searchQuery),
        );
      }
    } else {
      rowsToRender = this.walkTree(this.treeData);
    }

    // Build the exact HTML layout matching your design
    this.elements.container.innerHTML = rowsToRender
      .map((p) => this.generateRowHTML(p))
      .join("");

    // Re-initialize icons in the newly created DOM elements
    lucide.createIcons();

    // Attach row events
    this.elements.container.querySelectorAll(".proc-row").forEach((row) => {
      row.addEventListener("click", () => {
        const pid = parseInt(row.dataset.pid);
        const proc = this.flatList.find((p) => p.pid === pid);
        this.selectProcess(proc, row);
      });
    });

    // Attach expand/collapse events
    this.elements.container
      .querySelectorAll(".expand-toggle")
      .forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          e.stopPropagation(); // Don't trigger row selection
          const pid = parseInt(toggle.dataset.pid);
          if (this.collapsed.has(pid)) this.collapsed.delete(pid);
          else this.collapsed.add(pid);
          this.renderList();
        });
      });
  }

  walkTree(nodes, depth = 0) {
    const result = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (
        node.children &&
        node.children.length > 0 &&
        !this.collapsed.has(node.pid)
      ) {
        result.push(...this.walkTree(node.children, depth + 1));
      }
    }
    return result;
  }

  generateRowHTML(p) {
    const isSelected = p.pid === this.selectedPid;
    const depth = p.depth || 0;
    const hasChildren =
      this.currentView === "tree" &&
      !this.searchQuery &&
      p.children &&
      p.children.length > 0;

    // Formatting logic
    const stateColor = p.state.startsWith("R")
      ? "#69f0ae"
      : p.state.startsWith("S")
        ? "#b39ddb"
        : "#c8cdd8";
    const cpuColor =
      p.cpu > 50 ? "#ef5350" : p.cpu > 20 ? "#ffd54f" : "#69f0ae";

    // Indentation and toggles
    let indentHtml = "";
    if (this.currentView === "tree" && !this.searchQuery) {
      for (let i = 0; i < depth; i++) {
        indentHtml += `<span style="display:inline-block; width:16px;"></span>`;
      }
    }

    const toggleHtml = hasChildren
      ? `<span class="expand-toggle cursor-pointer flex items-center justify-center w-4 h-4 hover:text-white" data-pid="${p.pid}">
           <i data-lucide="${this.collapsed.has(p.pid) ? "chevron-right" : "chevron-down"}" class="w-3 h-3 text-[#4fc3f7]"></i>
         </span>`
      : `<span class="w-4 h-4 inline-block"></span>`;

    // Highlight search matches
    let displayName = p.name;
    if (this.searchQuery && p.name.toLowerCase().includes(this.searchQuery)) {
      const regex = new RegExp(`(${this.searchQuery})`, "gi");
      displayName = p.name.replace(
        regex,
        `<span class="bg-[#4fc3f7]/20 text-[#4fc3f7] rounded px-0.5">$1</span>`,
      );
    }

    // Returning the exact <div> structure requested in your design
    return `
      <div class="proc-row flex items-center px-4 py-2 text-xs border-b border-white/[0.02] cursor-pointer transition-colors hover:bg-zinc-800/40 ${isSelected ? "bg-zinc-800/60" : ""}" data-pid="${p.pid}">
        <div class="w-[45%] pl-2 flex items-center gap-2 overflow-hidden truncate">
          ${indentHtml}
          ${toggleHtml}
          <i data-lucide="terminal" class="w-3.5 h-3.5 text-zinc-500 shrink-0"></i>
          <span class="text-zinc-200 font-mono truncate" title="${p.name}">${displayName}</span>
        </div>
        <div class="w-[15%] text-right pr-4 font-mono text-zinc-500">${p.pid}</div>
        <div class="w-[10%] text-right pr-4 font-mono text-zinc-400">${p.user}</div>
        <div class="w-[10%] text-right pr-4 font-mono" style="color:${cpuColor}">${p.cpu.toFixed(1)}</div>
        <div class="w-[10%] text-right pr-4 font-mono text-purple-300">${p.memory.toFixed(1)}</div>
        <div class="w-[10%] text-right font-mono" style="color:${stateColor}">${p.state}</div>
      </div>
    `;
  }

  selectProcess(proc, rowElement) {
    this.selectedPid = proc ? proc.pid : null;

    // Highlight styling
    document
      .querySelectorAll(".proc-row")
      .forEach((r) => r.classList.remove("bg-zinc-800/60"));
    if (rowElement) rowElement.classList.add("bg-zinc-800/60");

    if (!this.elements.inspectorPanel) return;

    if (!proc) {
      this.elements.inspectorPanel.innerHTML = `
        <div class="flex-1 overflow-y-auto p-5 flex items-center justify-center h-full">
          <p class="text-zinc-600 font-mono text-[11px] text-center mt-10">Select a process<br>to see details</p>
        </div>`;
      return;
    }

    // Determine state labels
    let stateLabel = "Running";
    if (proc.state.startsWith("S")) stateLabel = "Sleeping";
    else if (proc.state.startsWith("Z")) stateLabel = "Zombie";
    else if (proc.state.startsWith("T")) stateLabel = "Stopped";

    // Rebuild the entire inspector panel with dynamic data
    this.elements.inspectorPanel.innerHTML = `
      <div class="p-5 border-b border-white/[0.04] bg-zinc-900/30">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-bold text-white tracking-tight truncate max-w-[200px]">${proc.name}</h2>
              <span class="bg-zinc-200 text-black px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shadow-sm">${stateLabel}</span>
            </div>
            <p class="text-xs font-mono text-zinc-500">
              PID: <span class="text-zinc-300">${proc.pid}</span> • PPID: <span class="text-zinc-400 hover:text-white cursor-pointer transition-colors">${proc.ppid}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 transition-colors border border-white/5 shadow-sm">
            <i data-lucide="crosshair" class="w-3.5 h-3.5"></i> Trace
          </button>
          <button class="flex-none px-3 py-1.5 rounded bg-[#ef5350]/10 text-[#ef5350] border border-[#ef5350]/20 text-xs font-bold hover:bg-[#ef5350]/20 transition-colors">
            Kill
          </button>
        </div>
      </div>

      <div class="flex px-2 pt-2 border-b border-white/[0.04] bg-zinc-900/50">
        <button class="px-4 py-2 text-xs font-medium text-white border-b-2 border-white">Overview</button>
      </div>

      <div class="flex-1 overflow-y-auto p-5 space-y-6">
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-zinc-900/50 border border-white/[0.04] rounded-lg p-3">
            <span class="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">CPU Usage</span>
            <div class="mt-1 flex items-end gap-2">
              <span class="text-xl font-bold text-white tracking-tight">${proc.cpu.toFixed(1)}%</span>
            </div>
          </div>
          <div class="bg-zinc-900/50 border border-white/[0.04] rounded-lg p-3">
            <span class="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Memory</span>
            <div class="mt-1 flex items-end gap-2">
              <span class="text-xl font-bold text-white tracking-tight">${proc.memory.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Process Details</h3>
          <div class="space-y-3 font-mono text-xs">
            <div class="flex justify-between border-b border-white/[0.02] pb-2">
              <span class="text-zinc-500">User</span><span class="text-zinc-200">${proc.user}</span>
            </div>
            <div class="flex justify-between border-b border-white/[0.02] pb-2">
              <span class="text-zinc-500">Group</span><span class="text-zinc-200">${proc.group}</span>
            </div>
            <div class="flex justify-between border-b border-white/[0.02] pb-2">
              <span class="text-zinc-500">Priority (Nice)</span><span class="text-zinc-200">${proc.nice}</span>
            </div>
            <div class="flex justify-between border-b border-white/[0.02] pb-2">
              <span class="text-zinc-500">Threads</span><span class="text-zinc-200">${proc.threads}</span>
            </div>
            <div class="flex justify-between border-b border-white/[0.02] pb-2">
              <span class="text-zinc-500">Uptime</span><span class="text-zinc-200">${proc.uptime}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Command Line</h3>
          <div class="bg-zinc-950/50 rounded-lg border border-white/[0.05] p-3 font-mono text-[11px] text-zinc-300 break-all leading-relaxed shadow-inner">
            ${proc.args}
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ProcessTreeApp();
});
