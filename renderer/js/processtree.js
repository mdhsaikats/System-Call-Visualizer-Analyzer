// Initialize Lucide Icons
lucide.createIcons();

class ProcessTree {
  constructor() {
    this.flatList = [];
    this.treeData = [];
    this.collapsed = new Set();
    this.selectedPid = null;
    this.searchQuery = "";
    this.currentView = "tree"; // "tree" | "flat"
    this.sortKey = "pid";
    this.sortAsc = true;
    this.updateInterval = 3000;
    this.init();
  }

  async init() {
    this.bindControls();
    await this.loadData();
    this.startAutoRefresh();
  }

  // ─────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────
  startAutoRefresh() {
    setInterval(async () => {
      // Only refresh if we aren't heavily filtering to avoid jarring UX
      if (!this.searchQuery) {
        await this.loadData();
      }
    }, this.updateInterval);
  }

  async loadData() {
    try {
      // Make sure your preload.js exposes window.api.getProcessTree!
      const data = await window.api.getProcessTree();
      this.treeData = data.tree || [];
      this.flatList = data.flat || [];
      this.updateStats(data.stats || {});
      this.render();
    } catch (err) {
      console.error("Error fetching process tree:", err);
    }
  }

  // ─────────────────────────────────────────
  // Stats bar (If you add these IDs to the sidebar)
  // ─────────────────────────────────────────
  updateStats(stats) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? "–";
    };
    set("st-total", stats.total);
    set("st-running", stats.running);
    // Add other IDs as needed...
  }

  // ─────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────
  bindControls() {
    const searchInput = document.getElementById("pt-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    document
      .getElementById("btn-tree")
      ?.addEventListener("click", () => this.setView("tree"));
    document
      .getElementById("btn-flat")
      ?.addEventListener("click", () => this.setView("flat"));
    document
      .getElementById("btn-refresh")
      ?.addEventListener("click", () => this.loadData());

    document.querySelectorAll("[data-sort]").forEach((el) => {
      el.addEventListener("click", () => this.sortBy(el.dataset.sort));
    });
  }

  setView(view) {
    this.currentView = view;
    document
      .getElementById("btn-tree")
      ?.classList.toggle("bg-zinc-800", view === "tree");
    document
      .getElementById("btn-tree")
      ?.classList.toggle("text-white", view === "tree");
    document
      .getElementById("btn-tree")
      ?.classList.toggle("text-zinc-500", view !== "tree");

    document
      .getElementById("btn-flat")
      ?.classList.toggle("bg-zinc-800", view === "flat");
    document
      .getElementById("btn-flat")
      ?.classList.toggle("text-white", view === "flat");
    document
      .getElementById("btn-flat")
      ?.classList.toggle("text-zinc-500", view !== "flat");
    this.render();
  }

  sortBy(key) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    this.render();
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  render() {
    let rows;

    if (this.currentView === "flat" || this.searchQuery) {
      rows = [...this.flatList];
      if (this.searchQuery) {
        rows = rows.filter(
          (p) =>
            p.name.toLowerCase().includes(this.searchQuery) ||
            String(p.pid).includes(this.searchQuery) ||
            (p.user || "").toLowerCase().includes(this.searchQuery),
        );
      }
      rows.sort((a, b) => {
        const va = a[this.sortKey];
        const vb = b[this.sortKey];
        if (typeof va === "number") return this.sortAsc ? va - vb : vb - va;
        return this.sortAsc
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    } else {
      rows = this.walkTree(this.treeData);
    }

    const container = document.getElementById("proc-list");
    if (!container) return;

    container.innerHTML = rows.map((p) => this.renderRow(p)).join("");

    container.querySelectorAll(".proc-row").forEach((el) => {
      el.addEventListener("click", () => {
        const pid = parseInt(el.dataset.pid);
        const proc = this.flatList.find((p) => p.pid === pid);
        this.selectProcess(proc, el);
      });
    });

    container.querySelectorAll(".expand-toggle").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const pid = parseInt(el.dataset.pid);
        if (this.collapsed.has(pid)) this.collapsed.delete(pid);
        else this.collapsed.add(pid);
        this.render();
      });
    });

    // VERY IMPORTANT: Re-run lucide to render any generated icons in the new DOM
    lucide.createIcons();
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

  renderRow(p) {
    const isSelected = p.pid === this.selectedPid;
    const isZombie = (p.state || "").startsWith("Z");
    const depth = p.depth || 0;
    const hasChildren =
      this.currentView === "tree" && !this.searchQuery
        ? p.children && p.children.length > 0
        : false;

    const stateInfo = this.stateStyle(p.state);
    const cpuColor =
      p.cpu > 50 ? "#ef5350" : p.cpu > 20 ? "#ffd54f" : "#69f0ae";

    const toggleHtml = hasChildren
      ? `<span class="expand-toggle" data-pid="${p.pid}" style="cursor:pointer; color:#4fc3f7; font-size:10px; user-select:none;">
           ${this.collapsed.has(p.pid) ? "▶" : "▼"}
         </span>`
      : `<span style="color:#1f2430">·</span>`;

    let indentHtml = "";
    if (this.currentView === "tree" && !this.searchQuery) {
      for (let i = 0; i < depth - 1; i++) {
        indentHtml += `<span style="display:inline-block;width:14px;color:#1f2430;font-size:10px;text-align:center;">│</span>`;
      }
      if (depth > 0) {
        indentHtml += `<span style="display:inline-block;width:14px;color:#1f2430;font-size:10px;text-align:center;">└</span>`;
      }
    }

    let displayName = p.name;
    if (this.searchQuery && p.name.toLowerCase().includes(this.searchQuery)) {
      const idx = p.name.toLowerCase().indexOf(this.searchQuery);
      displayName =
        p.name.slice(0, idx) +
        `<span style="background:rgba(79,195,247,0.25);color:#4fc3f7;border-radius:2px;">${p.name.slice(idx, idx + this.searchQuery.length)}</span>` +
        p.name.slice(idx + this.searchQuery.length);
    }

    const nameColor =
      p.pid <= 2 ? "#4fc3f7" : p.user === "root" ? "#b39ddb" : "#c8cdd8";
    const cpuBarW = Math.min(p.cpu, 100).toFixed(1);

    return `
      <tr class="proc-row hover:bg-zinc-800/40 transition-colors border-b border-white/[0.02] cursor-pointer
                 ${isSelected ? "bg-zinc-800/60" : ""}
                 ${isZombie ? "opacity-50" : ""}"
          data-pid="${p.pid}">
        <td class="px-3 py-2 text-center w-6">${toggleHtml}</td>
        <td class="px-3 py-2 font-mono text-[11px] text-zinc-500 w-16">${p.pid}</td>
        <td class="px-3 py-2 max-w-[220px]">
          <div class="flex items-center overflow-hidden">
            ${indentHtml}
            <span class="font-mono text-[11px] truncate" style="color:${nameColor}">${displayName}</span>
          </div>
        </td>
        <td class="px-3 py-2 w-28">
          <div class="flex items-center gap-1">
            <div class="flex-1 h-[3px] bg-zinc-700 rounded overflow-hidden">
              <div class="h-full rounded transition-all duration-300" style="width:${cpuBarW}%; background:${cpuColor};"></div>
            </div>
            <span class="font-mono text-[10px] w-8 text-right" style="color:${cpuColor}">${p.cpu.toFixed(1)}</span>
          </div>
        </td>
        <td class="px-3 py-2 font-mono text-[11px] text-purple-300 w-16">${p.memory.toFixed(1)}%</td>
        <td class="px-3 py-2 w-20">
          <span class="font-mono text-[10px] font-semibold px-[5px] py-[1px] rounded" style="background:${stateInfo.bg}; color:${stateInfo.fg};">${stateInfo.label}</span>
        </td>
        <td class="px-3 py-2 font-mono text-[11px] text-zinc-500">${p.user || "?"}</td>
      </tr>`;
  }

  stateStyle(state) {
    const s = (state || "?")[0].toUpperCase();
    const map = {
      R: { label: "RUN", bg: "rgba(105,240,174,0.15)", fg: "#69f0ae" },
      S: { label: "SLEEP", bg: "rgba(179,157,219,0.15)", fg: "#b39ddb" },
      D: { label: "WAIT", bg: "rgba(255,213,79,0.15)", fg: "#ffd54f" },
      Z: { label: "ZOMBIE", bg: "rgba(239,83,80,0.2)", fg: "#ef5350" },
      T: { label: "STOP", bg: "rgba(255,138,101,0.15)", fg: "#ff8a65" },
      I: { label: "IDLE", bg: "rgba(74,81,104,0.3)", fg: "#4a5168" },
    };
    return (
      map[s] || {
        label: state || "?",
        bg: "rgba(74,81,104,0.2)",
        fg: "#4a5168",
      }
    );
  }

  selectProcess(proc, el) {
    this.selectedPid = proc ? proc.pid : null;
    document
      .querySelectorAll(".proc-row")
      .forEach((r) => r.classList.remove("bg-zinc-800/60"));
    if (el) el.classList.add("bg-zinc-800/60");

    const sidebar = document.getElementById("pt-sidebar-content");
    if (!sidebar) return;

    if (!proc) {
      sidebar.innerHTML = `<p class="text-zinc-600 font-mono text-[11px] text-center mt-10">Select a process<br>to see details</p>`;
      return;
    }

    const children = this.flatList.filter(
      (p) => p.ppid === proc.pid && p.pid !== proc.pid,
    );
    const stateInfo = this.stateStyle(proc.state);

    sidebar.innerHTML = `
      <div class="mb-4">
        <p class="font-mono text-[10px] text-[#4fc3f7] uppercase tracking-widest mb-2 pb-1 border-b border-zinc-800">Identity</p>
        ${this.detailRow("Name", proc.name)}
        ${this.detailRow("PID", proc.pid)}
        ${this.detailRow("PPID", proc.ppid)}
        ${this.detailRow("User", proc.user || "?")}
      </div>
      <div class="mb-4">
        <p class="font-mono text-[10px] text-[#4fc3f7] uppercase tracking-widest mb-2 pb-1 border-b border-zinc-800">Status</p>
        <div class="flex justify-between mb-1">
          <span class="font-mono text-[10px] text-zinc-500">State</span>
          <span class="font-mono text-[10px] font-semibold px-[5px] py-[1px] rounded" style="background:${stateInfo.bg}; color:${stateInfo.fg};">
            ${stateInfo.label} (${proc.state})
          </span>
        </div>
        ${this.detailRow("CPU%", proc.cpu.toFixed(2) + "%", "#69f0ae")}
        ${this.detailRow("MEM%", proc.memory.toFixed(2) + "%", "#b39ddb")}
        ${this.detailRow("Depth", proc.depth ?? 0)}
      </div>
      ${
        children.length > 0
          ? `
      <div class="mb-4">
        <p class="font-mono text-[10px] text-[#4fc3f7] uppercase tracking-widest mb-2 pb-1 border-b border-zinc-800">Children (${children.length})</p>
        ${children
          .slice(0, 8)
          .map(
            (c) => `
          <div class="flex justify-between py-1 border-b border-zinc-800/60">
            <span class="font-mono text-[10px] text-zinc-300 truncate max-w-[130px]">${c.name}</span>
            <span class="font-mono text-[10px] text-zinc-600">${c.pid}</span>
          </div>`,
          )
          .join("")}
        ${children.length > 8 ? `<p class="font-mono text-[10px] text-zinc-600 mt-1">+${children.length - 8} more</p>` : ""}
      </div>`
          : ""
      }
    `;
    lucide.createIcons();
  }

  detailRow(key, val, color = null) {
    const valStyle = color ? `style="color:${color}"` : "";
    return `
      <div class="flex justify-between mb-1">
        <span class="font-mono text-[10px] text-zinc-500">${key}</span>
        <span class="font-mono text-[10px] text-zinc-300 truncate max-w-[140px] text-right" ${valStyle}>${val}</span>
      </div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ProcessTree();
});
